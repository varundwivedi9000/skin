/**
 * Ported from the prototype's `cols(a, b, gap, align)` closure — a two-column
 * grid on desktop that collapses to one column on mobile (<780px). Used
 * across every page for the recurring "image beside copy" layout.
 */
export function gridCols(isMobile: boolean, a: number, b: number, gap?: string, align?: string): string {
  return isMobile
    ? `display:grid;grid-template-columns:minmax(0,1fr);gap:${gap || '32px'};align-items:start`
    : `display:grid;grid-template-columns:minmax(0,${a}fr) minmax(0,${b}fr);gap:${gap || 'clamp(28px,5vw,72px)'};align-items:${align || 'start'}`;
}
