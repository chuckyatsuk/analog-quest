# Analog Quest — Futures Memo

**Written:** 2026-09-05, by the lead agent, for the first weekly strategy session.
**Companion:** `docs/STATE-2026.md` (the verified current state). This memo proposes futures; the owner picks. Nothing here runs before that.

Ground truth this memo stands on: the atlas substrate is validated (0.93/0.90 recall Fable/Haiku, pre-registered) and live; 1,770 papers are unclassified; the moderation layer has never been used and currently *can't* be (admin role never granted); the prior-art window re-verified open on 2026-09-05; the stall was attention, not merit.

---

## The options

They are not all mutually exclusive — A is the substrate for B and C — but each is scoped so it could be *the* commitment for the next 90 days, and the honest failure mode of each is stated.

### Option A — Operate: populate and moderate the atlas

Run the machine that was built. Classify the full 1,770-paper backlog, moderate the resulting bridge groups, fix the two truth-alignment items (README, `/api/queue/status`), and make analog.quest show a real, honest, populated atlas.

**First 90 days:** weeks 1–2: admin unblock + moderation pass on the pilot + README/bugfix deploys. Weeks 2–6: backlog classification in batches with per-batch spot-checks (pre-registered precision criterion on a random sample — corpus papers are not gold-standard papers; C3's 0.93 is the prior, not the promise). Weeks 6–12: moderate the full atlas, grow the corpus deliberately toward under-represented fields (biology, neuroscience, epidemiology at ~100/1,830 today), publish the first "structure X spans fields A/B/C" pages worth linking to.

**Costs:** LLM classification at Haiku-class pricing — the validated cost model is cents per thousand papers; the 1,770-paper backlog is on the order of **single-digit dollars, approved before any run**. Everything else is session time. No new infra.

**Requires from the owner:** the sign-in + admin-promotion step (5 minutes, can't be delegated); deploy reviews; a decision on how the agent writes classifications (a CLI token through the app's own audited API is the designed path and keeps prod writes inside the app).

**Honest failure mode:** the atlas fills up with mostly-trivia and thin genuine bridges — i.e., the corpus-scale precision doesn't hold, or real cross-field structure is rarer than hoped. That result is *publishable either way* (see B) — this is the option whose failure still produces knowledge.

### Option B — Publish: the flag-planting write-up

Write the method + honest-results paper/long-form while the niche is verifiably still open: the four-part combination, the pre-registered failures (0.42 twice) as first-class content, the atlas validation, the moderation design, the volunteer-compute model. Cite Romiti, The Discovery Engine, and now IsoSci. Target: arXiv preprint (cs.DL/math.HO) + a long-form web version.

**First 90 days:** weeks 1–3: draft from the existing artifacts (most of the evidence is already written down in analysis files — this project documents unusually well). Weeks 3–5: owner review, external-reader pass. Weeks 5–8: publish, distribute to the specific adjacent researchers (Romiti, AII, the analogy-mining lineage), one or two community posts. Remainder: respond, and fold reception into the next cycle's plan.

**Costs:** ~1–2 weeks of focused agent writing + real owner review hours. Approximately zero money.

**Honest failure mode:** silence. A write-up about a 60-paper pilot claims less and lands softer than one about a populated atlas — which is the argument for sequencing A→B rather than B alone. The counter-argument: the window has been "open but closing" for five months, and the failure-reporting story is already complete and novel today.

### Option C — Recruit: test the volunteer-compute thesis

The "idle Claude Code subscriptions as research compute" model is genuinely novel and completely untested (zero volunteers, zero CLI tokens ever issued). Make the contribution loop excellent, then actually share it: the atlas skill file, a tight onboarding page, a visible "papers classified / bridges found" counter, and a deliberate push to specific communities (not a launch — a test with a pre-registered adoption criterion, e.g. "≥5 distinct contributors submit ≥100 classifications within 30 days of the push").

**First 90 days:** requires A's weeks 1–2 first (an unmoderated atlas showing gradient_descent as a discovery would burn the one first impression). Then: polish the contributor surface, retire/redirect the two legacy skill files, owner shares in 2–3 chosen venues, measure against the criterion, report the result as pass/fail.

**Costs:** session time + the owner's social capital (the sharing itself cannot be delegated). No money.

**Honest failure mode:** nobody comes — which the HANDOFF already names as survivable (admin compute suffices at current scale) but which spends the owner's one clean launch moment. This is the highest-variance option and the one most gated on the owner's energy, which is the resource that caused the stall.

### Option D — Research: the novel-structure tail (Path A) / substrate work

Pairwise LLM verification over fingerprint blocking (the 11/12-blocking-recall result), new-structure discovery beyond the 50 templates, OpenAlex corpus expansion, normalizer work.

**Recommendation: defer, explicitly.** The runbook's own do-nots cover most of this (no OpenAlex on spec, no fingerprint re-runs, parse rate is a proxy). Path A becomes interesting *after* the atlas is populated and moderated — the atlas's known-structure joins are the cheap wins, and the novel tail is only credible on top of a working catalog. Revisit at the 90-day mark. The one standing tripwire stays: if a materially newer model generation lands, re-run the fingerprint experiment unchanged (recall@25 ≥ 0.5 revives the pairwise path).

---

## Recommendation

**A, then B on top of it: operate for ~6 weeks, then write the flag-planting piece about a *populated* atlas.** A is the only option that makes every other option better, its costs are trivial, its failure mode still produces an honest publishable result, and it directly converts the thing that stalled (human attention) into the thing the project structurally lacks (output). B's window-risk is real but small per the 2026-09-05 re-check (both neighbors dormant); six weeks of exposure buys a much stronger paper. C runs after B exists to point at. D stays parked with its tripwire.

The weekly cadence makes this concrete: cycle 1 = admin unblock + moderation pass + README/bugfix review; cycle 2 = first classification batch with its pre-registered spot-check criterion; and every cycle ends with HANDOFF updated.

---

## The SymPy pipeline's fate (recommendation, as chartered)

**Honestly-labeled legacy extraction layer — not first-class, not deleted.**

Reasons: (1) the exact-hash matcher is structurally blind to the project's own target — its two Tier 1 candidates in 39k equations against the atlas pilot's 7 bridges in 60 papers is the whole argument in two numbers; (2) the extraction corpus itself (39k equations, 53.4% parsed) remains real data — a future "which exact equation instantiates the template" view or a Path A verification signal can consume it; (3) the pipeline embodies the project's best negative results (macro-expansion measurement, the 0.42s) and its test discipline — deleting it would delete evidence.

Concretely: README describes it in past/legacy tense with a link to the pivot's reasoning; Mode A/Mode B skill files get a deprecation header pointing at the atlas skill; `equation_matches`/`isomorphisms` tables stay (2 rows and 0 rows cost nothing); no new engineering effort goes into parse rate. The tier vocabulary (Tier 1 = candidate, human-gated promotion) carries forward to the atlas unchanged — that part was never legacy.

---

## Standing constraints (unchanged, restated so nobody re-litigates them)

Pre-registered criteria before anything experimental; corpus-scale runs cost-estimated and approved first; read-only on prod DB until granted otherwise; owner reviews public-site changes; tier labels mean what they say; no invented results, ever.
