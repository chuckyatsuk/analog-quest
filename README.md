# Analog Quest

A research tool that finds cases where different scientific fields are solving
the exact same equation under different names.

**[analog.quest](https://analog.quest)** · [contribute](https://analog.quest/contribute) · [discoveries](https://analog.quest/discoveries) · [moderation policy](https://analog.quest/moderation)

---

## What it does

Analog Quest downloads arXiv LaTeX source, extracts every equation, parses them
into canonical SymPy form, and matches structural equivalents across scientific
domains. Matches are labeled by tier:

- **Tier 1 — syntactic:** the pipeline's default output. Two equations from
  different domains normalize to the same canonical form. A candidate, not a
  discovery.
- **Tier 2 — structural:** a moderator has confirmed the shared form reflects
  the same mathematical structure in both source contexts.
- **Tier 3 — transferable:** a moderator has argued theory or methods could
  plausibly transfer between the two domains.
- **Tier 4 — validated:** a domain expert has confirmed the match as a
  substantive cross-domain hypothesis. Currently empty.

Every match shows its hash frequency — how many equations, papers, and domains
contain the same canonical form across the corpus. Low frequency suggests a
rare structural rhyme. High frequency suggests a textbook object. Moderators
rejecting matches as "standard canonical object" add the canonical form to a
trivia list, and future matches on the same form are never generated.

Full policy: [analog.quest/moderation](https://analog.quest/moderation).

---

## Two contribution modes

Analog Quest runs as much as possible on volunteer compute. The idea is that
idle Claude Code subscriptions are a real resource, and pointing them at a
research project is a higher-value use than throwaway side projects.

**Mode A — Pipeline.** Your agent downloads arXiv source, extracts equations,
normalizes them via SymPy, and submits the results. Needs Python + sympy +
antlr4-python3-runtime installed locally. Best for people who want to move
the bulk of the work forward on their own compute.

**Mode B — Abstract reader.** Your agent reads paper abstracts, identifies
the mathematical structure, and submits a structural classification. Pure
Claude Code — no local setup. Best for papers where LaTeX extraction fails.

Both modes require a GitHub account (used for attribution and rate-limiting).
See [/contribute](https://analog.quest/contribute) to sign in, generate a
bearer token, and paste a copy-to-agent message into any Claude Code session.

---

## Architecture

**Frontend:** Next.js 15 + TypeScript on Vercel. Radically minimal design
(white background, black text, system font). Pages: `/` (home + activity feed),
`/discoveries` (verified + Tier 1 candidates), `/contribute` (sign-in + mode
selector), `/c/[username]` (contributor profiles), `/admin/review` (moderator
triage UI), `/admin/moderators` (admin invite management), `/moderation`
(public policy).

**Backend:** Same Next.js process, API routes under `/api/`. Auth via
NextAuth v5 with GitHub provider, sessions stored in Postgres. Rate limiting
via Upstash Redis (sliding window, per-user or per-IP).

**Database:** PostgreSQL on Neon with pgvector extension. Key tables: `papers`,
`equations`, `equation_matches`, `isomorphisms` (agent consensus tier),
`contributors`, `moderator_invites`, `moderation_log`, `trivial_hashes`.
Schema files live in `database/`.

**Pipeline:** Python 3.9+ scripts under `scripts/`. The normalizer
(`scripts/pipeline/normalize.py`) handles LaTeX preprocessing for conventions
SymPy doesn't understand natively: `\leftarrow`, transpose operators,
parenthesized time indices, gradient subscripts, font macros, Laplacian
notation. Test suite at `scripts/tests/test_normalize.py`.

**Scaling model:** the pipeline is designed to run on volunteer machines via
Mode A. The project admin does not need to run continuous batch jobs on their
own hardware — the whole point of the architecture is that compute scales
with contributors.

---

## Running locally

```bash
git clone https://github.com/chuckyatsuk/analog-quest
cd analog-quest
npm install
```

Create `.env.local` with:

```
POSTGRES_URL=<your neon connection string>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -hex 32>
GITHUB_CLIENT_ID=<github oauth app client id, dev>
GITHUB_CLIENT_SECRET=<github oauth app client secret, dev>
UPSTASH_REDIS_REST_URL=<upstash redis rest url>
UPSTASH_REDIS_REST_TOKEN=<upstash redis rest token>
```

Apply schemas:

```bash
pip install -r scripts/requirements.txt
python3 scripts/run_schema.py              # apply database/schema.sql
# then apply database/equations_schema.sql and
# database/auth_and_moderation_schema.sql manually via psql or neon console
```

Run the dev server:

```bash
npm run dev
```

Run the pipeline:

```bash
python3 scripts/seed_queue.py              # fetch papers from arxiv
python3 scripts/run_pipeline.py --skip-embed   # extract + match
python3 scripts/renormalize.py             # re-normalize after normalize.py changes
python3 scripts/tests/test_normalize.py    # preprocessor unit tests
```

---

## API reference

All write endpoints require a GitHub-authenticated NextAuth session or an
`Authorization: Bearer <token>` header with a CLI token from `/api/cli-tokens`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/queue/next` | user | Mode B: check out a paper |
| POST | `/api/queue/submit` | user | Mode B: submit an extraction |
| GET | `/api/queue/status` | public | Public stats |
| GET | `/api/pipeline/next-batch` | user | Mode A: fetch a batch of papers |
| POST | `/api/pipeline/submit-extractions` | user | Mode A: submit extracted equations |
| GET | `/api/discoveries` | public | Verified isomorphisms (agent consensus) |
| GET | `/api/matches` | public | Tier 1 candidates (pipeline output) with hash frequency |
| GET | `/api/activity` | public | Recent activity feed |
| POST | `/api/cli-tokens` | user | Generate a CLI bearer token |
| GET/DELETE | `/api/cli-tokens`, `/api/cli-tokens/[id]` | user | List / revoke CLI tokens |
| GET | `/api/admin/matches/next` | moderator | Fetch next pending candidate |
| POST | `/api/admin/matches/[id]` | moderator | Promote or reject a candidate |
| GET/POST | `/api/admin/invites` | admin | Moderator invite management |
| POST | `/api/admin/invites/redeem` | user | Redeem a moderator invite |
| GET | `/api/health` | public | Database health |

Full per-field documentation in the two skill files:
[analog-quest.SKILL.md](https://analog.quest/analog-quest.SKILL.md) (Mode B)
and
[analog-quest-pipeline.SKILL.md](https://analog.quest/analog-quest-pipeline.SKILL.md) (Mode A).

---

## Rigor commitments

Analog Quest is not a scientific authority. It's an engine that surfaces
candidates. The things we commit to doing:

- **Label everything honestly.** Tier 1 is the default and most matches will
  stay there. Promotions require a written moderator note that becomes part
  of the public record.
- **Publish the failure modes.** [HANDOFF.md](./HANDOFF.md) documents what's
  broken, what we've tried that didn't work, and what a new contributor or
  agent would need to know to strengthen the approach.
  [docs/ROADMAP.md](./docs/ROADMAP.md) is the ceiling-removal plan: what
  structural limitations the project has, in priority order, and what
  work removes each one.
- **Audit trail over trust.** Every moderator action writes to
  `moderation_log` with moderator, timestamp, action, and reason. Any action
  can be reversed by another moderator. The admin can revoke moderator roles.
- **Openly acknowledge what the pipeline doesn't catch.** The current
  canonicalizer misses custom macros, some tensor conventions, and any
  notation SymPy can't parse. Real cross-domain matches will be missed for
  notational reasons that have nothing to do with their content.

The failure mode we're most worried about is surfacing common textbook
objects and calling them discoveries. The trivia-list system is the current
defense against that. [moderation policy](https://analog.quest/moderation)
describes the full mechanism.

---

## License

MIT. See [LICENSE](./LICENSE).
