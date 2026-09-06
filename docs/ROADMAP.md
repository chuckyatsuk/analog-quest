# Analog Quest — Roadmap

**Last updated:** 2026-04-13
**Audience:** future-us, future agents, and anyone contributing at the
engineering or planning level. This is the internal version. A
contributor-facing roadmap will come later.

---

## How to read this document

This is not a feature list. It's a **ceiling-removal plan**.

The project has a working pipeline that produces honest output. At the
current scale (1,770 papers, 2 Tier 1 candidates, 0 Tier 2+) the output is
thin, and the thinness is structural — the same pipeline running on 10x
or 100x the corpus would produce proportionally more *Tier 1 candidates*
but not meaningfully more *real discoveries*. That's because real
discoveries require the pipeline to clear specific ceilings that volume
alone doesn't address.

This roadmap is the list of those ceilings, in order of leverage. Other
work — bugfixes, ops improvements, UX polish, maintenance — happens on
its own cadence and isn't listed here. The point of keeping this document
narrow is to stay honest about what actually moves the project toward the
vision.

Each item below has:
- **What it is** — the specific technical problem
- **Why it matters** — what gets unblocked when it's solved
- **Rough cost** — order of magnitude, not estimate
- **Uncertainty** — what we don't know going in

If an item says "to be evaluated," it means we don't yet know if the fix
works. Don't assume it does.

---

## Item 1 — Canonicalizer parse rate

**Current state:** 53.4% of extracted equations normalize successfully.
The other 47% are currently dead to the matching layer — they sit in the
database as strings with no structural hash, contributing nothing to
cross-domain candidates.

### Attempted 2026-04-24: macro expansion did not work

Custom-macro expansion (the highest-impact item below) was implemented and
measured on a 30-paper random sample from the live corpus. Expected gain
was +10–15 pp of parse rate. **Measured:** −1.09 pp parse rate, −0.36 pp
high-quality rate, roughly flat garbage-shape rate. The feature was gated
behind `ANALOG_QUEST_EXPAND_MACROS` (default off) and left in repo for
future work.

Why it failed: SymPy's LaTeX parser has weak points the OLD pipeline's
"unknown token = single symbol" fallback was routing around. Expansion
exposes those weaknesses:
  - `\mathrm{d}` in `\frac{\mathrm{d} S_t}{S_t}` parses fine, but any
    attempt to strip `\mathrm{}` corrupts the `\frac{}` numerator.
  - `\mathrm{Tr}(\sigma(x))` becomes a flat product of bare symbols
    `T*r*sigma*x` — parseable but meaningless.
  - `\left<...\right>` (bra-ket / averaging) becomes bare `<...>` that
    SymPy rejects entirely.
  - `\mathfrak{sl}` becomes 2-char `sl` parsed as `s*l`, losing structure.

The real ceiling is **SymPy parser quality on expanded content**, not
macro expansion itself. Fixing the normalizer to handle these cases is
a meaningful project — probably 1–2 weeks — and unblocks macro expansion
as a side effect.

Independent-of-expansion normalizer improvements that did land on main:
  - `\mathfrak` and `\mathscr` added to font-macro strip (valuable for
    algebra / Lie theory papers).
  - `\underline{x}` decorator strip.
  - Nested `_{_{...}}` and `_{{X}}` subscript collapse.
  - Guarded time-index regex (fixed a latent bug where `\mathbf{x}^{(t+1)}`
    would token-merge to `\mathbfx_{t+1}` — was masked by old font-strip
    producing spaces rather than caring about word boundaries).

**Lesson for the next session:** don't re-run this experiment without a
different angle. Either invest in the normalizer first (so expansion
has somewhere to land), or look at a different ceiling entirely.

### Why it matters

Every percentage point of parse rate improvement roughly linearly
increases the number of candidate matches, but with a secondary effect:
the equations SymPy *can't* parse are disproportionately the interesting
ones. Standard textbook forms parse fine. Custom-macro-heavy, tensor-
dense, or novel-notation equations are where the genuinely cross-domain
signal lives, and those are exactly the ones we're dropping.

A move from 53% → 80% is not "1.5x more matches." It's "we start seeing
the class of matches we're currently invisible to."

### The specific gaps, ranked by impact

**1. Custom macro expansion** (highest impact; probably 10–15 percentage
points of parse rate)

Many papers define their own commands: `\newcommand{\R}{\mathbb{R}}`,
`\def\bra#1{\langle #1 \vert}`, `\DeclareMathOperator{\Tr}{Tr}`. The
extractor currently strips the *definition* lines but does nothing with
the *uses*. SymPy sees `\R` or `\bra{x}` and fails.

Fix: two-pass extractor that (a) collects all `\newcommand` / `\def` /
`\DeclareMathOperator` / `\let` definitions from each paper, (b) expands
uses in each equation before SymPy sees it. Watch for: recursive macros
(`\def\foo{\bar}` where `\bar` is also a macro), macros with multiple
arguments, macros that embed other macros.

**Rough cost:** 1–2 days. Well-scoped. Self-contained in `extract.py`
with some integration in `normalize.py`.

**Uncertainty:** low. This is a solved problem in the LaTeX-parsing world
(`tex-expand` and similar tools exist). Worst case we port their logic.

**2. Alternate derivative notations** (moderate impact; probably 5–8
percentage points)

- `\partial_t u` vs `\frac{\partial u}{\partial t}` — SymPy parses these
  differently, so the same PDE written two ways produces different hashes.
- `u_t` (subscript-as-derivative) — common in PDE papers, SymPy treats
  the subscript as a label.
- `u'` (prime as derivative) — used in ODE papers, not recognized.
- `Du`, `D_t u` — used in some control/dynamics papers.

Fix: preprocessor substitutions that canonicalize all these to a single
form before SymPy sees them.

**Rough cost:** half a day. A few regex rules plus test cases.

**Uncertainty:** low. Mechanical work.

**3. Tensor index handling** (moderate impact in specific domains; probably
3–5 percentage points overall but much more in physics/GR papers)

`R^{abcd}`, `g_{\mu\nu}`, `T^i_{\,jkl}`, `\partial_\mu \phi` — these are
standard in physics. SymPy treats every index as an exponent or a symbol
subscript, which drops all the structural information about rank,
symmetry, covariant vs contravariant position.

Fix: a domain-specific canonicalization pass that recognizes tensor
index notation and maps it to a structured form (maybe a custom SymPy
extension, maybe a wrapper around the index variable). This is the one
that might not work cleanly — tensor notation has enough local conventions
that a general fix might be hard.

**Rough cost:** 2–4 days, possibly more. Needs careful testing against
real physics papers.

**Uncertainty:** medium. **Partial coverage might be better than nothing.**
Worth starting with the most common case (`g_{\mu\nu}` for metric tensors)
before attempting general tensor calculus.

**4. Composition and operator-algebra notation** (lower impact; 1–3 points)

`\circ` (function composition), `\otimes` (tensor product), `\oplus`
(direct sum), `\star` (star product), etc. SymPy treats these as unknown
symbols. Papers using categorical or operator-algebra language get mangled.

Fix: recognize these operators and either map them to SymPy equivalents
where possible, or add to the UNPARSEABLE list where they can't be
meaningfully handled.

**Rough cost:** 1 day. Mostly triage — some can be handled, some should
just be rejected.

**Uncertainty:** low for the triage itself. Higher for "can we actually
do something meaningful with these," but the floor (add to unparseable)
is well-defined.

### Aggregate target

Parse rate 53% → 80% is realistic if items 1–3 all land. That would roughly
double the matching-eligible equation count and, more importantly, shift
the distribution toward the kind of equations where real discoveries live.

### What this ceiling does NOT fix

Even at 100% parse rate, the match algorithm (item 2) only finds exact
canonical hash equivalents. That's a separate ceiling.

---

## Item 2 — Match algorithm beyond exact hash

**Current state:** two equations match iff their normalized SymPy srepr is
byte-identical after canonical symbol renaming.

### Measured 2026-07-05: LLM structural-fingerprint substrate, first recall test

A fifth candidate approach — **E. LLM structural fingerprints** (each
paper's core model distilled to a notation-independent JSON schema by an
LLM, papers fingerprinted in isolation, matched on an interpretable
feature score) — was built and measured at
`scripts/experiments/fingerprint/`. Gold standard: 12 canonical
cross-domain isomorphisms as planted arXiv paper pairs + 23 distractors.

**Result: pre-registered criterion (recall@25 ≥ 0.5) NOT met — 5/12 =
0.42.** But median planted rank was 57 of 966 candidate pairs (random
baseline ~484), with 5 of 12 known isomorphisms in the top 7 overall
(SIR↔rumor #1, Burgers↔traffic #2, Black–Scholes↔heat #4,
Kuramoto↔power-grid #6, optimal-transport↔matching #7). Note that
approaches A–D below would find none of these — no pair shares a
byte-identical normalized equation. Misses are diagnosed with an ablation
in `results/ANALYSIS-2026-07-05.md`: single-view fingerprints split pairs
that dress the same skeleton differently (stochastic vs deterministic,
continuous vs discrete, equilibrium vs dynamics), and hard categorical
agreement terms make it worse. A specified v2 (multi-view /
deterministic-skeleton field, features-carry-the-score) is the next
measurement. Per this document's protocol: the fix is *not assumed to
work* until the re-run clears the same criterion.

This experiment also supersedes the framing of approaches A–C below for
the cross-notation problem: the LLM fingerprint attacks notation variance
directly, where tree-shape methods inherit SymPy's parse ceiling (Item 1)
on top of their own noise. D (SymPy `.equals()`) remains useful as a
post-match verification signal.

**Update, same day:** v2 (multi-view skeleton fingerprints,
features-carry-the-score, one ground-truth fix, 3 vocabulary-blind
held-out pairs) was measured: **criterion NOT met again, recall@25 = 5/12
= 0.42.** Canonical-adjacent pairs match at score 1.000 (including a
held-out pair, ruling out vocabulary bias at the top of the ranking);
blocking recall reaches 11/12 at top-23%. Verdict: fingerprint similarity
is a strong candidate *blocker*, not a top-25 *matcher*. Do not iterate
the same shape again. The open decision (admin's): Path A = two-stage
blocking + LLM pairwise verification under a new pre-registered
criterion; Path B = canonical-template indexing (atlas architecture).
Both specified in `scripts/experiments/fingerprint/results/ANALYSIS-v2-2026-07-05.md`.

### Why it matters

This is the ceiling the reviewer's friend was pointing at with "hidden
behind vocabulary splits." Two papers solving the same equation almost
never write it in canonically-identical form, even after our preprocessor.
Examples of structurally-equivalent pairs the current matcher misses:

- `\dot{N} = r N (1 - N/K)` (logistic, biology notation)
  vs
  `\frac{dx}{dt} = \alpha x - \alpha x^2 / \kappa` (logistic, physics
  notation — different structure of the RHS but mathematically identical).
  These are the same equation but hash differently.

- `\mathcal{L} = \int \sqrt{-g} R \, d^4x` (Einstein-Hilbert action,
  physics) vs a GR textbook form that unpacks the integrand differently.
  Same action, different LaTeX.

- Any two papers that write the heat equation with different arrangements
  of the constant (`\partial_t u = k \nabla^2 u` vs `\partial_t u = \frac{\hbar}{2m}
  \nabla^2 u`) — if the constant is factored differently they won't match.

The real isomorphisms are *exactly* the ones where different fields use
different notation. The current matcher is worst at finding these.

### Candidate approaches, with honest uncertainty

**A. Graph isomorphism on the expression tree with wildcards**

Treat each normalized SymPy expression as a tree. Two expressions "match"
if their trees are isomorphic modulo leaf node values (constants and
variables). Implementation: canonicalize tree structure (order of
commutative operands, associativity flattening), then compare shape.

**Pro:** well-defined, implementable in pure Python, no ML.
**Con:** might collapse too much — `F = ma` and `E = mc^2` have the same
tree shape (`x = y * z`) and would match. Needs a non-trivial complexity
floor and probably additional constraints (e.g., must have at least one
derivative, sum, or integral).

**Rough cost:** 2–3 days for a working version, another week for the
tuning.

**Uncertainty:** high. This is the "graph isomorphism is expensive and
might not give us what we want" item. We might implement it and find the
match rate jumps by 10x with 99% of the new matches being noise.

**B. Tree edit distance with tuned thresholds**

Same idea as graph isomorphism but with a continuous distance metric.
Two expressions match if their tree edit distance is below some threshold.
More flexible than exact isomorphism (can handle small differences).

**Pro:** smooth degradation — can tune the threshold per equation type.
**Con:** tree edit distance is quadratic in tree size, which matters for
large expressions. And the threshold becomes a parameter to tune with no
obvious right answer.

**Rough cost:** similar to A, maybe slightly more.

**Uncertainty:** high. Same issue as A, plus threshold tuning.

**C. Learned distance metric**

Train a small model (not an LLM, a proper metric learning setup) on known
mathematical equivalences. Use it to score candidate pairs.

**Pro:** potentially very accurate, especially for the cases we care
about (notational variants of the same equation).
**Con:** requires training data we don't have. "Known equivalent equation
pairs" is a dataset someone would have to build. Also introduces an ML
dependency into a project that has deliberately avoided ML so far.

**Rough cost:** unknown. Probably weeks of work if someone with ML skills
takes it seriously. Could be zero if we find an existing dataset and model.

**Uncertainty:** very high. **Probably not the right next step.** Listed
for completeness.

**D. SymPy-based algebraic equivalence**

Use SymPy's own `.equals()` or `simplify(a - b) == 0` on candidate pairs
to detect when two parsed expressions are algebraically identical despite
different symbolic forms.

**Pro:** catches real equivalences like `\sin^2\theta + \cos^2\theta` vs
`1`. Free, already installed.
**Con:** expensive (simplification is slow), and only catches algebraic
equivalence — doesn't help with structural matches that aren't algebraic
identities.

**Rough cost:** 1 day for a proof-of-concept.

**Uncertainty:** low on whether it works (it does). High on whether the
match quality justifies the compute cost. Probably useful as a *post-match*
verification step rather than a primary matcher.

### Recommended order of attack

Start with **D** as an additive signal. It's cheap, well-understood, and
gives us something concrete to evaluate: how many of our current Tier 1
candidates have algebraically-equivalent siblings we're missing? That
answer informs whether to invest in A or B.

Skip C unless a collaborator brings actual ML expertise. Don't build it
speculatively.

### What this ceiling does NOT fix

Even with a perfect match algorithm, we can only match equations that
were successfully parsed. Item 1 is a prerequisite for item 2 having
real leverage.

---

## Item 3 — Corpus breadth strategy

**Current state:** 1,770 papers across 22 arXiv categories, heavily
skewed toward recent physics/cond-mat submissions. Volume growth is
straightforward (run `seed_queue.py` more) but category balance is
currently driven by whatever arXiv returns.

### Why it matters

Cross-domain matches require, by definition, papers from multiple
domains. 10,000 papers from condensed matter won't produce cross-domain
matches — they'll produce within-physics matches that aren't the thing
we're looking for.

The project needs coverage across:
- **Physics:** cond-mat, hep-th, gr-qc, astro-ph, nlin, math-ph (have some)
- **Math:** DG, DS, AP, PR, CA, OC (have some but thin)
- **Biology:** q-bio, PMC-indexed biology papers (arXiv coverage is thin
  here; would need to pull from OpenAlex or PubMed)
- **Economics / finance:** econ.*, q-fin.* (have some)
- **CS theory:** cs.LG, cs.IT, cs.NE, cs.SY (have some)
- **Neuroscience, chemistry, climate, epidemiology:** currently zero.
  These are real sources of mathematical structure and genuine isomorphism
  candidates.

### The work

**1. Audit current coverage.** Easy: `SELECT domain, COUNT(*) FROM papers
GROUP BY domain`. Write the audit report into the project docs.

**2. Define a target distribution.** Not "10,000 papers" but "≥200 papers
in each of 30 structurally-diverse subcategories." The target list should
be explicit and in the repo.

**3. Extend ingestion beyond arXiv.** OpenAlex is the obvious second
source (250M works, concept-tagged, includes PubMed and non-preprint
venues). PMC has open-access biology papers with usable XML/LaTeX.
Semantic Scholar has its own API. Each source has its own quirks.

**Rough cost:** 3–5 days for an OpenAlex ingestion path. Longer for PMC
because the XML structure is different from arXiv LaTeX.

**Uncertainty:** medium. Ingestion is straightforward; making sure the
extractor works on non-arXiv LaTeX is where surprises live.

**4. Seeding strategy.** Instead of "fetch 100 most recent papers per
category," use a mix of: recent papers (for freshness), high-citation
papers (for canonical content), and papers tagged with math-heavy
concepts (via OpenAlex concept tags). This is curation logic in the seed
script.

**Rough cost:** 1–2 days.

**Uncertainty:** low. Design decisions, not unknowns.

### What this ceiling does NOT fix

Breadth alone doesn't produce discoveries. It creates the preconditions
for the matcher (items 1 + 2) to find them. If the matcher is blind to
the connection between a biology paper and a physics paper, it doesn't
matter how many of each we have.

---

## Item 4 — Moderator recruitment

**Current state:** zero moderators. The admin (chuckyatsuk) is the
only person with review privileges. The invite system is built but has
never been used.

### Why it matters

Tier 2+ promotion requires human judgment. The project's credibility
rests on the quality of this judgment. A single moderator (the admin)
reviewing every candidate is:
- Slow (bottleneck as corpus grows)
- Narrow (one person's domain expertise covers maybe 2–3 fields)
- Fragile (if the admin stops, the project stalls)

The target is **5–20 moderators with complementary domain expertise**:
roughly one physicist, one mathematician, one CS theorist, one biologist
or epidemiologist, one economist or finance person. Additional
moderators in those fields for redundancy and workload distribution.

### The work

This is a community-building problem, not a technical one. The moderator
infrastructure (invites, review UI, audit log, revocation) is already built.

**1. Write a moderator ask.** A short public page — or a private doc we
send to specific people — explaining:
- What the project is and what makes it credible
- What moderators actually do (triage Tier 1 candidates, promote with
  notes, reject with reasons)
- How much time it costs (~30 min/week realistically)
- What attribution they get (public contributor profile with role badge)
- Why their specific expertise is needed

**2. Identify the first 5 target moderators.** Specific people, by name,
with domain spread. Not a mailing list. The pitch is one-to-one.

**3. Send invites.** Use the existing invite system. First moderator
acceptance is the critical milestone — once one person is in and active,
recruiting further moderators becomes easier (they can vouch, they give
legitimacy to the ask).

**Rough cost:** this is weeks of calendar time, not days of work. The
hard part is finding the right people and making them care.

**Uncertainty:** very high. **This might not happen in any reasonable
timeframe.** It's gated on the admin's personal network and ability to
make a compelling pitch. The whole project's ability to produce
credible results rests on this step. Worth flagging that it's the
single most fragile part of the plan.

### The fallback if moderator recruitment fails

If after several months nobody has signed up as a moderator, the project
can still produce value in a narrower form: the admin does all the
moderation personally, the catalog (item 5) comes from one person's
review, and the project is clearly labeled as such — "curated by X, not
peer-reviewed." Less credible but still honest. Not the failure mode to
hope for.

---

## Item 5 — The catalog milestone

**Current state:** no published artifact. The project exists as a live
site with a handful of candidates.

### Why it matters

The end goal of the pipeline and moderation work is producing *findings*
that domain experts would actually read. Without a published artifact,
the project is forever in beta — always collecting, never delivering.

The specific milestone: **produce a public catalog of 30+ Tier 2 matches
with moderator notes explaining each connection**. Written up as a
single document (could be a paper, could be an HTML catalog, could be
both). Distributed to the relevant research communities.

### What needs to be true to hit this milestone

- Item 1 (canonicalizer) has made meaningful progress — parse rate >70%.
- Item 2 (match algorithm) is in place, even if just option D. Otherwise
  we don't have enough candidates to pick 30 good ones from.
- Item 3 (corpus breadth) covers at least 5 genuinely distinct domains
  with ≥200 papers each.
- Item 4 (moderators) — at least 3 active moderators with complementary
  expertise. One of them is willing to co-author the catalog.

### The work

**1. Write up each Tier 2 match as a catalog entry.** One paragraph per
match, explaining the mathematical form, the two papers, the notational
conventions in each, the structural insight, and any cross-field transfer
implications. Each entry has the moderator who promoted it listed as a
reviewer.

**2. Write the framing document.** Introduction explaining what the
project is and isn't, methodology section describing the pipeline and
human review, discussion section on limitations and false-positive modes,
references to the full moderation log for transparency.

**3. Distribute.** arXiv preprint in math.HO or a similar
interdisciplinary section. Email to a few specific researchers in each
covered domain. Blog posts. Hacker News when appropriate.

**Rough cost:** 1–2 weeks of focused writing, assuming the prerequisites
are in place. Most of the actual writing comes from the moderator notes
already captured in the DB.

**Uncertainty:** low on the writing. High on the reception — we have no
idea whether domain experts will find the catalog interesting, dismissive,
or wrong. The point of publishing is to find out.

### Why this milestone matters strategically

A catalog with 30 real matches is the evidence that makes the project
real. Before it, "cross-domain isomorphism finder" is a claim. After it,
it's a thing with documented findings that other researchers can cite,
extend, or refute. This is what flips the project from "interesting side
project" to "something that could matter."

---

## What this roadmap is NOT

- **Not a commitment to timelines.** Everything here is at some point on
  a spectrum from "could happen in a week" to "might never happen." Most
  of the uncertainty is in items 4 and 5, not in the engineering items
  1–3.
- **Not a list of every improvement worth making.** KaTeX rendering on
  `/discoveries`, GitHub Actions automation, BetterStack monitoring,
  activity feed polish — these are all real work but they don't remove
  ceilings. They belong in a maintenance backlog, not this roadmap.
- **Not a pitch deck.** This is for people who are already committed to
  the project. A contributor-facing version, when we write it, should
  project more confidence and less uncertainty. This version is allowed
  to say "we don't know if X works" because the readers can handle it.

---

## Open questions worth sitting with

**Is exact hash matching the right substrate at all?**

Items 1 and 2 both assume we stay on the "parse to SymPy, hash, match"
model. If item 2 turns out to require a fundamentally different approach
(graph isomorphism, embeddings, learned metrics), we should consider
whether the whole substrate is worth rebuilding around a different
primitive. This is not a decision for today, but it's worth having in
the back of our heads.

**What's the actual density of real cross-domain connections in
scientific literature?**

Nobody knows. The project is implicitly betting on "hundreds to thousands
in the full arXiv corpus," but that number could be 10x higher or 10x
lower than our intuition suggests. Hitting the catalog milestone with 30
real matches would be strong evidence one way or the other. Missing it
despite good engineering would be evidence the density is lower than
hoped.

**What's the right scale for "done"?**

The project could plausibly run at three different scales:
- A research tool used by 5 people producing one paper a year
- A public catalog of mathematical analogies, updated continuously,
  cited by researchers but not a community
- A crowdsourced platform with hundreds of contributors and thousands of
  verified matches

The current architecture supports all three. But the roadmap work
genuinely differs between them. If we're building for option 1, the
moderator recruitment problem is easier but the payoff is smaller. If
we're building for option 3, we need infrastructure we don't have yet
(forums, notifications, onboarding flows). **Worth deciding
consciously** rather than drifting.

---

## Review protocol for this document

Update this roadmap when:
- An item is substantially complete. Move it to a "Completed ceilings"
  section at the bottom with a note on what actually worked and what
  didn't.
- A ceiling is discovered that isn't listed here. Add it with the same
  format.
- A listed item turns out to be wrong (the fix doesn't work, or the
  problem wasn't a ceiling after all). Delete it with a note in the
  commit message explaining what changed.

The document is useful only if it stays honest. A roadmap that's lying
about the state of the project is worse than no roadmap.
