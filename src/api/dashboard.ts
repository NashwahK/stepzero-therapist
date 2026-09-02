// src/api/dashboard.ts
// All communication with the FastAPI backend's dashboard router.
// Types here match app/models/schemas.py and app/engine/inference.py
// exactly — SessionReport, ConditionScore, CriterionSignal field names
// are not invented, they're copied from the real backend dataclasses.

import { getAccessToken } from '../lib/supabase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8000/api/v1';

async function getHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function get<T>(path: string): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Therapist notes (Workspace persistent notes panel) ─────────────────────────
// Plain free-text storage for now -- calibrating notes into pattern history
// is real future work, not needed for the demo.

export interface TherapistNote {
  patient_user_id: string;
  note_text: string;
  quick_recap: string;
  tags: string[];
  updated_at: string;
}

export async function fetchNote(patientUserId: string): Promise<TherapistNote> {
  return get<TherapistNote>(`/notes/${patientUserId}`);
}

// Both fields optional -- only send what changed. The backend merges
// against the existing row, so updating quick_recap alone never wipes
// the full session notes, and vice versa.
export async function saveNote(
  patientUserId: string,
  fields: { note_text?: string; quick_recap?: string }
): Promise<TherapistNote> {
  return put<TherapistNote>(`/notes/${patientUserId}`, fields);
}

// ── Session list ──────────────────────────────────────────────────────────────
// Matches SessionSummaryOut in app/routers/dashboard.py

export interface SessionSummary {
  session_id: string;
  user_id: string;
  patient_label: string;
  status: 'in_progress' | 'completed' | 'safety_flagged';
  started_at: string;
  completed_at: string | null;
  question_count: number;
  top_condition_id: string | null;
  top_confidence_score: number | null;
  safety_flagged: boolean;
}

export async function fetchSessionList(): Promise<SessionSummary[]> {
  return get<SessionSummary[]>('/dashboard/sessions');
}

// ── Per-session detail ─────────────────────────────────────────────────────────
// Matches PatientProfileResponse + SessionReport + ConditionScore exactly
// as defined in app/models/schemas.py and app/engine/inference.py

export interface CriterionSignal {
  criterion_id: string;
  signal: number;
}

export interface ConditionScore {
  condition_id: string;
  condition_name: string;
  raw_score: number;
  max_possible_score: number;
  confidence_score: number;
  confidence_band: string;
  criteria_signalled: CriterionSignal[];
  mandatory_criteria_met: boolean;
  temporal_validation_met: boolean | null;
}

export interface SafetyResult {
  triggered: boolean;
  triggering_question: string | null;
  raw_response: string | null;
}

export interface SessionReport {
  safety_triggered: boolean;
  safety_detail: SafetyResult | null;
  conditions: ConditionScore[];
  top_condition: ConditionScore | null;
  total_responses: number;
  generated_at: string;
  disclaimer: string;
}

export interface TraceEntry {
  question_text: string;
  clinical_intent: string;
  raw_response: string;
  signal_contributed: string;
  timestamp: string;
}

export interface PatientProfileResponse {
  session_id: string;
  user_identifier: string;
  report: SessionReport;
  full_trace: TraceEntry[];
}

export async function fetchSessionDetail(sessionId: string): Promise<PatientProfileResponse> {
  return get<PatientProfileResponse>(`/dashboard/sessions/${sessionId}`);
}