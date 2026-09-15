import type { DotState } from '@/utils/fretboardUtils';

export const GLOW_FILTER_ID = 'fret-dot-mode-glow';

// Aurora dot palette — Option B (Story 5.5), theme-driven since Story 4.5.
// `fill`/`textColor` read CSS custom properties (`--color-dot-*`/`--dot-text-*`,
// defined per-theme in index.css) so every theme — including the 4 premium ones —
// genuinely changes dot colours. Each var() carries a fallback equal to the
// original dark/light hex, so rendering is byte-identical to the pre-4.5
// hardcoded values whenever no theme (or an unrecognised one) is applied, e.g.
// in a test environment that doesn't set `data-theme` on <html>.
//
// `radius`/`opacity` stay fixed JS constants across ALL themes (Story 4.5 Design
// Decision: opacity stays constant) — only colour varies per theme. Per-theme
// WCAG contrast (composited fill vs. text, at these exact fixed opacities) was
// computed and verified for all 6 themes — see the story's Dev Agent Record for
// the full ratio table; the dark/light values below are unchanged from 5.5.
const DOT_CONFIG: Record<DotState, { radius: number; fill: string; opacity: number; textColor: string }> = {
  root:       { radius: 13, fill: 'var(--color-dot-root, #fbbf24)',           opacity: 1,    textColor: 'var(--dot-text-root, #1a0e00)' },
  scale:      { radius: 11, fill: 'var(--color-dot-scale, #8b5cf6)',          opacity: 0.85, textColor: 'var(--dot-text-scale, #0a0518)' },
  mode:       { radius: 11, fill: 'var(--color-dot-mode, #22d3ee)',           opacity: 0.9,  textColor: 'var(--dot-text-mode, #04191c)' },
  'mode-root':{ radius: 13, fill: 'var(--color-dot-mode-root, #d946ef)',      opacity: 1,    textColor: 'var(--dot-text-mode-root, #1a0030)' },
  freeform:   { radius: 11, fill: 'var(--color-dot-freeform, #f0abfc)',       opacity: 0.8,  textColor: 'var(--dot-text-freeform, #2a0730)' },
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
