# Analog Quest

A research tool that maps cases where different scientific fields are using
the same mathematical structure under different names.

**[analog.quest](https://analog.quest)** · [the atlas](https://analog.quest/atlas) · [contribute](https://analog.quest/contribute) · [moderation policy](https://analog.quest/moderation)

---

## What it does

Analog Quest classifies each paper's **core mathematical model** against a
library of ~50 canonical structures (the logistic equation, Kuramoto
oscillators, the Fokker–Planck equation, …). When papers from different
fields land on the same structure, that's a **cross-field bridge** — the same
mathematics wearing two vocabularies — and it surfaces in the public
[atlas](https://analog.quest/atlas).

Classification is done by AI agents reading the paper in isolation;
judgment about whether a bridge is *interesting* stays human. Bridges over
textbook objects everyone already shares (gradient descent, Nash equilibria)
can be flagged as trivia by moderators and hidden from the atlas — a
non-destructive, logged, reversible action. Candidate findings are labeled
by tier, and the tiers mean what they say:

- **Tier 1 — candidate:** the system's default output. Same canonical
  structure, different fields. A candidate, not a discovery.
- **Tier 2 — structural:** a moderator has confirmed the shared structure is
  real in both source contexts, with a written note.
- **Tier 3 — transferable:** a moderator has argued theory or methods could
  plausibly transfer between the fields.
- **Tier 4 — validated:** a domain expert has confirmed the connection as a
  substantive cross-domain hypothesis. Currently empty.

Full policy: [analog.quest/moderation](https://analog.quest/moderation).

## How we know the substrate works (and what failed first)

This project pre-registers criteria before running experiments and reports
failures as failures. The atlas architecture is the third substrate tried,
and the first to pass:

1. **Exact-hash equation matching** (the first-generation pipeline, below)
   was diagnosed as structurally blind to its own target: cross-domain
   isomorphisms are by definition the same structure in *different*
   notation, and exact hashing only finds identical notation.
2. **Pairwise LLM structural fingerprints** were measured twice against a
   planted gold standard of 12 known cross-domain isomorphisms. The
   pre-registered criterion (recall@25 ≥ 0.5) **failed both times**
   (0.42, twice). Full analyses:
   [v1](scripts/experiments/fingerprint/results/ANALYSIS-2026-07-05.md),
   [v2](scripts/experiments/fingerprint/results/ANALYSIS-v2-2026-07-05.md).
3. **Atlas classification** (each paper against fixed canonical templates,
   in isolation) **passed** its pre-registered criteria: 0.93 classification
   recall, 14/15 known isomorphisms recovered via the atlas join
   (9/15 under the strict pre-equivalence reading — both numbers reported),
   0.93 distractor precision, holding at 0.90 recall on a much cheaper
   model. Analyses:
   [atlas](scripts/experiments/atlas/results/ANALYSIS-2026-07-05.md),
   [model A/B](scripts/experiments/atlas/results/HAIKU-AB-2026-07-05.md).

The validation used a 54-paper gold standard; corpus-scale precision is a
weaker, still-open question, which is why moderation is load-bearing.

## Contributing compute

Analog Quest runs as much as possible on volunteer compute: idle AI-agent
subscriptions (e.g. Claude Code) pointed at a research project. The current
contribution mode is the **atlas classifier** —
[analog-quest-atlas.SKILL.md](https://analog.quest/analog-quest-atlas.SKILL.md):
your agent pulls unclassified papers and the template library, classifies
each paper's core model (0–2 templates; "no fit" is valid and common), and
submits. Stateless, incremental, every paper is permanent progress. Requires
GitHub sign-in at [/contribute](https://analog.quest/contribute) for
attribution and rate limiting.

Two earlier contribution modes (Mode A: local SymPy extraction; Mode B:
abstract reading into a consensus queue) belong to the first-generation
substrate and are kept for the record, not actively promoted.

## The first-generation substrate (superseded, kept honestly)

The original pipeline downloads arXiv LaTeX, extracts every equation,
normalizes each into canonical SymPy form, and matches on exact hash
equality. It processed 1,800+ papers into 39k equations (53.4% parse rate)
and produced 2 cross-domain Tier 1 candidates — which is the measurement
that motivated the pivot: the interesting matches are precisely the ones
written in different notation, which exact hashing cannot see. The
extraction corpus remains useful data; the matcher is no longer the
project's spine. The old `/discoveries` view redirects to `/atlas`. The
diagnosis and history live in [HANDOFF.md](./HANDOFF.md) and
[docs/ROADMAP.md](./docs/ROADMAP.md).

---

## Architecture

**Frontend:** Next.js 15 + TypeScript on Vercel. Radically minimal design
(white background, black text, system font). Pages: `/` (home + activity
feed), `/atlas` (the structure map: templates, fields, papers, bridges),
`/contribute` (sign-in + contribution flow), `/c/[username]` (contributor
profiles), `/admin/review` + `/admin/atlas` (moderator tools),
`/admin/moderators` (invite management), `/moderation` (public policy).

**Backend:** Same Next.js process, API routes under `/api/`. Auth via
NextAuth v5 with GitHub provider, sessions stored in Postgres. Rate limiting
via Upstash Redis (sliding window, per-user or per-IP).

**Database:** PostgreSQL on Neon (via Vercel) with pgvector. Atlas tables:
`atlas_templates`, `atlas_equivalences`, `atlas_classifications`,
`atlas_trivia_templates`. First-generation tables: `papers`, `equations`,
`equation_matches`, `isomorphisms`. Moderation/auth: `contributors`,
`moderator_invites`, `moderation_log`, `trivial_hashes`. Schema files in
`database/`.

**Pipeline (legacy):** Python 3.9+ scripts under `scripts/`, SymPy-based
LaTeX normalization with a 47-test suite. `scripts/experiments/` holds the
fingerprint and atlas experiments with their gold standards and analyses.

---

## Running locally

```bash
git clone https://github.com/chuckyatsuk/analog-quest
cd analog-quest
npm install
```

Create `.env.local` with:

```
POSTGRES_URL=<your neon/postgres connection string>
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
python3 scripts/run_schema.py                        # database/schema.sql
python3 scripts/run_schema.py atlas_schema.sql       # atlas tables
# also apply database/equations_schema.sql and
# database/auth_and_moderation_schema.sql via psql or the console
python3 scripts/seed_atlas_templates.py              # 50 templates + equivalences
```

Run the dev server:

```bash
npm run dev
```

Legacy pipeline commands:

```bash
python3 scripts/seed_queue.py                  # fetch papers from arxiv
python3 scripts/run_pipeline.py --skip-embed   # extract + match
python3 scripts/tests/test_normalize.py        # preprocessor unit tests
```

---

## API reference

All write endpoints require a GitHub-authenticated NextAuth session or an
`Authorization: Bearer <token>` header with a CLI token from `/api/cli-tokens`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/atlas` | public | The atlas: structure groups, fields, papers, bridges |
| GET | `/api/atlas/next-batch` | user | Unclassified papers + template library |
| POST | `/api/atlas/classify` | user | Submit classifications |
| GET/POST | `/api/admin/atlas` | moderator | Review groups; flag/restore trivia |
| GET | `/api/queue/status` | public | Public stats |
| GET | `/api/activity` | public | Recent activity feed |
| POST | `/api/cli-tokens` | user | Generate a CLI bearer token |
| GET/DELETE | `/api/cli-tokens`, `/api/cli-tokens/[id]` | user | List / revoke CLI tokens |
| GET/POST | `/api/admin/invites` | admin | Moderator invite management |
| POST | `/api/admin/invites/redeem` | user | Redeem a moderator invite |
| GET | `/api/health` | public | Database health |
| GET | `/api/queue/next`, POST `/api/queue/submit` | user | Legacy Mode B |
| GET | `/api/pipeline/next-batch`, POST `/api/pipeline/submit-extractions` | user | Legacy Mode A |
| GET | `/api/discoveries`, `/api/matches` | public | Legacy exact-hash views |
| GET/POST | `/api/admin/matches/*` | moderator | Legacy match moderation |

---

## Rigor commitments

Analog Quest is not a scientific authority. It's an engine that surfaces
candidates. The things we commit to doing:

- **Label everything honestly.** Tier 1 is the default and most bridges will
  stay there. Promotions require a written moderator note that becomes part
  of the public record.
- **Pre-register, then report — pass or fail.** Experimental criteria are
  fixed before the run. Two of this project's three substrates failed their
  criteria; the analyses are linked above and stay published.
- **Publish the failure modes.** [HANDOFF.md](./HANDOFF.md) documents what's
  broken, what we tried that didn't work, and what a new contributor or
  agent needs to know. [docs/ROADMAP.md](./docs/ROADMAP.md) is the
  ceiling-removal plan.
- **Audit trail over trust.** Every moderator action writes to
  `moderation_log` with moderator, timestamp, action, and reason. Any action
  can be reversed by another moderator. The admin can revoke moderator roles.
- **Openly acknowledge the known failure mode.** By construction, the atlas
  finds instances of *known* canonical structures, and it will happily
  surface textbook objects two fields trivially share. The trivia flag is
  the defense, and it requires active human moderation. Genuinely *novel*
  shared structures — ones not in the template library — are beyond the
  current system's reach and would need the pairwise path documented in the
  fingerprint analyses.

---

## License

MIT. See [LICENSE](./LICENSE).
