// src/pages/PatientProfile.tsx
//
// The always-available, browse-anytime view of one patient — separate
// from Workspace, which is the focused live-session mode. This page
// stays put; Workspace is a distinct action launched from here.

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSessionList, fetchNote, saveNote } from '../api/dashboard';
import type { SessionSummary } from '../api/dashboard';
import NodeTimeline from '../components/NodeTimeline';
import NodeMark from '../components/NodeMark';

const CONDITION_LABELS: Record<string, string> = {
  mdd: 'Major Depressive Disorder',
  gad: 'Generalised Anxiety',
  sad: 'Social Anxiety',
  ocd: 'OCD',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function QuickRecapCard({ userId }: { userId: string }) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loaded = useRef(false);

  useEffect(() => {
    fetchNote(userId).then(n => {
      setText(n.quick_recap);
      setTags(n.tags);
      loaded.current = true;
    });
  }, [userId]);

  const save = async (value: string) => {
    setStatus('saving');
    const updated = await saveNote(userId, { quick_recap: value });
    setTags(updated.tags);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1200);
  };

  return (
    <div className="bg-white border border-surface-border rounded-2xl p-5 mb-7 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Your quick recap</h3>
        <span className="text-[11px] text-ink-faint">
          {status === 'saving' ? 'saving…' : status === 'saved' ? 'saved' : ''}
        </span>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => loaded.current && save(text)}
        placeholder="a line or two to jog your memory before the next follow-up — separate from full session notes."
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none leading-relaxed"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-surface-border">
          {tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-medium">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessionList,
  });

  const patientSessions = (data ?? [])
    .filter((s: SessionSummary) => s.user_id === userId)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  const latest = patientSessions[patientSessions.length - 1];
  const patientLabel = latest?.patient_label ?? `Patient #${(userId ?? '').slice(0, 8)}`;
  const flaggedCount = patientSessions.filter(s => s.safety_flagged).length;

  const timelinePoints = patientSessions.map(s => ({
    session_id: s.session_id,
    date: s.started_at,
    top_condition_id: s.top_condition_id,
    confidence_score: s.top_confidence_score,
  }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-surface-border p-12 text-center">
        <p className="text-sm text-ink-muted">Loading patient…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-coral-soft border border-coral/20 rounded-2xl p-6 text-coral-deep text-sm">
        Could not load this patient: {(error as Error).message}
      </div>
    );
  }

  return (
    <div>
      <Link to="/patients" className="text-sm text-ink-muted hover:text-ink mb-5 inline-flex items-center gap-1.5">
        ← Back to patients
      </Link>

      {/* ── Header + Start Session ── */}
      <div className="flex items-start justify-between mb-7">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center">
            <NodeMark size={26} color="#5C7478" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">{patientLabel}</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {patientSessions.length} session{patientSessions.length === 1 ? '' : 's'} on record
              {flaggedCount > 0 && <span className="text-coral-deep"> · {flaggedCount} safety flag{flaggedCount === 1 ? '' : 's'}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/workspace/${userId}`)}
          className="px-5 py-2.5 rounded-xl bg-teal text-white text-sm font-medium hover:bg-teal-dark transition-colors shadow-[0_1px_2px_rgba(20,40,45,0.08)]"
        >
          Start session
        </button>
      </div>

      {/* ── Recap ── */}
      <div className="bg-surface-subtle border border-surface-border rounded-2xl p-5 mb-7">
        {latest ? (
          <p className="text-sm text-ink-muted leading-relaxed">
            Last seen <span className="text-ink font-medium">{formatDate(latest.started_at)}</span>.
            {latest.top_condition_id && (
              <> Top pattern has been <span className="text-ink font-medium">{CONDITION_LABELS[latest.top_condition_id] ?? latest.top_condition_id}</span>
                {latest.top_confidence_score !== null && <> at {Math.round(latest.top_confidence_score * 100)}% confidence</>}.</>
            )}
          </p>
        ) : (
          <p className="text-sm text-ink-faint">No sessions recorded yet.</p>
        )}
      </div>

      {/* ── Quick recap — therapist-written, separate from Workspace's
          full session notes. Also surfaces tags extracted from those
          notes, giving a visible (not yet ML) foothold toward pattern
          calibration. ── */}
      <QuickRecapCard userId={userId!} />

      {/* ── Timeline ── */}
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Progress over time</h2>
      <div className="bg-white rounded-2xl border border-surface-border p-6 mb-8 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
        <NodeTimeline points={timelinePoints} onSelect={(id) => navigate(`/sessions/${id}`)} />
      </div>

      {/* ── Session history ── */}
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Session history</h2>
      {patientSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-border p-8 text-center">
          <p className="text-sm text-ink-muted">Nothing here yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
          {[...patientSessions].reverse().map((s, i, arr) => (
            <Link
              key={s.session_id}
              to={`/sessions/${s.session_id}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-teal/[0.03] transition-colors ${i < arr.length - 1 ? 'border-b border-surface-border' : ''}`}
            >
              <span className="text-sm text-ink-muted">{formatDate(s.started_at)}</span>
              <span className="text-sm text-ink-muted">
                {s.top_condition_id ? CONDITION_LABELS[s.top_condition_id] ?? s.top_condition_id : '—'}
              </span>
              <span className="text-sm font-medium text-ink tabular-nums">
                {s.top_confidence_score !== null ? `${Math.round(s.top_confidence_score * 100)}%` : '—'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}