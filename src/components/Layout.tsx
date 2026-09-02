// src/components/Layout.tsx
//
// A floating, icon-only nav rather than a boxed sidebar — sits on a
// frosted glass surface, vertically centered on the left edge. Labels
// appear only on hover, as a small tooltip, so the resting state stays
// minimal. Content runs edge-to-edge beneath it.

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ListChecks, Users, Settings, LogOut } from 'lucide-react';
//import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/supabase';

interface NavIconProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavIcon({ to, icon, label, active }: NavIconProps) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
      style={{
        backgroundColor: active ? 'rgba(42,157,143,0.12)' : 'transparent',
        color: active ? '#1E7268' : '#5C7478',
      }}
    >
      {icon}
      {hover && (
        <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-ink text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
          {label}
        </span>
      )}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [hoverSignOut, setHoverSignOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' || location.pathname.startsWith('/sessions') : location.pathname === path;

  // Workspace is the focused live-session mode -- the nav itself recedes
  // further than usual to reinforce that this is a different gear, not
  // just another page. Same frosted-glass system, just quieter.
  const inWorkspace = location.pathname.startsWith('/workspace');

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* ── Floating nav ── */}
      <nav className="fixed left-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl backdrop-blur-xl bg-white/70 border border-white/60 shadow-[0_4px_24px_rgba(20,40,45,0.08)]">
        <div className={inWorkspace ? '' : 'mb-2 pb-2 border-b border-ink/[0.06]'}>
          <img src="/assets/Hacktua Colour.png" alt="Hacktua" className="w-7 h-7 object-contain" />
        </div>

        {!inWorkspace && (
          <>
            <NavIcon to="/" icon={<ListChecks size={18} strokeWidth={1.8} />} label="Sessions" active={isActive('/')} />
            <NavIcon to="/patients" icon={<Users size={18} strokeWidth={1.8} />} label="Patients" active={isActive('/patients')} />
            <NavIcon to="/settings" icon={<Settings size={18} strokeWidth={1.8} />} label="Settings" active={isActive('/settings')} />
          </>
        )}

        <div className={`${inWorkspace ? 'mt-1' : 'mt-2 pt-2 border-t border-ink/[0.06]'} w-full flex justify-center`}>
          <button
            onMouseEnter={() => setHoverSignOut(true)}
            onMouseLeave={() => setHoverSignOut(false)}
            onClick={handleSignOut}
            disabled={signingOut}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-ink-faint hover:text-coral-deep hover:bg-coral-soft transition-colors disabled:opacity-50"
          >
            <LogOut size={18} strokeWidth={1.8} />
            {hoverSignOut && (
              <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-ink text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                Sign out
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className={inWorkspace ? 'max-w-6xl mx-auto px-8 py-10 pl-24' : 'max-w-5xl mx-auto px-8 py-10 pl-24'}>
        {children}
      </main>
    </div>
  );
}