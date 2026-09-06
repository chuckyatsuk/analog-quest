import Link from 'next/link';

export const metadata = {
  title: 'Moderation policy',
  description:
    'How Analog Quest verifies cross-domain mathematical matches — tiers, review process, appeals.',
};

export default function ModerationPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="mb-6">Moderation policy</h1>

      <p className="text-lg mb-6 leading-relaxed">
        This page explains what the verification badges on Analog Quest mean,
        how moderators are chosen, and how to challenge a decision.
      </p>

      <p className="text-lg mb-10 leading-relaxed">
        The project has <em>no scientific advisory board</em>. The badges here
        do not carry institutional authority. What they do carry is a
        transparent record of who reviewed each match, when, and why.
      </p>

      <section className="border-t border-black/10 pt-10 mb-10">
        <h2 className="mb-4">Tiers</h2>
        <p className="mb-4 text-black/70">
          Every programmatic match starts at Tier 1. Moderators can promote a
          match to a higher tier only with a written justification, which
          becomes part of the public moderation log.
        </p>
        <dl className="space-y-4">
          <div>
            <dt className="font-mono text-sm font-semibold">Tier 1 · syntactic</dt>
            <dd className="text-sm text-black/70 mt-1">
              Two equations from different domains normalize to the same
              canonical symbolic form. The match is a structural coincidence
              that may or may not reflect deeper mathematical equivalence.
              Tier 1 is the pipeline&apos;s default output. It is a candidate,
              not a claim.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-sm font-semibold">Tier 2 · structural</dt>
            <dd className="text-sm text-black/70 mt-1">
              A moderator has confirmed that the shared canonical form
              reflects the same mathematical structure in both source
              contexts (same order of differential equation, same variational
              setup, same geometry). Requires a written note explaining the
              structural correspondence.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-sm font-semibold">Tier 3 · transferable</dt>
            <dd className="text-sm text-black/70 mt-1">
              A moderator has argued that theory or methods could plausibly
              transfer between the two domains based on this structural
              equivalence. Requires a written note identifying which
              techniques could be borrowed and in which direction.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-sm font-semibold">Tier 4 · validated</dt>
            <dd className="text-sm text-black/70 mt-1">
              A domain expert outside the project has confirmed the match as
              a substantive cross-domain hypothesis. Reserved. Currently
              empty.
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-black/10 pt-10 mb-10">
        <h2 className="mb-4">Rejection reasons</h2>
        <p className="mb-4 text-black/70">
          A moderator rejecting a match must choose one of these reasons.
          Rejected matches stay in the database for the audit trail but are
          hidden from <Link href="/discoveries">/discoveries</Link>.
        </p>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-mono">not_cross_domain</dt>
            <dd className="text-black/70">
              Both papers are in the same field — not a cross-domain match.
            </dd>
          </div>
          <div>
            <dt className="font-mono">parser_error</dt>
            <dd className="text-black/70">
              SymPy mis-parsed one or both equations; the match is an
              artifact of the canonicalizer, not the mathematics.
            </dd>
          </div>
          <div>
            <dt className="font-mono">superficial_match</dt>
            <dd className="text-black/70">
              The canonical forms match but the equations mean different
              things in their respective domains.
            </dd>
          </div>
          <div>
            <dt className="font-mono">trivial_form</dt>
            <dd className="text-black/70">
              The shared form is too generic to be a meaningful connection
              (e.g. &ldquo;<code>F = ma</code>&rdquo;, &ldquo;<code>y = mx + b</code>&rdquo;).
            </dd>
          </div>
          <div>
            <dt className="font-mono">standard_canonical_object</dt>
            <dd className="text-black/70">
              A specific textbook object appearing in many papers — the
              round metric on a 2-sphere, the Pythagorean theorem, the SGD
              update rule, the heat equation. Rejecting with this reason
              adds the canonical form&apos;s hash to a trivia list, so future
              matches on the same form are never generated. The system
              gets smarter as moderators teach it.
            </dd>
          </div>
          <div>
            <dt className="font-mono">duplicate</dt>
            <dd className="text-black/70">
              The same match already exists under a different match ID.
            </dd>
          </div>
          <div>
            <dt className="font-mono">other</dt>
            <dd className="text-black/70">
              See the moderator&apos;s note. Used sparingly.
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-black/10 pt-10 mb-10">
        <h2 className="mb-4">How moderators are chosen</h2>
        <p className="mb-4 text-black/70">
          Moderators are invited by the project admin. There is no
          application form. Invitations are single-use tokens sent
          privately; anyone with a GitHub account can redeem one and become
          a moderator for the project.
        </p>
        <p className="mb-4 text-black/70">
          A moderator can promote a match to Tier 2, 3, or 4 (with note),
          reject a match (with reason), or skip. Moderators cannot create
          further moderators — only the admin can, to prevent rogue
          self-replication.
        </p>
        <p className="text-black/70">
          Any moderator action can be reversed by another moderator or by
          the admin. Every action is recorded in an append-only moderation
          log for accountability.
        </p>
      </section>

      <section className="border-t border-black/10 pt-10 mb-10">
        <h2 className="mb-4">Challenging a decision</h2>
        <p className="mb-4 text-black/70">
          Disagreement with a moderation decision is welcome and expected.
          Open an issue at{' '}
          <a
            href="https://github.com/chuckyatsuk/analog-quest/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/chuckyatsuk/analog-quest
          </a>{' '}
          and reference the match ID. Include:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-black/70">
          <li>Which match you&apos;re challenging and what the current tier is</li>
          <li>What tier you believe it should be, and why</li>
          <li>
            If relevant, a short argument about the mathematical structure
            that the original moderator may have missed
          </li>
        </ul>
      </section>

      <section className="border-t border-black/10 pt-10">
        <h2 className="mb-4">Honest limitations</h2>
        <p className="mb-4 text-black/70">
          A few things we want readers to know up front:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-black/70">
          <li>
            Most Tier 1 matches will never be promoted. The pipeline is
            tuned to recall over precision; human review is the precision
            layer.
          </li>
          <li>
            The 2026 LaTeX canonicalizer cannot expand user-defined macros,
            handle all tensor index conventions, or recognize every
            mathematical operator. Some real cross-domain matches will be
            missed for notational reasons that have nothing to do with
            their scientific content.
          </li>
          <li>
            A Tier 2 or Tier 3 badge means a moderator read the equations
            and believed the connection was structural. It does not mean a
            domain expert in either field has endorsed the connection. Tier
            4 is the tier for that, and Tier 4 is currently empty.
          </li>
          <li>
            The moderation log is append-only but not immutable in the
            cryptographic sense — the project admin has the DB credentials
            and could edit it. The audit trail is as trustworthy as the
            admin.
          </li>
        </ul>
      </section>
    </div>
  );
}
