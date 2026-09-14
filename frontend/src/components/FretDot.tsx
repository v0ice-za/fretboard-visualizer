import type { DotState } from '@/utils/fretboardUtils';

export const GLOW_FILTER_ID = 'fret-dot-mode-glow';

// Aurora dot palette — Option B (Story 5.5). Fills come from the UX spec
// (`ux-design-specification.md#Fretboard dot palette — Option B`); text colours
// are chosen to clear WCAG 2.1 AA (>=4.5:1) for the bold ~8px note label sitting
// inside each dot. NOTE: these hex values (not the unused `--color-dot-*` CSS
// tokens in index.css) are the real render source of truth.
//
// Contrast ratios below are the WORST CASE across both themes against the
// TRUE RENDERED colour — i.e. the dot's fill alpha-composited with the
// fretboard background (`--color-fretboard`), not the raw fill hex. For
// opacity<1 states this composite is meaningfully different from the nominal
// fill (code review 2026-09-14 caught this: the original comments/test here
// checked nominal-fill-vs-text, which never actually renders on screen).
// `scale` is the one state where the composite swings enough between themes
// that a single static text colour can't clear AA in both — its text colour
// is theme-aware via `--dot-text-scale` (defined per-theme in index.css).
const DOT_CONFIG: Record<DotState, { radius: number; fill: string; opacity: number; textColor: string }> = {
  root:       { radius: 13, fill: '#fbbf24', opacity: 1,    textColor: '#1a0e00' },                     // gold  · text 11.4:1 (opacity 1, no compositing)
  scale:      { radius: 11, fill: '#8b5cf6', opacity: 0.85, textColor: 'var(--dot-text-scale, #0a0518)' }, // violet · theme-aware text: ~4.7:1 (light theme) / ~5.0:1 (dark theme, composited)
  mode:       { radius: 11, fill: '#22d3ee', opacity: 0.9,  textColor: '#04191c' },                     // cyan  · text >=8.2:1 worst-case composited (both themes)
  'mode-root':{ radius: 13, fill: '#d946ef', opacity: 1,    textColor: '#1a0030' },                     // fuchsia (root-in-mode) — shifted off scale's violet hue for at-a-glance separation; text 5.6:1
  freeform:   { radius: 11, fill: '#f0abfc', opacity: 0.8,  textColor: '#2a0730' },                     // pink  · text >=6.7:1 worst-case composited (both themes)
};

// Exported for the WCAG-AA composited-contrast guardrail suite in FretDot.test.tsx,
// so the test verifies the real render config instead of a hand-duplicated copy
// that could silently drift out of sync.
export { DOT_CONFIG };

export interface FretDotProps {
  fret: number;
  string: number;
  state: DotState;
  note: string;
  cx: number;
  cy: number;
  sizeScale?: number;
  showNoteName?: boolean;
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

export default function FretDot({ fret, string: stringIdx, state, note, cx, cy, sizeScale = 1, showNoteName }: FretDotProps) {
  const { radius: baseRadius, fill, opacity, textColor } = DOT_CONFIG[state];
  const radius = baseRadius * sizeScale;
  const fontSize = (note.length > 1 ? 7 : 8) * sizeScale;

  return (
    <g data-fret={fret} data-string={stringIdx} data-state={state} aria-hidden="true">
      <circle
        className="fret-dot"
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        opacity={opacity}
        filter={state === 'mode' || state === 'mode-root' ? `url(#${GLOW_FILTER_ID})` : undefined}
      />
      {state === 'freeform' && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3 * sizeScale}
          fill="none"
          stroke={fill}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={opacity}
          pointerEvents="none"
        />
      )}
      {showNoteName && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
          fontSize={fontSize}
          fontWeight="700"
          fill={textColor}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {note}
        </text>
      )}
    </g>
  );
}
