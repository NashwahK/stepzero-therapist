// src/pages/SessionList.tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchSessionList } from '../api/dashboard';
import type { SessionSummary } from '../api/dashboard'
import NodeMark from '../components/NodeMark';

const CONDITION_LABELS: Record<string, string> = {
  mdd: 'Major Depressive Disorder',
  gad: 'Generalised Anxiety',
  sad: 'Social Anxiety',
  ocd: 'OCD',
};

function StatusBadge({ status, safetyFlagged }: { status: string; safetyFlagged: boolean }) {
  if (safetyFlagged) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-soft text-coral-deep text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-coral-deep" />
        Safety flagged
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-medium">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-periwinkle/15 text-ink-muted text-xs font-medium">
      In progress
    </span>
  );
}

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-ink-faint text-sm">—</span>;
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2.5 w-32">
      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className="h-full bg-teal rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-ink-muted tabular-nums w-9">{pct}%</span>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionList() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessionList,
  });

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink tracking-tight">Patient sessions</h1>
          <p className="text-sm text-ink-muted mt-1">
            {data ? `${data.length} session${data.length === 1 ? '' : 's'} on record` : 'Loading sessions…'}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl border border-surface-border p-16 text-center shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
          <p className="text-sm text-ink-muted">Loading sessions…</p>
        </div>
      )}

      {error && (
        <div className="bg-coral-soft border border-coral/20 rounded-2xl p-6 text-coral-deep text-sm">
          Could not load sessions: {(error as Error).message}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="bg-white rounded-2xl border border-surface-border p-16 text-center shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-subtle mb-4">
            <NodeMark size={28} color="#94A8AB" />
          </div>
          <p className="text-sm font-medium text-ink mb-1">No sessions yet</p>
          <p className="text-sm text-ink-faint">Patient sessions will appear here once people start using the app.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-[0_1px_2px_rgba(20,40,45,0.04),0_8px_24px_rgba(20,40,45,0.05)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-subtle/60">
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Patient</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Started</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Status</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Top pattern</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Confidence</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-6 py-3.5">Questions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((session: SessionSummary) => (
                <tr
                  key={session.session_id}
                  onClick={() => navigate(`/sessions/${session.session_id}`)}
                  className="border-b border-surface-border last:border-0 hover:bg-teal/[0.03] cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 text-sm font-medium text-ink group-hover:text-teal-dark transition-colors">{session.patient_label}</td>
                  <td className="px-6 py-4 text-sm text-ink-muted">{formatDate(session.started_at)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={session.status} safetyFlagged={session.safety_flagged} />
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted">
                    {session.top_condition_id
                      ? CONDITION_LABELS[session.top_condition_id] ?? session.top_condition_id
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <ConfidenceBar score={session.top_confidence_score} />
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted tabular-nums">{session.question_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}