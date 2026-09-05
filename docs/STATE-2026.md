# Analog Quest — State of the Project, September 2026

**Written:** 2026-09-05, by the incoming lead agent (dive phase, first cycle).
**Method:** everything below was re-verified this session — live site probed, production DB surveyed read-only, experiment artifacts re-evaluated from the committed files, pipeline tests re-run, frontend rebuilt, prior-art landscape re-checked on the open web. Where a claim is inherited rather than verified, it says so.

---

## Executive summary

The project is **paused, not broken, and not stale on merit**. The July 5 pivot — from exact-hash equation matching to atlas classification — was validated with pre-registered experiments, wired into the live site, and then abandoned the same day it shipped. Everything built that day still works. The atlas has exactly the 60 pilot papers in it; 1,770 papers sit unclassified; no moderation pass has ever run; the admin account was never promoted, so **no one can currently moderate**. The prior-art window the July landscape scan found open is, per this session's re-check, still open. The stall is entirely operational: the remaining work is cheap, specified, and waiting.

---

## What exists and works (verified 2026-09-05)

- **Live site** (analog.quest): `/` 200, `/atlas` 200 serving real classification data, `/discoveries` 307 → `/atlas` (intentional, per the atlas runbook), `/contribute` 200, `/api/health` healthy and reporting correct counts. Auth-gated endpoints correctly 401 unauthenticated (`/api/atlas/next-batch`).
- **Production env is complete.** NextAuth + GitHub OAuth vars are set in Vercel production — HANDOFF's April note that prod auth "may not work" is stale. (Whether sign-in works end-to-end was not browser-tested this session; the config is present.)
- **Frontend builds clean** from a fresh clone (`npm run build`, zero errors, Next.js 15).
- **Pipeline is runnable**: all 47 tests pass (16 normalize + 31 macros) on a fresh clone with sympy 1.14.
- **The atlas schema is applied to prod and seeded**: 50 templates, 50 equivalence rows, 63 classification rows over the 60 pilot papers, all dated 2026-07-05.
- **7 cross-field structure groups are live** in the atlas right now: reaction_diffusion_turing (math↔physics, 5 papers), langevin_sde and fokker_planck (cs↔math), master_equation (cond-mat↔q-bio), sir_compartmental (physics↔q-bio), nash_equilibrium, gradient_descent (the last is exactly the textbook-object class the trivia filter exists for — and the trivia list is empty, see below).

## Experiment claims spot-checked

Re-ran `scripts/experiments/atlas/evaluate.py` against the committed classification artifacts: the headline numbers **reproduce exactly** — C1 classification recall 28/30 = 0.93, C2 join 9/15 strict / 14/15 equivalence-class, C3 distractor precision pass. The Haiku A/B numbers (0.90, 13/15) also reproduce. The fingerprint failure reports (recall@25 = 0.42, twice) are consistent across their analysis files. The honesty culture held: failures are filed as failures, the post-hoc equivalence graph is labeled post-hoc, both strict and equivalence numbers are reported everywhere.

One housekeeping wrinkle: the committed `atlas/results/report.md` holds the **Haiku** run's output (0.90/13-15), while the analysis headline is the Fable run (0.93/14-15). Both runs are honestly documented (`HAIKU-AB-2026-07-05.md`); the file was simply last overwritten by the A/B. Worth regenerating or labeling to avoid confusing a future reader.

## What the production data actually shows

| thing | value | note |
|---|---|---|
| papers | 1,830 | last added 2026-07-05 |
| — breadth | physics 574, finance 344, cs 308, math 287, economics 194, biology 100, + small tails | broader than HANDOFF's "mostly physics" (stale) |
| equations | 39,054 (non-empty) | last extraction 2026-04-11 |
| parse rate | 53.4% | matches the documented figure exactly |
| atlas classifications | 63 rows / 60 papers | the July 5 pilot, nothing since |
| unclassified backlog | **1,770 papers** | the whole corpus minus the pilot |
| atlas trivia list | **0 rows** | no moderation pass has ever run |
| moderation_log | 0 rows | ditto |
| trivial_hashes | 0 rows | the 2-sphere rejection never happened |
| contributors | 1 (role: **contributor**) | the admin-promotion SQL was never run |
| cli_tokens | 0 | zero external volunteers, ever |
| isomorphisms (Mode B) | 0 | by design — never used |
| equation_matches (legacy) | 2 | the two old Tier 1 candidates |

Two consequences worth stating plainly:

1. **Nobody can moderate the live atlas today.** The only contributor row has role `contributor`. Until the owner signs in and the promotion SQL runs (`UPDATE contributors SET role='admin' WHERE ...`), the moderation endpoints are unreachable and the trivia filter cannot be used. This is the single cheapest unblock in the project.
2. **The public atlas currently shows an unmoderated pilot**, including `gradient_descent` as a "cross-field bridge" — precisely the failure mode the external reviewer warned about and the trivia mechanism was built to catch. The runbook's own rule ("moderation pass before sharing") means the site should not be promoted anywhere until that pass happens.

## What's broken or stale

- **`/api/queue/status` returns HTTP 500** (empty body). Root cause found: the route queries `contributors.last_seen`, but the live table (from `auth_and_moderation_schema.sql`) has `last_seen_at`. One-line fix; needs owner review before deploy per the prod rule. The homepage may degrade wherever it consumes these stats.
- **README leads with the superseded architecture.** It narrates the SymPy exact-hash pipeline and tiers as the current system and never mentions the atlas. It links `/discoveries`, which now redirects. Realigning it is the charter's named "early, cheap, high-integrity fix."
- **HANDOFF.md's older sections are stale** in places the July 5 log doesn't override: prod auth env (now set), corpus breadth (now reasonably diverse), "admin still needs to do" items 1–2 (done) vs items 3–6 (still not done: sign-in/promotion/moderation).
- **Legacy surfaces still describe the old system**: the Mode A/Mode B skill files and `/contribute` flow predate the atlas; `analog-quest-atlas.SKILL.md` is the current one. Not broken, but a visitor reading `public/` gets three generations of story at once.

## Dead weight assessment

- **The exact-hash matcher as a primary matcher is dead**, and was honestly pronounced dead (structurally blind to its own target; diagnosis in HANDOFF and ROADMAP Item 2). The extraction layer under it — 39k parsed equations, the normalizer, 47 passing tests — is real infrastructure and data, not dead weight. Recommendation on its fate is in the futures memo (short version: honestly-labeled legacy layer, not first-class mode).
- **The fingerprint pairwise experiment is closed** (two pre-registered failures at 0.42; documented do-not-rerun). Its artifacts are the project's best evidence of the honesty culture — keep them prominent, not archived away.
- **Mode B (abstract reader → isomorphisms table)** was never used by anyone (0 rows, 0 tokens). Superseded by the atlas contribution flow. Candidate for retirement/redirect when the contributor surfaces get cleaned up.
- Nothing else found that costs money or attention while idle: Neon free tier (~40k equation rows, far from limits), Upstash free tier, Vercel already paid for.

## The stall, honestly

The repo went quiet 2026-07-05 — the same day the substrate was validated and shipped. Per the owner: attention, recruitment, overwhelm. Nothing in the code or the data stalled the project; the next steps were written down in three places (HANDOFF next-agent list, atlas analysis recommendations, operate-atlas runbook) and all of them are still the next steps. The corrective now in place is structural: weekly owner cycles with a lead agent running cadence.

## The outside world since July (landscape re-check, 2026-09-05)

Web re-check performed 2026-09-05 (primary pages fetched where stated; the rest is search-snippet-level evidence and labeled as such):

- **The four-part combination is still unoccupied.** No new entrant does notation-independent model extraction + cross-discipline matching at scale + tiered human review + a published catalog.
- **Romiti (arXiv:2508.05724): dormant.** Still v2 (Aug 2025); the graphysics repo's last commit is 2026-05-15, 1 star, still physics-only, no catalog. (Abstract page and commit log fetched. Citation count unverified — Semantic Scholar rate-limited.)
- **The Discovery Engine (arXiv:2505.17500): dormant on this axis.** Still v1 only; absent even from the Active Inference Institute's own July 2026 newsletter (fetched); no shipped catalog or follow-up found.
- **New since July, adjacent not competitive:** **IsoSci** (arXiv:2607.01431, July 2026, abstract fetched) — a benchmark of hand-paired isomorphic cross-domain science problems for testing LLM reasoning. It's evaluation infrastructure, not an extraction engine, and its finding (LLM gains are mostly knowledge-retrieval, structure-invariant reasoning is hard) is *supportive* context for this project's human-review tier. Cite it in any write-up alongside Romiti and the Discovery Engine.
- **TheoremSearch (arXiv:2602.05216): grew but stayed pure-math** — v2 is an ICLR 2026 workshop paper; the site now has an API, MCP server, and downloadable datasets, with no applied-science or cross-domain pivot (site + abstract fetched). The extraction-infrastructure commoditization the July scan warned about continues.
- **Frontier labs** (snippet-level): Sakana's AI Scientist reached Nature (2026-03) doing per-run idea generation; DeepMind's "AI co-mathematician" (arXiv:2605.06651) does problem-solving. Nobody is doing literature-scale isomorphism cataloging.

Same caveat as the July scan: absence of evidence across public channels, stealth work can't be ruled out. Net read: **the window held for two more months while nothing here moved.** Infrastructure keeps commoditizing underneath the niche, which cuts both ways — cheaper for this project to operate, cheaper for a well-resourced entrant to absorb.

---

## The near-term unblock list (for the weekly session)

In dependency order, all cheap:

1. Owner signs in at analog.quest, promotion SQL runs → moderation becomes possible. (Owner + a one-line SQL; the agent can prepare everything.)
2. Fix `/api/queue/status` (one line) + README realignment → truthful public surfaces. (Owner reviews, then deploy.)
3. Moderation pass on the 7 live bridge groups (flag gradient_descent etc. as trivia) → the atlas front page shows real bridges only.
4. Classify the 1,770-paper backlog (Haiku-class model, validated at 0.90 recall; corpus-scale cost is cents-per-thousand-papers — estimate to be approved before running) → a populated atlas.
5. Then the strategic choice — see `docs/FUTURES-2026.md`.
