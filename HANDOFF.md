# Analog Quest — Handoff

**Last substantive update:** 2026-04-12 (bulk of doc below)
**Most recent session:** 2026-09-06 — sign-in fixed (GitHub RFC 9207 iss), admin role granted, account rename aligned. Previous: 2026-09-05 revival dive — full state
verification, `docs/STATE-2026.md` + `docs/FUTURES-2026.md` written,
weekly operating cadence begins. Read that session log first, then the
2026-07-05 log (the atlas pivot), if you're picking up the project next.
**Repo:** https://github.com/chuckyatsuk/analog-quest
**Live site:** https://analog.quest
**Stack:** Next.js 15 + TypeScript, PostgreSQL (Neon) + pgvector, Vercel,
Python pipeline (SymPy), NextAuth v5 with GitHub OAuth, Upstash Redis for
rate limiting.

---

## Session log — 2026-09-05/06 (sign-in fixed, admin unblocked, rename)

Follow-on from the revival dive, working live with the owner.

- **GitHub sign-in was broken in prod and is now fixed.** Root cause was
  external: GitHub silently began sending an RFC 9207 `iss` parameter on
  OAuth callbacks in April 2026 (community discussion #192143 — no
  changelog); next-auth 5.0.0-beta.30 validates it against its
  "https://authjs.dev" placeholder and rejected every sign-in with
  `CallbackRouteError: unexpected "iss" (issuer) response parameter
  value`. Diagnosed from Vercel runtime logs + a local callback replay
  (with/without `iss` — only with-iss failed). Fix mirrors upstream
  (nextauthjs/next-auth#13410): `issuer: 'https://github.com/login/oauth'`
  on the GitHub provider (commit 2357b17). Owner verified sign-in
  end-to-end. **Debt: upgrade next-auth past beta.30 in a normal cycle,
  then drop the workaround.** Note: GitHub paused this rollout mid-April
  and will resume it — unpatched apps on old next-auth will break then.
  (A false trail worth recording: the OAuth client secret was suspected
  first because `vercel env pull` returns sensitive-flagged values as the
  literal "[SENSITIVE]" — never credential-test a pulled value without
  checking its shape. The secret was fine; it was regenerated anyway and
  the new one is in Vercel.)
- **Admin promotion DONE (2026-09-06):** owner ran
  `UPDATE contributors SET role='admin' WHERE github_id = 8813135` —
  role verified admin. Moderation is unblocked for the first time ever.
  (The SQL targets github_id because github_login stores the display
  name, not the login.)
- **GitHub account renamed** currentlycurrently → chuckyatsuk. All repo
  references updated (d65d71e); numeric id 8813135 is the stable key, so
  app auth records, OAuth, and the Vercel deploy hook all survived —
  deploy hook verified by this session's pushes.
- **Later on 2026-09-06 (same working session):** the queue/status fix
  and the README realignment were owner-reviewed and SHIPPED (17dc2fd) —
  `/api/queue/status` verified 200 in prod; README now leads with the
  atlas and links the failed experiments as first-class content. A full
  connected-services audit was done: 7 services (Vercel Pro, Neon via
  Vercel Marketplace, Upstash under its own login email@analog.quest,
  GitHub, Namecheap, Cloudflare DNS, and **Migadu** — newly discovered
  email host for analog.quest, which owns the Upstash login mailbox);
  all recorded in the owner's MESS ledger. Vercel env vars were
  sensitive-flagged per Vercel's prompts — **`vercel env pull` is now
  destructive** (returns "[SENSITIVE]" placeholders; the working
  credentials live only in the local `.env.local`). Local checkout moved
  to `~/Dev/chuckyatsuk-gh/analog-quest`.
- Still open: future pick from docs/FUTURES-2026.md; GENESIS placement;
  classification budget approval; first moderation pass (flag
  gradient_descent etc. as trivia) — now possible and not yet done.

---

## Session log — 2026-09-05 (revival: dive phase, state + futures memos)

The project was picked back up after exactly two months quiet, under a
charter from the owner: weekly operating cycles, lead agent runs cadence,
owner is admin/moderator and tie-breaker. This session was the dive phase.

**What was verified (everything re-checked, not inherited):**
- Live site healthy; `/atlas` serving the 60-paper pilot; `/discoveries`
  307→`/atlas` is the intentional redirect, not a bug.
- **`/api/queue/status` 500s — root cause found:** the route queries
  `contributors.last_seen` but the live table has `last_seen_at`
  (auth schema superseded the old one). One-line fix, awaiting owner
  review before deploy.
- Prod DB surveyed read-only: 1,830 papers / 39,054 equations (53.4%
  parse — exactly as documented) / 63 atlas classifications, all from
  2026-07-05 / **moderation_log, trivia lists, trivial_hashes all empty —
  no moderation pass has ever run** / the single contributor row has role
  `contributor`: **the admin promotion was never done, so nobody can
  moderate**. cli_tokens: 0 — the volunteer thesis remains untested.
- Prod env is complete (NextAuth + GitHub OAuth vars set) — the April
  "auth may not work in prod" note below is stale. Sign-in itself not
  browser-tested this session.
- Fresh clone: `npm run build` clean; all 47 pipeline tests pass.
- **Atlas experiment numbers reproduce**: re-ran `evaluate.py` on the
  committed artifacts → 0.93 / 9-15 strict / 14-15 equiv / C3 pass,
  identical to the analysis file. Note: the *committed*
  `atlas/results/report.md` holds the Haiku A/B output (0.90/13-15), not
  the Fable run — regenerate or label it when next touched.
- **Landscape re-checked on the web (2026-09-05): the four-part niche is
  still unoccupied.** Romiti dormant (repo last commit 2026-05-15, still
  physics-only); Discovery Engine still v1, absent from AII's own July
  2026 newsletter. New since July: IsoSci (arXiv:2607.01431), a
  cross-domain isomorphism *benchmark* — adjacent and supportive, not
  competitive; cite it in any write-up. Details in the landscape section
  of `docs/STATE-2026.md`.

**What was written:**
- `docs/STATE-2026.md` — the verified state of the project (deliverable 1).
- `docs/FUTURES-2026.md` — four futures with costs and 90-day shapes
  (deliverable 2). Recommendation: operate the atlas (A), then publish
  the flag-planting write-up (B); recruitment (C) after B; substrate
  research (D) deferred with the model-generation tripwire kept. Includes
  the chartered SymPy-pipeline recommendation: honestly-labeled legacy
  extraction layer.
- `docs/GENESIS.draft.md` — draft origin-story section, owner decides
  whether/where it lands.

**Not done, deliberately:** no prod writes (read-only grant), no deploys
(owner reviews site changes first), no classification runs (cost approval
first), no README rewrite yet (bundled for owner review with the
queue/status fix as cycle-1 items).

**For the first weekly session, in order:** (1) owner picks a future from
the memo; (2) the 5-minute admin unblock — sign in at analog.quest, run
`UPDATE contributors SET role='admin' WHERE github_login='<owner login>';`,
sign out/in; (3) review+approve the queue/status one-liner and the README
realignment; (4) decide the classification write path (a CLI token
through the app's own API is the designed one) and approve the backlog
classification budget (Haiku-class, single-digit dollars for 1,770
papers, per-batch spot-checks with a pre-registered precision criterion).

---

## Session log — 2026-07-05 (strategic review + substrate pivot experiment)

The admin returned after ~10 weeks asking a strategic question: is there
another angle that could make this project produce meaningful results?
The session produced a diagnosis, a prior-art landscape, and a measured
first experiment on a new matching substrate. Read this before touching
the normalizer or matcher again.

**Diagnosis (agreed with admin):** the exact-hash matcher is structurally
blind to its own target — cross-domain isomorphisms are by definition the
same structure in *different* notation, and exact hashing only finds
identical notation. See docs/ROADMAP.md Item 2, which already conceded
this. The proposed replacement substrate: LLM structural fingerprints of
each paper's *core model* (notation-independent JSON schema), matched on
structure, with LLM pairwise verification feeding the existing human
moderation layer. The 2024-era "no LLM calls" constraint that shaped the
SymPy pipeline is obsolete — fingerprinting costs fractions of a cent per
paper.

**What happened this session:**

1. **Prior-art landscape archived** at docs/LANDSCAPE.md (AI deep-research
   scan + verification appendix). Headline: the four-part combination
   (model-level extraction + cross-discipline matching at scale + tiered
   human review + published catalog) is unoccupied as of mid-2026. Two
   2025 preprints circle pieces of it; both were read and verified this
   session — both effectively dormant. One scan claim was refuted
   (arXiv:2507.00964 is a name collision, not a Discovery Engine
   follow-up). Cite Romiti (2508.05724) and The Discovery Engine
   (2505.17500) in any public write-up.
2. **Gold-standard recall experiment built and run** at
   scripts/experiments/fingerprint/ (self-contained; imports extract.py
   read-only; never touches the DB). 12 canonical cross-domain
   isomorphisms as planted paper pairs + 23 distractors, fingerprinted in
   isolation, matched on an interpretable no-ML score.
3. **Results** (results/report.md + results/ANALYSIS-2026-07-05.md):
   pre-registered criterion recall@25 ≥ 0.5 **NOT met** (5/12 = 0.42),
   but median planted rank 57/966 vs ~484 random, with 5 known
   isomorphisms in the top 7 of 966 — including Black–Scholes↔heat and
   Kuramoto↔power-grid, which the exact-hash substrate could never find.
   The misses are diagnosed (single-view fingerprints split pairs that
   dress the same skeleton differently; categorical agreement terms hurt)
   and a concrete v2 is specified in the analysis file.

**V2 was run the same day (2026-07-05, admin approved).** Changes:
multi-view fingerprints (deterministic_skeleton), features-carry-the-score
matching, one ground-truth correction, 3 held-out pairs curated by a
vocabulary-blind agent. **Result: criterion NOT met again — recall@25 =
5/12 = 0.42, identical to v1.** Full diagnosis in
results/ANALYSIS-v2-2026-07-05.md. Key facts: canonical-adjacent pairs
match near-perfectly (optimal-transport↔matching #1 and held-out
sine-Gordon↔Josephson #2, both score 1.000 — the held-out hit validates
against vocabulary bias); but as a top-25 matcher the substrate plateaus,
while as a candidate *blocker* it reaches 11/12 recall in the top 23% of
the ranking. The persistent misses (ising_hopfield above all) are largely
a gold-standard realization problem: research papers are twists on
canonical models, and pairwise paper matching must see through two layers
of variation at once.

**Path B was then measured the same day (admin approved) and it WORKED.**
scripts/experiments/atlas/ classifies each paper against a library of 50
canonical structures (in isolation) instead of matching papers pairwise.
Pre-registered results (atlas/results/ANALYSIS-2026-07-05.md):
  - C1 classification recall: **0.93** (28/30) — PASS
  - C2 atlas join: 9/15 strict / **14/15 equivalence-class** — the 5
    strict misses were correct classifications into split-but-equivalent
    templates (e.g. black_scholes_pde vs heat_diffusion_equation), fixed
    by a post-hoc template-equivalence graph; only 1 pair (logistic
    adoption) was a true error.
  - C3 distractor precision: **0.93** (14/15) — PASS
The pairs pairwise matching buried deepest (ising_hopfield rank 548,
fokker_planck 265) the atlas joins cleanly, because each paper only has
to resemble a fixed template, not a differently-twisted partner. **Path B
is the recommended spine.** Path A (pairwise LLM verification) is deferred
to the novel-analogy tail.

**What the next agent should do, in order:**
1. Path B is chosen. Do NOT re-run fingerprint pairwise matching as a
   primary matcher — it plateaued twice at 0.42 and the atlas supersedes
   it. The remaining go/no-go input is cheap: **A/B the atlas
   classification on a Haiku-class model** (all runs so far used Fable 5;
   the cost model assumes a small model). If recall/precision hold,
   corpus-scale cost is cents per 1000 papers.
2. Build the template-equivalence graph properly (atlas/template_equivalences.json
   is a start) — it is the atlas taxonomy backbone.
3. Corpus pilot: classify ~2,000 real corpus papers, publish the atlas
   ("structure X appears in fields A,B,C, here are the papers"), route
   cross-domain joins through the existing moderation UI. First shippable
   artifact.
2. Whichever path is chosen: A/B fingerprint quality on a Haiku-class
   model before any corpus-scale run (the cost model assumes a small
   model; all measurements so far used Fable 5).
3. If the admin parks the project instead: the re-entry tripwire is to
   re-run scripts/experiments/fingerprint/ unchanged with the
   then-current model — if recall@25 clears 0.5 with no engineering,
   capabilities have caught up; revive.
4. The operational items from the 2026-04 session log below (admin
   moderation pass, corpus breadth, second moderator, first catalog
   entry) are still open and still the project's real bottleneck if the
   substrate graduates.

**Uncommitted at session end:** docs/LANDSCAPE.md, HANDOFF.md edits,
docs/ROADMAP.md edit, scripts/experiments/fingerprint/* (including
generated data/, fingerprints/, results/). The admin decides what to
commit; data/bundles contains ~7MB of extracted paper content that could
reasonably be gitignored while committing the code, ground truth, and
results.

---

## Session log — 2026-04-24/25 (pause handover)

The admin returned to the project after ~10 days and worked with an agent
on Roadmap Item 1 (canonicalizer parse rate, specifically macro expansion).
Hit a wall, documented honestly, parked the work. The admin is pausing
again and does not know when they'll return. A future agent should read
this section to understand what was attempted and why more engineering
work is not the obvious next move.

**What shipped to main this session:**
  - `scripts/pipeline/macros.py` — custom macro collection + expansion
    (`\newcommand`, `\def`, `\DeclareMathOperator`, `\let`) with 31
    passing unit tests. **Gated behind `ANALOG_QUEST_EXPAND_MACROS` env
    var, default off.** See the Session log note below for why.
  - `scripts/tests/test_macros.py` — 31 tests for the above.
  - `scripts/measure_macro_impact.py` — before/after corpus measurement
    tool. Pulls N random papers, runs OLD vs NEW extractor path, reports
    parse/HQ/garbage deltas. Useful for future normalizer experiments.
  - `scripts/diagnose_regressions.py` — per-paper regression diagnostic.
  - Conservative normalizer improvements (independent of expansion, kept
    on main): `\mathfrak` and `\mathscr` added to font-macro strip,
    `\underline{}` decorator strip, nested `_{_{...}}` and `_{{X}}`
    subscript collapse, time-index regex given a `(?<![A-Za-z])` guard
    (fixed a latent bug where `\mathbf{x}^{(t+1)}` would token-merge to
    `\mathbfx_{t+1}` — was previously masked).
  - `docs/ROADMAP.md` Item 1 updated with the honest measured finding.

**What was measured and why the flag is default-off:**
  - Roadmap predicted +10–15 pp parse-rate gain from macro expansion.
  - Measured on 30 random arXiv papers (~6,600 equations): **−1.09 pp
    parse rate, −0.36 pp high-quality rate, roughly flat garbage rate.**
  - Root cause: SymPy's LaTeX parser has weak points the OLD pipeline's
    "unknown token = single symbol" fallback was accidentally routing
    around. Expansion exposes them rather than bypassing:
    `\mathrm{d}` in `\frac{}` numerators, `\mathrm{Tr}` becoming flat
    symbol products, `\left<...\right>` becoming bare `<...>` SymPy
    rejects, `\mathfrak{sl}` becoming `sl` parsed as `s*l`.
  - ~90 minutes were spent iterating normalizer fixes to compensate
    (brace-grouping font strip, bra-ket `<...>` → `(...)` conversion).
    All unit tests passed but real-corpus measurement got *worse* each
    iteration (v2 −0.48pp → v3 −0.70pp → v4 −1.09pp). Those risky
    normalizer changes were reverted before committing.

**The bigger lesson for the next agent (important):**

The session was an optimization exercise — "remove the ceiling the roadmap
named" — but the roadmap item itself turned out to be a hypothesis, not
a fact. No one had measured macro-expansion impact before. Future
normalizer/extractor work must come with a real-corpus measurement
before shipping. `measure_macro_impact.py` is the template.

Second-order lesson: **parse rate is a proxy, not the goal.** The project
exists to surface real cross-domain isomorphisms. Optimizing for
parse-rate percentage points is several layers removed from that. A
future agent staring at this handoff should ask "does this change make
the project more likely to surface a real match?" before opening the
normalizer. The admin made this point explicitly at the end of the
session.

**What the agent thinks the project actually needs next (not
engineering):**

  1. **A moderation pass by the admin** — currently 0 Tier 2+ matches
     exist because no one has ever promoted one, not because the
     pipeline has failed. The 2-sphere match needs to be rejected as
     `standard_canonical_object` to bootstrap the trivia list.
     Operational task, cannot be done by an agent.
  2. **Grow the corpus breadth.** 1,770 papers, mostly physics, won't
     produce cross-domain matches. `seed_queue.py` is self-service.
     10,000 papers across 5+ genuinely distinct domains is where
     hash-frequency signal becomes meaningful.
  3. **Find one person to be a second moderator.** Item 4 in the
     roadmap. The project's credibility rests on this and nothing has
     moved on it. The hard part is social, not technical.
  4. **Produce one publishable catalog entry.** Before 30, one. The
     moment one moderator-verified match exists with a credible
     write-up, the project transitions from "interesting idea" to
     "thing with evidence." Roadmap Item 5.

Normalizer improvements (Roadmap Item 1) and algorithmic improvements
(Item 2) matter eventually, but without progress on items 3–5 they're
polishing an engine that has nowhere to go.

**Landscape note** (updated 2026-07-05; original 2026-04 note superseded):
The "day of targeted search before further investment" happened. A full
prior-art scan is archived at [docs/LANDSCAPE.md](./docs/LANDSCAPE.md) —
read it before making any novelty claims. Short version: the project's
four-part combination (notation-independent model extraction +
cross-discipline matching at arXiv scale + tiered human review +
published catalog) is unoccupied as of mid-2026, but two 2025 preprints
(Romiti arXiv:2508.05724, The Discovery Engine arXiv:2505.17500) are
circling parts of it and must be cited in any public write-up. The
durable differentiation is the delivered human-reviewed catalog, not
the matching engine. The window is open but closing.

**State of the repo at handover:**
  - Committed on main: everything listed above.
  - Live site: unchanged, still running the pre-session code paths
    (macro expansion is off by default). Nothing needs deploying.
  - DB state: unchanged — no re-extraction was run against the
    corpus. Existing 39k equations still reflect the pre-session
    extractor.
  - Tests: 47 passing (16 normalize + 31 macros).
  - The operational steps in "What the admin still needs to do" below
    are still unchecked. Those remain the most important unblocked
    work regardless of any engineering.

---

## Atlas system — end-to-end runbook (2026-07-05)

The atlas is now a live feature, not just an experiment. The site's primary
product is `/atlas` (the old `/discoveries` exact-hash view redirects there).
Full flow, all built and build-verified:

**Data model** (`database/atlas_schema.sql`): `atlas_templates` (50 canonical
structures), `atlas_equivalences` (collapses split-but-equivalent templates
into one group), `atlas_classifications` (one row per paper→template
assignment; NULL template = "no fit" sentinel), `atlas_trivia_templates`
(moderator-hidden groups).

**Deploy steps (admin, one-time):**
1. Apply `database/atlas_schema.sql` to Neon.
2. `python3 scripts/seed_atlas_templates.py` — seeds the 50 templates +
   equivalence groups from `scripts/experiments/atlas/templates.json`.
3. (optional) load the 60-paper pilot classifications for an immediately
   non-empty atlas — the loader used in the 2026-07-05 session is inline in
   that session's shell history; or just start classifying fresh.
4. Deploy the branch. `/atlas` renders live from `/api/atlas`.

**Growing the atlas (the "chip away" loop):**
- A contributor runs the `public/analog-quest-atlas.SKILL.md` skill in a
  Claude Code session (GitHub sign-in or CLI token).
- The session pulls unclassified papers + the template library from
  `GET /api/atlas/next-batch`, classifies each paper's core model against the
  library (0–2 templates, "no fit" is valid), and submits to
  `POST /api/atlas/classify`. Stateless and incremental — every paper is
  permanent progress. No API key needed (classification is the agent's own
  reasoning), which is the "crowdsource idle Claude Code compute" thesis.
- Corpus growth (more papers to classify) is still `scripts/seed_queue.py`.
  Note the measured arXiv source-availability rate is only ~15–25% in some
  windows; expanding to OpenAlex is the documented future unlock (ROADMAP
  Item 3) but should wait until the atlas earns traction.

**Moderation:** `GET/POST /api/admin/atlas` (moderator/admin). GET returns
structure groups ranked by breadth (generic-object trivia candidates first).
POST with `{group_key, action:'trivia'|'restore'}` hides/unhides a whole group
from the public atlas — the textbook-object defense the external reviewer
asked for, verified working (flagging `gradient_descent` drops the bridge
count and restore brings it back). Non-destructive; classifications are never
deleted.

**Validation status:** classification recall 0.93, cross-field join 14/15,
distractor precision 0.93, holds on Haiku 4.5 (0.90). 60-paper real pilot
surfaced 7 cross-field bridges — genuine ones (master eq: cond-mat↔neuro; SIR:
physics↔bio) mixed with textbook objects (gradient descent) the trivia filter
is built to catch. See `scripts/experiments/atlas/results/`.

---

## Read this before doing anything

If you're a new lead agent picking up this project, this document is the
single source of truth for what is *actually* true. The README is the story
the project tells the public. This is the story the project tells itself.

Two things to understand before you touch anything:

1. **The architecture is sound, the output is thin.** The pipeline works,
   the frontend is clean, the moderation and auth layers are wired. At the
   time of this writing, the whole system has surfaced exactly 2 Tier 1
   candidates on a 39k-equation corpus. One of them is a textbook object
   (the 2-sphere metric) that a reviewer immediately recognized as not
   interesting. That's the current state and it's the right state — we are
   not trying to hide how sparse real findings are.

2. **This project has repeatedly failed in a specific way: overselling the
   output of a technically-working pipeline.** The previous agent (Claude
   Opus 4.6, 1M context, the one writing this file) made exactly this
   mistake twice in one session — once with a SGD-vs-HJB match that turned
   out to be a parser artifact, and once with the 2-sphere metric which is
   technically a real match but a textbook object. Both times a human
   reader immediately punctured the framing. If you catch yourself typing
   "this is the best match the pipeline has produced" — stop, check
   against the frequency data and ask whether a random mathematician would
   find it surprising, and default to under-claiming.

---

## Current state

**Corpus:** 1,770 papers (39,054 equations), mostly recent arXiv submissions
across physics/cond-mat, math, cs.LG, q-bio, econ, q-fin, and several
subcategories. Corpus growth is now self-service via
`scripts/seed_queue.py` — the category list has been debugged and covers
all the previously-broken subcategories.

**Pipeline parse rate:** 53.4% of equations normalize to canonical SymPy
form. The rest fail because of unsupported notation (custom macros,
tensor conventions, operators SymPy doesn't know). The degenerate-parse
filter and tautology filter together reject another ~1,300 equations that
previously produced false-positive matches.

**Current matches:** 2 Tier 1 candidates visible on `/discoveries`.

1. **Functional decomposition** (cs ↔ physics). ML loss `L(θ) = λ_d L_d(θ) +
   λ_pi L_pi(θ)` matches density functional `Φ(ρ) = Φ_ex(ρ) + Φ_id(ρ)`. Real
   structural form, but the "weighted sum of sub-functionals" pattern is
   universal enough that this is probably Tier 1 forever.
2. **Round metric on the 2-sphere** (math ↔ physics). Textbook geometric
   object that appears anywhere spherical symmetry shows up. Reviewer
   flagged it as "valid match, weak candidate, not something you'd ever
   want featured." Admin should reject it with reason
   `standard_canonical_object` when they next sign in, which will add its
   hash to the trivia list and prevent it (or any equivalent) from
   surfacing again.

**Live site status:** deployed on Vercel, reading from Neon. Public read
paths work (`/`, `/discoveries`, `/contribute`). Auth flow is wired but
**may not work in production yet** because the Vercel prod env vars for
NextAuth and GitHub OAuth have not been added at the time of this writing.
See "What the admin still needs to do" below.

**Admin:** The project's real-world admin is `chuckyatsuk` (GitHub id 8813135; renamed from currentlycurrently 2026-09) on
GitHub. The `contributors.role = 'admin'` flag must be set manually via SQL
after their first sign-in. Once set, they gain access to `/admin/review`
and `/admin/moderators`.

**Verified isomorphisms (agent consensus):** 0. No volunteer has ever run
Mode B yet. The isomorphisms table is empty by design, not by failure.

---

## What the admin still needs to do

These are operational tasks, not coding tasks. They can't be done by an
agent, only by the human with Vercel/Neon/GitHub access.

1. **Create a production GitHub OAuth app** at
   https://github.com/settings/developers (separate from the dev app, with
   callback URL `https://analog.quest/api/auth/callback/github`) and note
   the Client ID + Client Secret.

2. **Add production env vars to Vercel** (Settings → Environment
   Variables):
   ```
   NEXTAUTH_URL=https://analog.quest
   NEXTAUTH_SECRET=<openssl rand -hex 32, different from local>
   GITHUB_CLIENT_ID=<prod github oauth client id>
   GITHUB_CLIENT_SECRET=<prod github oauth client secret>
   UPSTASH_REDIS_REST_URL=<same as local or different instance>
   UPSTASH_REDIS_REST_TOKEN=<same as local or different instance>
   ```
   Trigger a redeploy after saving.

3. **Sign in at https://analog.quest/contribute** with GitHub.

4. **Run this SQL against Neon** to promote yourself to admin:
   ```sql
   UPDATE contributors SET role = 'admin' WHERE github_id = 8813135;
   -- (2026-09 correction: target the immutable github_id, not github_login —
   -- the app stores the display name there, and the account was renamed)
   ```

5. **Sign out and back in** so the session picks up the new role.

6. **Test the moderation flow.** Visit `/admin/review`, reject the
   2-sphere metric match with reason `standard_canonical_object`. The
   response should include `trivia_added: true`. Verify that hash shows up
   in `trivial_hashes` via Neon.

7. **Consider seeding more papers.** 1,770 is thin. Target 5,000–10,000
   for the first real test of whether the system finds anything
   interesting. `python3 scripts/seed_queue.py` in a terminal. Each run
   adds ~600–1,500 new papers depending on arXiv API luck.

8. **Optional: set up BetterStack monitoring** on `/api/health`. The
   endpoint exists and works. The monitoring service doesn't yet. Free
   tier is fine.

---

## What's broken, what's incomplete, what's uncertain

This is the section that matters most for rigor. The pipeline works, but
there are several classes of thing it gets wrong, incomplete, or doesn't
yet handle at all.

### The canonicalizer (scripts/pipeline/normalize.py)

**Parse rate is 53%. The other 47% is currently dead to us.** The biggest
reasons equations fail to parse:

- **Custom macros.** Many papers `\newcommand{\R}{\mathbb{R}}` or
  `\def\bra#1{\langle #1 |}`. The extractor strips the definition line but
  the usage of `\R` or `\bra{x}` elsewhere in the equation remains
  undefined. SymPy fails. A fix would be a two-pass extractor that
  collects macro definitions and expands uses. Not yet built.
- **Tensor index conventions.** `R^{abcd}`, `g_{\mu\nu}`, `T^i_{\,jkl}`
  and similar. SymPy treats every index as an exponent or subscript
  symbol. The structural meaning (rank-4 tensor with antisymmetry in
  certain pairs, etc.) is lost.
- **Operators SymPy doesn't know:** `\circ` (function composition),
  `\otimes` (tensor product), `\oplus`, `\oslash`, `\star`, `\star`-product
  notation, and most things from category theory or differential geometry
  beyond `\nabla` and `\partial`.
- **`\partial_t u` vs `\frac{\partial u}{\partial t}`.** These are the
  same mathematically but SymPy parses them differently. The heat equation
  match works only when both papers happen to use the same one.

Any serious improvement to cross-domain match quality runs through one of
these — probably macro expansion first, since it's the highest-impact
fix and also the most self-contained.

### The matching algorithm

The matcher is "exact hash equality" plus a complexity floor plus a garbage
pattern filter plus the trivia-hash list. It does not:

- **Handle structural near-matches.** Two equations with the same operator
  tree but different coefficients or arities will hash differently.
- **Recognize mathematical equivalences that SymPy doesn't simplify to.**
  E.g., `sin²θ + cos²θ = 1` on one side and `1` on the other will not
  collide.
- **Weight matches by rarity of the canonical form.** It surfaces all
  candidates above the complexity floor regardless of how common the form
  is in the corpus. (Display-level sorting by rarity now happens on
  `/discoveries`, but the matcher itself doesn't care.)

The moderator review flow is the current compensation for these gaps. When
the corpus grows, we'll need to decide whether to add automatic rarity
thresholds to the matcher (making it stricter) or leave it generous and
let moderators do the filtering (more work but cleaner semantics).

### Things the reviewer specifically flagged

The project has received substantive feedback from a single external
reviewer (a friend of the admin) on two separate occasions. Both pieces
of feedback should be preserved as touchstones for the project's rigor.

**First review, on the HJB ↔ SGD match:** "This is not yet 'the single
best argument for the project.' It is one of the first credible ones. The
identical update rule alone is not enough — it risks being a trivial match
rather than a profound one. Tons of papers across physics, ML, control,
inverse problems contain some version of `θ ← θ − η∇L`. Did the system
find a shared notation pattern, or a genuinely transferable mathematical
structure?"

The lesson: **the same canonical form showing up in two papers is a Tier 1
fact. Promotion to Tier 2 requires showing that the *surrounding
mathematical context* is also similar — both are ODEs of the same order,
both are variational problems with the same structure, both have similar
stability behavior, etc.** The pipeline cannot produce Tier 2 matches on
its own. Ever. Tier 2 is definitionally a human-in-the-loop judgment.

**Second review, on the 2-sphere metric match:** "Tier 1, very low signal
quality. Shared textbook geometry, not a surprising structural bridge. If
anything this should be heavily downranked or filtered out entirely.
Otherwise the system will keep surfacing 'different fields both use
spherical coordinates,' which is not interesting."

The lesson: **the pipeline will systematically produce matches on common
textbook objects.** Without an active defense, these will dominate the
output and make the whole project look like equation-hash theater. The
trivia-hash filter (added in commit `a6541af`) is the current defense.
It's moderator-learned rather than automatic because hash frequency at
the current corpus size is an unreliable proxy for true universality.

### The social layer is aspirational

The project is designed around the assumption that people with Claude Code
subscriptions will contribute their idle compute to a research project.
That assumption has not been tested. Zero volunteers have signed up. The
first real test is when the admin shares the project and sees whether
anyone bites. If nobody does, the architecture is still good — the
pipeline can run on admin compute as a fallback — but the "crowdsource
the compute" thesis is unproven.

### Cost model

The admin is on the hook for: Vercel Pro, Neon (currently free tier, will
exceed at ~10M rows), GitHub Pro, Upstash Redis (free tier), Railway (not
used yet). No paid APIs. No LLM calls. The pipeline runs entirely on SymPy
which is free. The cost ceiling is Neon storage — at 1M equations we are
on the safe side of the 10GB free tier, at 10M we hit the paid tier. The
corpus currently has ~40k equations.

---

## Common mistakes to avoid

### Don't oversell matches

I did this twice in one session. The pattern:

1. Pipeline produces a match
2. I look at the LaTeX and it looks like a genuine cross-domain connection
3. I write a confident explanation of why it's interesting
4. A human reviewer immediately sees that it's either a parser artifact
   or a textbook object
5. I have to retract

The defense is mechanical. Before claiming a match is interesting, check:

- **Hash frequency.** If the canonical form appears in 5+ papers, be
  suspicious. If it appears in 20+, it's almost certainly a common form.
- **Complexity relative to content.** A match on `x_0 = x_1 + x_2` is
  structurally nothing, regardless of what the original papers said. The
  complexity floor catches most of these but not all.
- **Textbook test.** Is this equation in an undergraduate textbook in
  either field? If yes, it's probably Tier 1 at best and probably
  worthless.
- **Translation test.** Can a working mathematician or physicist in either
  field read both papers and say "oh, I never thought about these as the
  same thing"? If not, the match isn't interesting.

### Don't assume the canonicalizer understands what it's parsing

SymPy's LaTeX parser will happily accept `\theta \leftarrow \theta - \eta
\nabla_\theta \mathcal{L}` and return an expression tree. That tree looks
meaningful in srepr output. It is not meaningful. SymPy does not know what
`\leftarrow` or `\nabla` mean; it treats them as unknown symbols. The
canonical form of an "SGD update" parsed naively is a flat product of 7
generic symbols that happens to match any other equation parsed the same
wrong way.

The preprocessing layer in `normalize.py` fixes many of these cases but
not all. When you see a new class of matches appearing, always check:
what does the normalized form actually look like? If it's a flat product
of 5+ symbols with no `Derivative`, `Integral`, `log`, `exp`, etc., the
matcher is almost certainly hashing a parser failure.

### Don't trust Tier 1 matches on their own

Tier 1 is the pipeline's default output. It's "these two equations
normalize the same way." That's a necessary condition for a real match
but not a sufficient one. Every Tier 1 match should be treated as a
candidate that needs review, not a discovery.

### Don't skip the review step

Several times in this session I was tempted to just ship something
without running it against reality. The review-by-actually-running-the-
code step caught real bugs in the SQL, the matcher, and the preprocessor.
If you find yourself thinking "the code looks right, I'll skip the
verification run," stop and run it.

### Don't delegate without verification criteria

The preprocessor rebuild was delegated to a separate Claude Code session
with a detailed prompt. That worked because the prompt included specific
unit test cases with expected pass/fail and a required verification
procedure. The agent couldn't just say "I fixed it" — they had to produce
test output and a report with before/after numbers.

When you delegate something similar, do the same thing. Prescribe the
verification, not just the task.

### Don't let HANDOFF rot

This document is the most honest account of the project that exists. If
you make a substantive change and don't update HANDOFF, future-you (or a
future agent) will make decisions based on stale information. Treat it
like any other part of the system: it decays, and the decay is expensive.

---

## The path forward, in rough order of value

**See also: [docs/ROADMAP.md](./docs/ROADMAP.md)** for the detailed
ceiling-removal plan. This section is the short version; the roadmap
document is the long-form analysis with rough cost estimates and
honest uncertainty for each item.


**1. Fix macro expansion in the extractor.** The biggest single improvement
to parse rate. Estimated 1-2 days of work. Requires a two-pass approach:
collect all `\newcommand`/`\def` definitions in the paper, then expand
uses in each equation before SymPy sees it. Watch for edge cases like
recursive macros and macros with multiple arguments.

**2. Grow the corpus to 10k papers.** Run `seed_queue.py` repeatedly, then
run the pipeline against the new papers. Watch what the expanded corpus
surfaces. Hash frequency stats start becoming meaningful at this scale.

**3. Add a handful of known-trivia hashes at launch.** When the admin does
the first moderator review pass, they should reject enough textbook
objects to bootstrap the trivia list (S² metric, F=ma, ideal gas law, the
generic Hamiltonian, the generic SGD update, etc.). Maybe 20–30 entries.
This protects the pipeline from re-surfacing them as the corpus grows.

**4. Start telling people about it.** The social thesis needs real users
to test. Suggestion: share with a small audience first (Discord, a
specific subreddit, a couple of mathematician friends) and watch whether
anyone signs up and contributes. The first real external contribution
will expose usability problems we don't see because we built it.

**5. Build the automated pipeline runner as a GitHub Action.** Not yet
done. Would let the admin's own pipeline runs happen on a schedule without
needing a terminal open. Free GitHub Actions minutes are more than enough.

**6. Moderation policy for disputes.** The `/moderation` page describes an
appeal process (open a GitHub issue) but no actual dispute has happened
yet. When the first one does, the admin should document how it was
resolved and maybe formalize the process.

**7. Frontend improvements.** KaTeX rendering of LaTeX on `/discoveries`
would make matches much easier to read. Not yet done. Roughly 30 minutes
of work.

**8. Embedding path.** Currently disabled. Don't re-enable without a
specific reason — the previous attempt produced 100% noise because
sentence-transformers on math LaTeX is dominated by notation conventions,
not structure. If you do re-visit it, try a math-aware embedding model
(MathBERT or similar) and evaluate against the same test corpus we
already have.

---

## Key file map

**Frontend (app/):**
- `page.tsx` — homepage with activity feed
- `discoveries/page.tsx` — verified isomorphisms + Tier 1 candidates with
  frequency display
- `contribute/page.tsx` — sign-in, mode selector, copy-to-agent
- `c/[username]/page.tsx` — contributor profile pages
- `admin/review/` — moderator triage UI
- `admin/moderators/` — admin invite management
- `admin/invite/redeem/` — public redemption page
- `moderation/page.tsx` — public policy
- `api/*/route.ts` — all the API endpoints

**Backend / pipeline (scripts/):**
- `pipeline/extract.py` — arXiv LaTeX download + equation extraction
- `pipeline/normalize.py` — SymPy canonicalizer (9 preprocessing steps)
- `pipeline/match.py` — cross-domain hash matching with trivia filter
- `run_pipeline.py` — end-to-end runner
- `renormalize.py` — re-apply normalizer to existing DB rows
- `seed_queue.py` — arXiv paper ingestion
- `tests/test_normalize.py` — preprocessor unit tests

**Database (database/):**
- `schema.sql` — original queue / papers / extractions / isomorphisms
- `equations_schema.sql` — equation + match tables with pgvector
- `auth_and_moderation_schema.sql` — NextAuth + contributors + trivial_hashes

**Auth:**
- `auth.ts` — NextAuth v5 config
- `lib/api-auth.ts` — requireUser / requireRole with bearer token support
- `lib/ratelimit.ts` — Upstash rate limiting wrapper

**Skill files (public/):**
- `analog-quest.SKILL.md` — Mode B (abstract reader)
- `analog-quest-pipeline.SKILL.md` — Mode A (local pipeline contributor)

---

## Recent commit history (in chronological order)

- `4fddd87` — Fix seed script: working categories, https, expanded coverage
- `213c990` — Strip frontend to radical simplicity: white background, black text
- `a59adbb` — Add Phase A: programmatic LaTeX extraction
- `8bffbc4` — Label pipeline matches as Tier 1 candidates with honest framing
- `06ecbc5` — Add NextAuth v5 with GitHub OAuth and schema for auth + moderation
- `e4ea679` — Lock down queue API and add Mode A pipeline contribution endpoints
- `4b37ff2` — Add moderator review UI and invite system
- `a6cbae3` — Complete Session A: profiles, activity feed, CLI tokens, two-mode contribute
- `fe6bf70` + `b34a33a` → `e5f26e2` (merge) — Rebuild LaTeX canonicalizer with proper
  preprocessing (delegated work + follow-up cleanup)
- `a6541af` — Add trivia-hash filter: moderator-learned rejection of standard
  canonical objects
- `2bb89eb` — Display hash frequency on match cards, sort matches by rarity ascending
- `91fbe4f` — Session B polish: moderation policy page, README rewrite, legacy cleanup

Every commit has a detailed message explaining the motivation. If you're
trying to understand *why* something is the way it is, `git log --oneline`
plus reading the relevant commit body is usually faster than asking.
