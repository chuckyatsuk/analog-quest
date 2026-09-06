import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/queue/status
// Public stats covering both tiers of the system:
//   1. Programmatic LaTeX + SymPy pipeline (papers/equations/equation_matches)
//   2. Volunteer agent queue (queue/isomorphisms/contributors)
export async function GET() {
  const [
    queueStats,
    isomorphismStats,
    contributorStats,
    paperStats,
    equationStats,
    matchStats,
  ] = await Promise.all([
    query<{ status: string; count: string }>(`
      SELECT status, COUNT(*) as count FROM queue GROUP BY status
    `),
    query<{ status: string; count: string; equation_class: string }>(`
      SELECT status, equation_class, COUNT(*) as count
      FROM isomorphisms
      GROUP BY status, equation_class
      ORDER BY count DESC
    `),
    query<{ total: string; active_today: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours') as active_today
      FROM contributors
    `),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM papers`),
    query<{ total: string; parsed: string }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sympy_parsed = TRUE) as parsed
      FROM equations
      WHERE latex != ''
    `),
    query<{ count: string }>(`
      SELECT COUNT(*) as count FROM equation_matches WHERE status != 'rejected'
    `),
  ]);

  const queue: Record<string, number> = {};
  for (const row of queueStats.rows) {
    queue[row.status] = parseInt(row.count);
  }

  const totalEquations = parseInt(equationStats.rows[0]?.total ?? '0');
  const parsedEquations = parseInt(equationStats.rows[0]?.parsed ?? '0');

  return NextResponse.json({
    papers: {
      total: parseInt(paperStats.rows[0]?.count ?? '0'),
    },
    equations: {
      total: totalEquations,
      parsed: parsedEquations,
    },
    matches: {
      total: parseInt(matchStats.rows[0]?.count ?? '0'),
    },
    queue: {
      pending: queue.pending ?? 0,
      in_progress: queue.checked_out ?? 0,
      done: queue.done ?? 0,
      total: Object.values(queue).reduce((a, b) => a + b, 0),
    },
    isomorphisms: {
      candidates: isomorphismStats.rows.filter(r => r.status === 'candidate').length,
      verified: isomorphismStats.rows
        .filter(r => r.status === 'verified')
        .reduce((a, r) => a + parseInt(r.count), 0),
      by_class: isomorphismStats.rows.reduce((acc, r) => {
        if (!acc[r.equation_class]) acc[r.equation_class] = 0;
        acc[r.equation_class] += parseInt(r.count);
        return acc;
      }, {} as Record<string, number>),
    },
    contributors: {
      total: parseInt(contributorStats.rows[0]?.total ?? '0'),
      active_today: parseInt(contributorStats.rows[0]?.active_today ?? '0'),
    },
  });
}
