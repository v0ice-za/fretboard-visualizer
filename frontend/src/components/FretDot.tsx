import type { DotState } from '@/utils/fretboardUtils';

export const GLOW_FILTER_ID = 'fret-dot-mode-glow';
/** Story 8.3: gold phosphor halo on root dots (colour from --glow-root-color). */
export const ROOT_GLOW_FILTER_ID = 'fret-dot-root-glow';

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
  // Story 8.3: Obsidian marker sizes — root-family 28px, other tones 24px (was 26/22).
  root:       { radius: 14, fill: 'var(--color-dot-root, #fbbf24)',           opacity: 1,    textColor: 'var(--dot-text-root, #1a0e00)' },
  scale:      { radius: 12, fill: 'var(--color-dot-scale, #8b5cf6)',          opacity: 0.85, textColor: 'var(--dot-text-scale, #0a0518)' },
  mode:       { radius: 12, fill: 'var(--color-dot-mode, #22d3ee)',           opacity: 0.9,  textColor: 'var(--dot-text-mode, #04191c)' },
  'mode-root':{ radius: 14, fill: 'var(--color-dot-mode-root, #d946ef)',      opacity: 1,    textColor: 'var(--dot-text-mode-root, #1a0030)' },
  freeform:   { radius: 12, fill: 'var(--color-dot-freeform, #f0abfc)',       opacity: 0.8,  textColor: 'var(--dot-text-freeform, #2a0730)' },
  // Story 7.1: stroke-only ring marking the key's root while a chord rooted elsewhere
  // is shown. `fill` is used as the STROKE colour; a lone ring's note name sits on the
  // board, so it uses the board text token rather than a dot-text token.
  'key-root': { radius: 16, fill: 'var(--color-dot-key-root, #f1f5f9)',       opacity: 1,    textColor: 'var(--color-text-primary, #e2e8f0)' },
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
      {/* Halo, not shadow: a wide soft bloom + a tight bright rim. flood-color is
          set via style because CSS var() doesn't resolve in presentation attributes. */}
      <filter id={ROOT_GLOW_FILTER_ID} x="-75%" y="-75%" width="250%" height="250%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" style={{ floodColor: 'var(--glow-root-color, rgba(245,158,11,0.45))' }} />
        <feDropShadow dx="0" dy="0" stdDeviation="1" style={{ floodColor: 'var(--glow-root-color, rgba(245,158,11,0.45))' }} />
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
      {state === 'key-root' ? (
        <circle
          className="fret-dot"
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={2.5 * sizeScale}
          opacity={opacity}
          pointerEvents="none"
        />
      ) : (
        <circle
          className="fret-dot"
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill}
          opacity={opacity}
          filter={
            state === 'mode' || state === 'mode-root'
              ? `url(#${GLOW_FILTER_ID})`
              : state === 'root'
                ? `url(#${ROOT_GLOW_FILTER_ID})`
                : undefined
          }
        />
      )}
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
