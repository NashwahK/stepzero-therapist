// src/pages/Workspace.tsx
//
// The focused live-session counterpart to PatientProfile, which stays
// the browse-anytime view. Workspace is launched deliberately via
// "Start session" — recap first, trace available but collapsed (not the
// focus), timeline for context, notes panel persistent throughout.

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, List, Clock, Hash, Check } from 'lucide-react';
import { fetchSessionList, fetchSessionDetail, fetchNote, saveNote } from '../api/dashboard';
import type { SessionSummary, TraceEntry } from '../api/dashboard';
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

export interface NotesPanelHandle {
  flush: () => Promise<void>;
}

const NotesPanel = forwardRef<NotesPanelHandle, { userId: string }>(function NotesPanel({ userId }, ref) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    fetchNote(userId).then(n => { setText(n.note_text); loaded.current = true; });
  }, [userId]);

  const persist = (value: string) => {
    if (!loaded.current) return;
    setStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await saveNote(userId, { note_text: value });
      setStatus('saved');
    }, 800);
  };

  const handleChange = (value: string) => {
    setText(value);
    persist(value);
  };

  // Force an immediate save, bypassing the debounce -- used by "End
  // session" so notes are guaranteed flushed before navigating away.
  const flush = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await saveNote(userId, { note_text: text });
    setStatus('saved');
  };

  useImperativeHandle(ref, () => ({ flush }));

  // Typing "- " and pressing Enter continues the bullet on the next
  // line; an empty bullet line + Enter ends the list, same behaviour
  // as most plain-text note apps.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    const el = e.currentTarget;
    const cursor = el.selectionStart;
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    const currentLine = text.slice(lineStart, cursor);
    const bulletMatch = currentLine.match(/^(\s*)-\s(.*)$/);
    if (!bulletMatch) return;
    e.preventDefault();
    const [, indent, rest] = bulletMatch;
    let newValue: string;
    let newPos: number;
    if (rest.trim() === '') {
      newValue = text.slice(0, lineStart) + text.slice(cursor);
      newPos = lineStart;
    } else {
      const insertion = `\n${indent}- `;
      newValue = text.slice(0, cursor) + insertion + text.slice(cursor);
      newPos = cursor + insertion.length;
    }
    handleChange(newValue);
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
  };

  const insertAtCursor = (insertion: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const full = `${needsNewline ? '\n' : ''}${insertion}`;
    const newValue = before + full + text.slice(cursor);
    handleChange(newValue);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + full.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const insertTimestamp = () => {
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    insertAtCursor(`${time} — `);
  };

  return (
    <div className="w-72 shrink-0 sticky top-10 self-start bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-[0_4px_24px_rgba(20,40,45,0.08)] h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Notes</h3>
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium transition-opacity ${status === 'idle' ? 'opacity-0' : 'opacity-100'} ${status === 'saved' ? 'text-teal' : 'text-ink-faint'}`}>
          {status === 'saving' ? (
            <span className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-pulse" />
          ) : (
            <Check size={12} strokeWidth={2.5} />
          )}
          {status === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-3 pb-3 border-b border-ink/[0.06]">
        <button
          type="button"
          onClick={() => insertAtCursor('- ')}
          title="Insert bullet"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-subtle transition-colors"
        >
          <List size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={insertTimestamp}
          title="Insert timestamp"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-subtle transition-colors"
        >
          <Clock size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('#')}
          title="Tag this note (e.g. #sleep, #avoidance) -- helps surface patterns later"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-subtle transition-colors"
        >
          <Hash size={14} strokeWidth={1.8} />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="jot anything down as it comes up — this saves as you type. type '- ' for a bullet list."
        className="flex-1 w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none leading-relaxed"
      />
    </div>
  );
});

export default function Workspace() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [traceOpen, setTraceOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const notesRef = useRef<NotesPanelHandle>(null);

  const { data: allSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessionList,
  });

  const patientSessions = (allSessions ?? [])
    .filter((s: SessionSummary) => s.user_id === userId)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  const latest = patientSessions[patientSessions.length - 1];
  const lastCompleted = [...patientSessions].reverse().find(s => s.status === 'completed');

  const { data: detail } = useQuery({
    queryKey: ['session-detail', lastCompleted?.session_id],
    queryFn: () => fetchSessionDetail(lastCompleted!.session_id),
    enabled: !!lastCompleted,
  });

  const patientLabel = latest?.patient_label ?? `Patient #${(userId ?? '').slice(0, 8)}`;
  const timelinePoints = patientSessions.map(s => ({
    session_id: s.session_id,
    date: s.started_at,
    top_condition_id: s.top_condition_id,
    confidence_score: s.top_confidence_score,
  }));

  const endSession = async () => {
    setEnding(true);
    await notesRef.current?.flush();
    navigate(`/patients/${userId}`);
  };

  if (sessionsLoading || !userId) {
    return <div className="text-sm text-ink-muted">Loading workspace…</div>;
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-7">
          <Link to={`/patients/${userId}`} className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
            ← Back
          </Link>
          <button
            onClick={endSession}
            disabled={ending}
            className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors shadow-[0_1px_2px_rgba(20,40,45,0.08)] disabled:opacity-60"
          >
            {ending ? 'Saving notes…' : 'End session'}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <NodeMark size={22} color="#2A9D8F" />
          <h1 className="text-xl font-semibold text-ink">{patientLabel}</h1>
        </div>

        {/* ── Recap ── */}
        <div className="bg-surface-subtle border border-surface-border rounded-2xl p-5 mb-6">
          {latest ? (
            <p className="text-sm text-ink-muted leading-relaxed">
              Last seen <span className="text-ink font-medium">{formatDate(latest.started_at)}</span>.
              {latest.top_condition_id && (
                <> Top pattern: <span className="text-ink font-medium">{CONDITION_LABELS[latest.top_condition_id] ?? latest.top_condition_id}</span>
                  {latest.top_confidence_score !== null && <> at {Math.round(latest.top_confidence_score * 100)}% confidence</>}.</>
              )}
              {' '}{patientSessions.length} session{patientSessions.length === 1 ? '' : 's'} total.
            </p>
          ) : (
            <p className="text-sm text-ink-faint">No prior sessions — this is a first check-in.</p>
          )}
        </div>

        {/* ── Timeline ── */}
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Progress timeline</h2>
        <div className="bg-white rounded-2xl border border-surface-border p-6 mb-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
          <NodeTimeline points={timelinePoints} />
        </div>

        {/* ── Collapsed transparency trace ── */}
        <button
          onClick={() => setTraceOpen(o => !o)}
          className="w-full flex items-center justify-between bg-white rounded-2xl border border-surface-border px-5 py-4 shadow-[0_1px_2px_rgba(20,40,45,0.04)]"
        >
          <span className="text-sm font-medium text-ink">Transparency trace</span>
          <ChevronDown size={16} className={`text-ink-faint transition-transform ${traceOpen ? 'rotate-180' : ''}`} />
        </button>

        {traceOpen && (
          <div className="bg-white rounded-2xl border border-surface-border mt-2 overflow-hidden shadow-[0_1px_2px_rgba(20,40,45,0.04)]">
            {!detail ? (
              <p className="text-sm text-ink-muted p-6 text-center">No completed session to trace yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle/60">
                    <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Question</th>
                    <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Response</th>
                    <th className="text-left text-xs font-medium text-ink-faint uppercase tracking-wide px-5 py-3">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.full_trace.map((entry: TraceEntry, i: number) => (
                    <tr key={i} className="border-b border-surface-border last:border-0">
                      <td className="px-5 py-3 text-sm text-ink max-w-xs">{entry.question_text}</td>
                      <td className="px-5 py-3 text-sm text-ink-muted italic max-w-xs">"{entry.raw_response}"</td>
                      <td className="px-5 py-3 text-sm text-ink-muted tabular-nums">
                        {entry.signal_contributed === 'None' ? '—' : entry.signal_contributed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <NotesPanel ref={notesRef} userId={userId} />
    </div>
  );
}