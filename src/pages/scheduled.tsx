import { PageHeader } from '@/components/layout/page-header'
import { OutboxList } from '@/components/schedules/outbox-list'
import { ScheduleList } from '@/components/schedules/schedule-list'

export default function ScheduledPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Scheduled"
        description="Invoices that repeat, and the ones waiting to go out."
      />

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Waiting to send</h3>
        <OutboxList />
      </section>

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Schedules</h3>
        <ScheduleList />
      </section>
    </div>
  )
}
