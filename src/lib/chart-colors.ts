export const CHART_COLORS = [
  'hsl(221, 83%, 53%)', // blue
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)',  // amber
  'hsl(0, 84%, 60%)',   // red
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // cyan
  'hsl(25, 95%, 53%)',  // orange
  'hsl(330, 81%, 60%)', // pink
  'hsl(173, 80%, 40%)', // teal
  'hsl(47, 96%, 53%)',  // yellow
]

export function colorForIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}
