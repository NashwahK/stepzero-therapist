// src/pages/Settings.tsx
//
// Real editing, not a stub. Matches therapist_profiles' actual columns —
// license_number, specialisations, languages, accepts_new_clients —
// rather than fields that sound right but don't exist in the table.

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  getTherapistProfileDetail,
  updateTherapistProfile,
  signOut,
  type TherapistProfileDetail,
} from '../lib/supabase';

// ── Tag input — for specialisations and languages, both string arrays ────────
function TagInput({
  label, values, onChange, placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(values.filter(v => v !== tag));
  };

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-ink mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-medium"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="text-teal-dark/60 hover:text-teal-dark">
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        onBlur={addTag}
        placeholder={placeholder}
        className="w-full px-3.5 py-2 rounded-lg border border-surface-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal/25 focus:border-teal transition"
      />
      <p className="text-[11px] text-ink-faint mt-1.5">Press enter to add</p>
    </div>
  );
}

export default function SettingsPage() {
  const { therapist, refresh } = useAuth();
  const [detail, setDetail] = useState<TherapistProfileDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [draft, setDraft] = useState<{
    licenseNumber: string;
    specialisations: string[];
    languages: string[];
    acceptsNewClients: boolean;
  }>({ licenseNumber: '', specialisations: [], languages: [], acceptsNewClients: false });

  useEffect(() => {
    if (!therapist) return;
    load();
  }, [therapist]);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getTherapistProfileDetail(therapist!.id);
      setDetail(d);
      setDraft({
        licenseNumber: d?.licenseNumber ?? '',
        specialisations: d?.specialisations ?? [],
        languages: d?.languages ?? [],
        acceptsNewClients: d?.acceptsNewClients ?? false,
      });
    } catch (e: any) {
      setError(e.message ?? 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => { setError(null); setSuccess(false); setEditing(true); };

  const cancelEditing = () => {
    setDraft({
      licenseNumber: detail?.licenseNumber ?? '',
      specialisations: detail?.specialisations ?? [],
      languages: detail?.languages ?? [],
      acceptsNewClients: detail?.acceptsNewClients ?? false,
    });
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateTherapistProfile(therapist!.id, draft);
      await load();
      await refresh();
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink tracking-tight">Settings</h1>
          <p className="text-sm text-ink-muted mt-1">Your professional profile and account</p>
        </div>
        {!editing && !loading && (
          <button
            onClick={startEditing}
            className="text-sm font-medium text-teal hover:text-teal-dark transition-colors"
          >
            Edit profile
          </button>
        )}
      </div>

      {/* ── Account info — read-only, comes from auth not the editable table ── */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)] max-w-lg mb-5">
        <h3 className="text-sm font-semibold text-ink mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-ink-faint">Account type</span>
            <span className="text-sm text-ink capitalize">{therapist?.role ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Professional profile — editable ── */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-[0_1px_2px_rgba(20,40,45,0.04)] max-w-lg">
        <h3 className="text-sm font-semibold text-ink mb-5">Professional profile</h3>

        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : editing ? (
          <>
            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">License number</label>
              <input
                type="text"
                value={draft.licenseNumber}
                onChange={e => setDraft(d => ({ ...d, licenseNumber: e.target.value }))}
                placeholder="e.g. PSY-4821"
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal/25 focus:border-teal transition"
              />
            </div>

            <TagInput
              label="Specialisations"
              values={draft.specialisations}
              onChange={v => setDraft(d => ({ ...d, specialisations: v }))}
              placeholder="e.g. Anxiety disorders"
            />

            <TagInput
              label="Languages"
              values={draft.languages}
              onChange={v => setDraft(d => ({ ...d, languages: v }))}
              placeholder="e.g. English"
            />

            <label className="flex items-center gap-2.5 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.acceptsNewClients}
                onChange={e => setDraft(d => ({ ...d, acceptsNewClients: e.target.checked }))}
                className="w-4 h-4 rounded accent-teal"
              />
              <span className="text-sm text-ink">Currently accepting new clients</span>
            </label>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-coral-soft border border-coral/20 text-sm text-coral-deep">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal-dark transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-ink-faint mb-1">License number</p>
              <p className="text-sm text-ink">{detail?.licenseNumber || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Specialisations</p>
              {detail?.specialisations.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.specialisations.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-medium">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Not set</p>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Languages</p>
              {detail?.languages.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.languages.map(l => (
                    <span key={l} className="px-2.5 py-1 rounded-full bg-periwinkle/15 text-ink-muted text-xs font-medium">{l}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Not set</p>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1">Accepting new clients</p>
              <p className="text-sm text-ink">{detail?.acceptsNewClients ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </div>

      {success && (
        <p className="text-sm text-teal-dark mt-4 max-w-lg">Profile updated.</p>
      )}

      <button
        onClick={handleSignOut}
        className="text-sm text-ink-faint hover:text-coral-deep mt-8 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}