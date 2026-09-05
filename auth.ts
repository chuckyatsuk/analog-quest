import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from 'pg';

// Shared Postgres pool for the auth adapter. Uses the same connection string
// as the rest of the app (lib/db.ts).
const pool = new Pool({
  connectionString:
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // GitHub silently began sending an RFC 9207 `iss` parameter on OAuth
      // callbacks (April 2026 rollout); next-auth <= 5.0.0-beta.31 without a
      // configured issuer validates it against the "https://authjs.dev"
      // placeholder and rejects every sign-in. Value per the upstream fix
      // (nextauthjs/next-auth#13410); drop this when upgrading past beta.30.
      issuer: 'https://github.com/login/oauth',
    }),
  ],
  session: {
    strategy: 'database', // session state lives in our Postgres `sessions` table
  },
  callbacks: {
    // signIn: just return true to allow the sign-in. We do NOT try to write
    // to contributors here because the users row may not exist yet (NextAuth
    // creates it after signIn returns true). The contributor upsert happens
    // in the session callback instead, which only fires once the user exists.
    async signIn() {
      return true;
    },

    // session: runs after user is confirmed to exist in the database.
    // We upsert the contributors row here (safe because users.id exists by now)
    // and attach role + githubLogin to the session for server components.
    async session({ session, user }) {
      if (!user?.id) return session;

      const client = await pool.connect();
      try {
        // Look up the linked GitHub account to get the GitHub profile data
        const { rows: accountRows } = await client.query<{
          providerAccountId: string;
        }>(
          `SELECT "providerAccountId" FROM accounts WHERE "userId" = $1 AND provider = 'github' LIMIT 1`,
          [user.id]
        );

        // Upsert contributor row. On first session after sign-up, this creates
        // the row. On subsequent sessions, it refreshes github_login, avatar,
        // and last_seen_at.
        const githubId = accountRows[0]?.providerAccountId
          ? parseInt(accountRows[0].providerAccountId, 10)
          : null;

        // Derive github_login from the user's name or email (NextAuth stores
        // the GitHub profile name in users.name). For more reliable data we'd
        // need to store it during account linking, but this is good enough.
        const githubLogin = user.name ?? user.email?.split('@')[0] ?? `user_${user.id}`;
        const avatarUrl = (user as any).image ?? null;

        await client.query(
          `
          INSERT INTO contributors (user_id, github_id, github_login, avatar_url, last_seen_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            github_login = COALESCE(EXCLUDED.github_login, contributors.github_login),
            avatar_url = COALESCE(EXCLUDED.avatar_url, contributors.avatar_url),
            last_seen_at = NOW()
          `,
          [user.id, githubId, githubLogin, avatarUrl]
        );

        // Now read back the role for the session
        const { rows } = await client.query<{
          role: string;
          github_login: string;
        }>(
          'SELECT role, github_login FROM contributors WHERE user_id = $1',
          [user.id]
        );
        if (rows[0]) {
          (session as any).user = {
            ...session.user,
            id: user.id,
            role: rows[0].role,
            githubLogin: rows[0].github_login,
          };
        } else {
          (session as any).user = {
            ...session.user,
            id: user.id,
            role: 'contributor',
            githubLogin,
          };
        }
      } catch (err) {
        // If contributor upsert fails (e.g. schema mismatch), don't break
        // the session entirely — just attach basic info
        (session as any).user = {
          ...session.user,
          id: user.id,
          role: 'contributor',
          githubLogin: user.name ?? '',
        };
        console.error('[auth] contributor upsert failed:', err);
      } finally {
        client.release();
      }

      return session;
    },
  },
});
