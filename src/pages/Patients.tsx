// src/pages/Patients.tsx
//
// Aggregate view across all patients. Mock data for now — real
// aggregate-query endpoints come later. The visual language deliberately
// avoids generic bar/pie/radar: a flowing band chart for condition
// distribution, a activity grid instead of a line chart, and a
// ridgeline-style confidence spread instead of a bar chart.

import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchSessionList } from '../api/dashboard';
import type { SessionSummary } from '../api/dashboard';

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_STATS = {
  totalPatients: 47,
  activeThisWeek: 12,
  safetyFlags: 2,
};

const MOCK_CONDITION_DISTRIBUTION = [
  { id: 'gad', label: 'Generalised Anxiety', value: 34, color: '#2A9D8F' },
  { id: 'mdd', label: 'Major Depressive', value: 26, color: '#7B9FD4' },
  { id: 'sad', label: 'Social Anxiety', value: 21, color: '#FF8F6B' },
  { id: 'ocd', label: 'OCD', value: 12, color: '#C9E6EE' },
  { id: 'none', label: 'No clear pattern', value: 7, color: '#E7EEF0' },
];

// 7 days of mock activity for the "active this week" sparkline
const MOCK_WEEK_ACTIVITY = [3, 5, 2, 7, 4, 6, 1];

// 12 weeks of mock session activity, values 0-4 representing intensity
const MOCK_ACTIVITY: number[] = [
  1, 2, 0, 3, 4, 2, 1, 0, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0,
  2, 3, 4, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 3, 4, 4, 3, 1, 0, 2, 3, 2,
  1, 0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 2, 3, 4,
];

const MOCK_CONFIDENCE_SPREAD = [
  { band: 'High', count: 14 },
  { band: 'Medium', count: 19 },
  { band: 'Low', count: 9 },
  { band: 'Insufficient', count: 5 },
];

// ── Flowing band chart for condition distribution ─────────────────────────────
function ConditionStream() {
  const total = MOCK_CONDITION_DISTRIBUTION.reduce((s, c) => s + c.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <h3 className="text-sm font-semibold text-ink mb-1">Condition distribution</h3>
      <p className="text-xs text-ink-faint mb-5">Top pattern across all completed sessions</p>

      {/* The stream — a single rounded bar made of proportional segments */}
      <div className="flex h-10 rounded-xl overflow-hidden mb-4">
        {MOCK_CONDITION_DISTRIBUTION.map(c => (
          <div
            key={c.id}
            style={{ width: `${(c.value / total) * 100}%`, backgroundColor: c.color }}
            className="h-full transition-all hover:opacity-80"
            title={`${c.label}: ${c.value}%`}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        {MOCK_CONDITION_DISTRIBUTION.map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-sm text-ink-muted flex-1">{c.label}</span>
            <span className="text-sm font-medium text-ink tabular-nums">{c.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity grid — like a contribution graph, not a line chart ──────────────
function ActivityGrid() {
  const intensityColor = (v: number) => {
    const colors = ['#F0F4F5', '#C9E6EE', '#A8CEDE', '#7B9FD4', '#2A9D8F'];
    return colors[v] ?? colors[0];
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-ink">Session activity</h3>
        <div className="flex items-center gap-1.5 text-xs text-ink-faint">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(v => (
            <span key={v} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: intensityColor(v) }} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="text-xs text-ink-faint mb-5">Past 12 weeks, by day</p>

      <div className="grid grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
        {MOCK_ACTIVITY.map((v, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125"
            style={{ backgroundColor: intensityColor(v) }}
            title={`${v} sessions`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Confidence spread — ridgeline-ish horizontal bands, not vertical bars ────
function ConfidenceSpread() {
  const max = Math.max(...MOCK_CONFIDENCE_SPREAD.map(c => c.count));
  const bandColors: Record<string, string> = {
    High: '#2A9D8F',
    Medium: '#7B9FD4',
    Low: '#C9E6EE',
    Insufficient: '#E7EEF0',
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <h3 className="text-sm font-semibold text-ink mb-1">Confidence spread</h3>
      <p className="text-xs text-ink-faint mb-5">How certain the engine was, across all sessions</p>

      <div className="space-y-3.5">
        {MOCK_CONFIDENCE_SPREAD.map(c => (
          <div key={c.band} className="flex items-center gap-3">
            <span className="text-xs text-ink-muted w-20 shrink-0">{c.band}</span>
            <div className="flex-1 h-7 bg-surface-subtle rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all flex items-center justify-end pr-2.5"
                style={{ width: `${(c.count / max) * 100}%`, backgroundColor: bandColors[c.band] }}
              >
                <span className="text-xs font-medium text-white">{c.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top stat tiles ─────────────────────────────────────────────────────────────
// ── Total patients — a tiny cluster of overlapping avatar dots, ──────────────
// echoing the constellation motif instead of a flat icon badge.
function PatientCountCard({ count }: { count: number }) {
  const dots = [
    { x: 14, y: 18, r: 7, color: '#2A9D8F' },
    { x: 26, y: 14, r: 8, color: '#7B9FD4' },
    { x: 22, y: 28, r: 6, color: '#FF8F6B' },
    { x: 34, y: 26, r: 5.5, color: '#6FD9C4' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-ink-faint">Total patients</p>
        <svg width="44" height="40" viewBox="0 0 44 40" className="opacity-90">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} fillOpacity={0.85} />
          ))}
        </svg>
      </div>
      <p className="text-[26px] font-semibold text-ink tabular-nums leading-none">{count}</p>
    </div>
  );
}

// ── Active this week — a 7-bar sparkline so the number sits inside ──────────
// a glance-able shape of the week, not a flat figure beside an icon.
function ActiveWeekCard({ data, total }: { data: number[]; total: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-ink-faint">Active this week</p>
        <div className="flex items-end gap-[3px] h-8">
          {data.map((v, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-periwinkle"
              style={{ height: `${Math.max(15, (v / max) * 100)}%`, opacity: 0.5 + (v / max) * 0.5 }}
            />
          ))}
        </div>
      </div>
      <p className="text-[26px] font-semibold text-ink tabular-nums leading-none">{total}</p>
    </div>
  );
}

// ── Safety flags — deliberately reads as different in kind, not just ────────
// colour. A soft pulse and a different shape (no card-twin pattern with
// the other two) signal this deserves separate attention at a glance.
function SafetyFlagCard({ count }: { count: number }) {
  const hasFlags = count > 0;
  return (
    <div
      className={`rounded-2xl p-5 shadow-[0_1px_2px_rgba(20,40,45,0.04)] ${
        hasFlags ? 'bg-coral-soft border border-coral/25' : 'bg-white border border-surface-border'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium ${hasFlags ? 'text-coral-deep' : 'text-ink-faint'}`}>Safety flags</p>
        {hasFlags ? (
          <span className="relative flex items-center justify-center w-7 h-7">
            <span className="absolute inline-flex w-full h-full rounded-full bg-coral/30 animate-ping" />
            <AlertTriangle size={16} strokeWidth={2} className="relative text-coral-deep" />
          </span>
        ) : (
          <AlertTriangle size={16} strokeWidth={1.8} className="text-ink-faint" />
        )}
      </div>
      <p className={`text-[26px] font-semibold tabular-nums leading-none ${hasFlags ? 'text-coral-deep' : 'text-ink'}`}>
        {count}
      </p>
      {hasFlags && (
        <p className="text-[11px] text-coral-deep/70 mt-1.5">Needs review</p>
      )}
    </div>
  );
}

export default function Patients() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['sessions'], queryFn: fetchSessionList });

  // Group the real session log into one row per patient -- Patients.tsx
  // otherwise had no way to actually reach a patient at all before this.
  const byPatient = new Map<string, { label: string; sessionCount: number; lastSeen: string; flagged: boolean }>();
  (data ?? []).forEach((s: SessionSummary) => {
    const existing = byPatient.get(s.user_id);
    if (!existing || new Date(s.started_at) > new Date(existing.lastSeen)) {
      byPatient.set(s.user_id, {
        label: s.patient_label,
        sessionCount: (existing?.sessionCount ?? 0) + 1,
        lastSeen: s.started_at,
        flagged: (existing?.flagged ?? false) || s.safety_flagged,
      });
    } else {
      byPatient.set(s.user_id, { ...existing, sessionCount: existing.sessionCount + 1 });
    }
  });
  const patientRows = Array.from(byPatient.entries()).sort(
    (a, b) => new Date(b[1].lastSeen).getTime() - new Date(a[1].lastSeen).getTime()
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">Patients</h1>
        <p className="text-sm text-ink-muted mt-1">Aggregate view across your caseload</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <PatientCountCard count={MOCK_STATS.totalPatients} />
        <ActiveWeekCard data={MOCK_WEEK_ACTIVITY} total={MOCK_STATS.activeThisWeek} />
        <SafetyFlagCard count={MOCK_STATS.safetyFlags} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ConditionStream />
        <ConfidenceSpread />
      </div>

      <ActivityGrid />

      <p className="text-xs text-ink-faint text-center mt-6 mb-8">
        The charts above use placeholder data. Live aggregate queries connect once patient volume supports it.
      </p>

      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Your patients</h2>
      {patientRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-border p-12 text-center">
          <p className="text-sm text-ink-muted">No patients yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
          {patientRows.map(([userId, p], i) => (
            <button
              key={userId}
              onClick={() => navigate(`/patients/${userId}`)}
              className={`w-full flex items-center justify-between px-6 py-4 text-left hover:bg-teal/[0.03] transition-colors ${i < patientRows.length - 1 ? 'border-b border-surface-border' : ''}`}
            >
              <span className="text-sm font-medium text-ink">{p.label}</span>
              <span className="text-sm text-ink-muted">{p.sessionCount} session{p.sessionCount === 1 ? '' : 's'}</span>
              {p.flagged && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-soft text-coral-deep text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-coral-deep" /> Flagged
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}