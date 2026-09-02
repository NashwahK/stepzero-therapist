// src/pages/PatientDetail.tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSessionDetail } from '../api/dashboard';
import type { ConditionScore, TraceEntry} from '../api/dashboard'

const CONFIDENCE_BAND_STYLES: Record<string, string> = {
  high:         'bg-teal text-white',
  medium:       'bg-periwinkle text-white',
  low:          'bg-surface-border text-ink-muted',
  insufficient: 'bg-surface-subtle text-ink-faint',
};

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ConditionCard({ condition }: { condition: ConditionScore }) {
  const pct = Math.round(condition.confidence_score * 100);
  const bandStyle = CONFIDENCE_BAND_STYLES[condition.confidence_band] ?? CONFIDENCE_BAND_STYLES.insufficient;

  return (
    <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-[0_1px_2px_rgba(20,40,45,0.04)] hover:shadow-[0_1px_2px_rgba(20,40,45,0.04),0_8px_20px_rgba(20,40,45,0.06)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-medium text-ink">{condition.condition_name}</h3>
          <p className="text-xs text-ink-faint mt-0.5">
            {condition.mandatory_criteria_met ? 'Mandatory criteria met' : 'Mandatory criteria not met'}
            {condition.temporal_validation_met !== null && (
              condition.temporal_validation_met ? ' · Duration confirmed' : ' · Duration not confirmed'
            )}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${bandStyle}`}>
          {condition.confidence_band}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-surface-border rounded-full overflow-hidden">
          <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-semibold text-ink tabular-nums w-11">{pct}%</span>
      </div>

      <div className="flex justify-between text-xs text-ink-faint mb-3">
        <span>Raw score: {condition.raw_score.toFixed(2)} / {condition.max_possible_score.toFixed(2)}</span>
      </div>

      {condition.criteria_signalled.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-surface-border">
          {condition.criteria_signalled.map(c => (
            <span
              key={c.criterion_id}
              className="px-2 py-1 rounded-md bg-surface-subtle text-xs text-ink-muted"
              title={`Signal: ${c.signal.toFixed(2)}`}
            >
              {c.criterion_id.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-surface-border p-12 text-center">
        <p className="text-sm text-ink-muted">Loading patient profile…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-coral-soft border border-coral/20 rounded-2xl p-6 text-coral-deep text-sm">
        Could not load this session: {(error as Error)?.message ?? 'Unknown error'}
      </div>
    );
  }

  const { report, full_trace } = data;
  const sortedConditions = [...report.conditions].sort(
    (a, b) => b.confidence_score - a.confidence_score
  );

  return (
    <div>
      <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-5 inline-flex items-center gap-1.5">
        ← Back to sessions
      </Link>

      <div className="mb-7">
        <h1 className="text-xl font-semibold text-ink">Patient #{data.user_identifier.slice(0, 8)}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {report.total_responses} responses · Generated {formatDateTime(report.generated_at)}
        </p>
      </div>

      {report.safety_triggered && report.safety_detail && (
        <div className="bg-coral-soft border border-coral/30 rounded-2xl p-5 mb-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-coral-deep" />
            <h3 className="text-sm font-semibold text-coral-deep">Safety protocol triggered</h3>
          </div>
          <p className="text-sm text-coral-deep/90">
            Triggered by: <span className="font-medium">{report.safety_detail.triggering_question ?? 'Unknown question'}</span>
          </p>
          {report.safety_detail.raw_response && (
            <p className="text-sm text-coral-deep/80 mt-1.5 italic">
              "{report.safety_detail.raw_response}"
            </p>
          )}
        </div>
      )}

      <div className="bg-surface-subtle border border-surface-border rounded-2xl p-4 mb-7">
        <p className="text-xs text-ink-faint leading-relaxed">{report.disclaimer}</p>
      </div>

      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">
        Confidence breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {sortedConditions.map(c => (
          <ConditionCard key={c.condition_id} condition={c} />
        ))}
      </div>

      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">
        Full transparency trace
      </h2>
      <p className="text-xs text-ink-faint mb-4">
        Every question asked and the signal it contributed, in order. Nothing is hidden from this view.
      </p>

      {full_trace.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-border p-8 text-center">
          <p className="text-sm text-ink-muted">No responses recorded for this session yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-[0_1px_2px_rgba(20,40,45,0.04),0_8px_24px_rgba(20,40,45,0.05)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-subtle/60">
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">#</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Question</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Clinical intent</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Raw response</th>
                <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {full_trace.map((entry: TraceEntry, i: number) => (
                <tr key={i} className="border-b border-surface-border last:border-0 align-top">
                  <td className="px-5 py-3.5 text-xs text-ink-faint tabular-nums">{i + 1}</td>
                  <td className="px-5 py-3.5 text-sm text-ink max-w-xs">{entry.question_text}</td>
                  <td className="px-5 py-3.5 text-xs text-ink-muted max-w-[140px]">{entry.clinical_intent}</td>
                  <td className="px-5 py-3.5 text-sm text-ink-muted max-w-xs italic">"{entry.raw_response}"</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-ink-muted tabular-nums">
                    {entry.signal_contributed === 'None' ? '—' : entry.signal_contributed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}