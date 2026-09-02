// src/components/NodeMark.tsx
//
// The one piece of visual DNA carried over from the patient app's
// constellation motif — three connected nodes, rendered small and
// quiet here since this is a professional tool, not an experience.
// Used in the sidebar logo, the login screen, and empty states.

export default function NodeMark({ size = 28, color = '#2A9D8F' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <line x1="7" y1="19" x2="14" y2="8" stroke={color} strokeWidth="1.4" strokeOpacity="0.55" />
      <line x1="14" y1="8" x2="21" y2="14" stroke={color} strokeWidth="1.4" strokeOpacity="0.55" />
      <line x1="14" y1="8" x2="19" y2="21" stroke={color} strokeWidth="1.4" strokeOpacity="0.55" />
      <circle cx="7" cy="19" r="2.3" fill={color} />
      <circle cx="14" cy="8" r="2.6" fill={color} />
      <circle cx="21" cy="14" r="2.3" fill={color} />
      <circle cx="19" cy="21" r="1.9" fill={color} fillOpacity="0.7" />
    </svg>
  );
}