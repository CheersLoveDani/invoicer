import { addDays, addMonths, addWeeks } from 'date-fns'
import type { Schedule } from '@/types'

/** The schedule's next date after `from`, a whole number of intervals on from `due`. */
export function nextScheduleDate(
  due: Date,
  frequency: Schedule['frequency'],
  customIntervalDays: number | undefined,
  from: Date,
): Date {
  // Counting each step from the original date keeps a schedule on the 31st
  // on month ends instead of drifting to the 28th after February
  const step = (n: number) =>
    frequency === 'weekly'
      ? addWeeks(due, n)
      : frequency === 'custom'
        ? addDays(due, n * Math.max(1, customIntervalDays ?? 14))
        : addMonths(due, n)
  let n = 1
  while (step(n) <= from) n++
  return step(n)
}
