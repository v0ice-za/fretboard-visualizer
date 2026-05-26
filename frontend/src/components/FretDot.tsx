import type { DotState } from '@/utils/fretboardUtils';

export const GLOW_FILTER_ID = 'fret-dot-mode-glow';

const DOT_CONFIG: Record<DotState, { radius: number; fill: string; opacity: number; textColor: string }> = {
  root:     { radius: 13, fill: '#f59e0b', opacity: 1,    textColor: '#1a0e00' },
  scale:    { radius: 11, fill: '#6366f1', opacity: 0.85, textColor: '#ffffff' },
  mode:     { radius: 11, fill: '#fb7185', opacity: 0.9,  textColor: '#1a0010' },
  freeform: { radius: 11, fill: '#22d3ee', opacity: 0.8,  textColor: '#001520' },
};

export interface FretDotProps {
  fret: number;
  string: number;
  state: DotState;
  note: string;
  cx: number;
  cy: number;
}

// SVG filter definitions — include once inside the parent <svg> element
export function FretDotDefs() {
  return (
    <defs>
      <filter id={GLOW_FILTER_ID} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export default function FretDot({ fret, string: stringIdx, state, note, cx, cy }: FretDotProps) {
  const { radius, fill, opacity, textColor } = DOT_CONFIG[state];

  return (
    <g data-fret={fret} data-string={stringIdx} data-state={state} aria-hidden="true">
      <circle
        className="fret-dot"
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        opacity={opacity}
        filter={state === 'mode' ? `url(#${GLOW_FILTER_ID})` : undefined}
      />
      {state === 'freeform' && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3}
          fill="none"
          stroke={fill}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={opacity}
        />
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
        fontSize={note.length > 1 ? 7 : 8}
        fontWeight="700"
        fill={textColor}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {note}
      </text>
    </g>
  );
}
