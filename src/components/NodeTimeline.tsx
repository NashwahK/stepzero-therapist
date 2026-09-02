// src/components/NodeTimeline.tsx
//
// The patient's session history, rendered as the same constellation
// language as NodeMark itself — connected nodes, not a line/area chart.
// Node size = confidence, colour = top condition, thin low-opacity
// strokes link consecutive sessions in order. This is deliberately the
// same visual idea as the logo, applied to real data.

const CONDITION_COLORS: Record<string, string> = {
  mdd: '#7B9FD4',
  gad: '#2A9D8F',
  sad: '#FF8F6B',
  ocd: '#6FD9C4',
};

export interface TimelinePoint {
  session_id: string;
  date: string;
  top_condition_id: string | null;
  confidence_score: number | null;
}

export default function NodeTimeline({
  points,
  onSelect,
}: {
  points: TimelinePoint[];
  onSelect?: (sessionId: string) => void;
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-ink-faint">
        No sessions yet — this timeline fills in as they check in.
      </div>
    );
  }

  const width = Math.max(280, points.length * 90);
  const height = 90;
  const cy = height / 2;
  const step = points.length > 1 ? (width - 60) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const conf = p.confidence_score ?? 0;
    // gentle vertical drift by confidence so the line has real shape,
    // not just a flat row of dots
    const y = cy - (conf - 0.5) * 36;
    return { x: 30 + i * step, y, point: p };
  });

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {coords.slice(1).map((c, i) => (
          <line
            key={`line-${i}`}
            x1={coords[i].x} y1={coords[i].y}
            x2={c.x} y2={c.y}
            stroke="#5C7478" strokeOpacity="0.25" strokeWidth="1.4"
          />
        ))}
        {coords.map((c, i) => {
          const color = c.point.top_condition_id ? CONDITION_COLORS[c.point.top_condition_id] ?? '#94A8AB' : '#E7EEF0';
          const r = 4 + (c.point.confidence_score ?? 0) * 7;
          return (
            <g
              key={c.point.session_id}
              onClick={() => onSelect?.(c.point.session_id)}
              className={onSelect ? 'cursor-pointer' : ''}
            >
              <circle cx={c.x} cy={c.y} r={r} fill={color} fillOpacity="0.85" />
              <circle cx={c.x} cy={c.y} r={r + 5} fill="transparent" stroke={color} strokeOpacity="0.15" strokeWidth="1.5" />
              <title>{`${new Date(c.point.date).toLocaleDateString()} · ${c.point.top_condition_id ?? 'no clear pattern'} · ${Math.round((c.point.confidence_score ?? 0) * 100)}%`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}