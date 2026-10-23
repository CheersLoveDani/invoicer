/** Categorical series colours in fixed order. Past these, series fold into "Other". */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const OTHER_COLOR = 'var(--chart-other)'

export function colorForIndex(index: number): string {
  return index < CHART_COLORS.length ? CHART_COLORS[index] : OTHER_COLOR
}
