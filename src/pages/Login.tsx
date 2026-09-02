// src/pages/Login.tsx
//
// Split-screen layout. The left panel carries the brand atmosphere —
// a soft gradient in the same teal/periwinkle family as the patient
// app, so both products visibly belong to the same world. Logo space
// sits directly in the gradient, no card, no box. The right panel is
// the form itself, full height, generous and quiet.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      await refresh();
      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: brand atmosphere ── */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #2A9D8F 0%, #5BA8C4 45%, #7B9FD4 100%)',
          }}
        />
        {/* Soft drifting shapes for depth, echoing the mobile app's lava gradient */}
        <div className="absolute -top-20 -left-24 w-96 h-96 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-white/[0.05] blur-3xl translate-x-1/3 translate-y-1/4" />
        <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-teal-deep/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="h-12 flex items-center">
            <img src="/assets/Hacktua White.png" alt="Hacktua" className="h-7 w-auto" />
          </div>

          <div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight max-w-sm">
              Transparency and clarity to help you help others.
            </h1>
            <p className="text-white/70 text-[15px] mt-4 max-w-sm leading-relaxed">
              Every session, signal, and pattern, laid out clearly so you can focus on what matters most.
            </p>
          </div>

          <p className="text-white/50 text-xs">hacktua · <span className="text-italic">psych tech for all</span></p>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex-1 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 lg:hidden">
            <p className="text-sm font-semibold text-teal">step zero</p>
          </div>

          <h2 className="text-2xl font-semibold text-ink mb-1.5">Welcome back</h2>
          <p className="text-sm text-ink-muted mb-9">Sign in to view your patient sessions.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-0 py-2.5 border-0 border-b-2 border-surface-border text-[15px] text-ink bg-transparent focus:outline-none focus:border-teal transition-colors"
                placeholder="you@clinic.com"
              />
            </div>

            <div className="mb-7">
              <label className="block text-sm font-medium text-ink mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-0 py-2.5 border-0 border-b-2 border-surface-border text-[15px] text-ink bg-transparent focus:outline-none focus:border-teal transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-coral-soft text-sm text-coral-deep">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-ink text-white text-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-ink-faint mt-8">
            Therapist accounts only. Contact your administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}