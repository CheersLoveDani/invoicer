import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import { db, scheduleService } from '@/db'
import type { Schedule } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScheduleFormDialog } from './schedule-form-dialog'
import {
  CalendarClock,
  Clock,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  User,
  FileText,
} from 'lucide-react'

function FrequencyLabel({ schedule }: { schedule: Schedule }) {
  switch (schedule.frequency) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'custom':
      return `Every ${schedule.customIntervalDays} days`
    default:
      return schedule.frequency
  }
}

function ScheduleCard({ schedule, index }: { schedule: Schedule; index: number }) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const client = useLiveQuery(
    () => db.clients.get(schedule.clientId),
    [schedule.clientId],
  )

  const template = useLiveQuery(
    () => db.templates.get(schedule.templateId),
    [schedule.templateId],
  )

  const dueDate = new Date(schedule.nextDueDate)
  const daysUntilDue = differenceInCalendarDays(dueDate, new Date())
  const isDueSoon = schedule.active && daysUntilDue <= 7 && daysUntilDue >= 0
  const isOverdue = schedule.active && daysUntilDue < 0

  const handleToggleActive = async () => {
    try {
      await scheduleService.update(schedule.id, { active: !schedule.active })
      toast.success(schedule.active ? 'Schedule paused' : 'Schedule resumed')
    } catch {
      toast.error('The schedule was not changed. Try again.')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await scheduleService.delete(schedule.id)
      toast.success('Schedule deleted')
      setDeleteOpen(false)
    } catch {
      toast.error('The schedule was not deleted. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
<Card style={{ '--i': index } as React.CSSProperties} className="animate-rise transition-[box-shadow,transform,border-color] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lift">
        <CardHeader>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 truncate text-base">
              {client?.name ?? 'Client removed'}
              {!schedule.active && (
                <Badge variant="secondary">Paused</Badge>
              )}
              {schedule.active && (
                <Badge
                  className={
                    isOverdue
                      ? 'bg-warning/12 text-warning'
                      : isDueSoon
                        ? 'bg-info/10 text-info'
                        : 'bg-success/10 text-success'
                  }
                >
                  {isOverdue ? 'Late' : isDueSoon ? 'Due soon' : 'Active'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1.5 truncate">
              <FileText className="size-3.5 shrink-0" />
              {template?.name ?? 'Template removed'}
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleActive()
                }}
                title={schedule.active ? 'Pause schedule' : 'Resume schedule'}
              >
                {schedule.active ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditOpen(true)
                }}
                title="Edit schedule"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
                title="Delete schedule"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-3.5" />
              <span className="truncate">{client?.name ?? '...'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              <span><FrequencyLabel schedule={schedule} /></span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-3.5" />
              <span className="tabular">Next {format(dueDate, 'EEE d MMM yyyy')}</span>
            </div>
            {schedule.active && client && template && (
              <Button
                size="xs"
                variant={isOverdue || isDueSoon ? 'default' : 'outline'}
                onClick={() =>
                  navigate(`/invoices/new?template=${schedule.templateId}&client=${schedule.clientId}&schedule=${schedule.id}`)
                }
              >
                Create invoice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ScheduleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        schedule={schedule}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this schedule?</DialogTitle>
            <DialogDescription>
              Invoices already made from it stay. Reminders for{' '}
              <span className="font-semibold text-foreground">{client?.name ?? 'this client'}</span> stop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ScheduleList() {
  const [createOpen, setCreateOpen] = useState(false)

  const schedules = useLiveQuery(() => db.schedules.toArray())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New schedule
        </Button>
      </div>

      {schedules === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 skeleton rounded-xl" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <CalendarClock className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-[15px] font-semibold">No schedules yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            A schedule reminds you when a repeat invoice is due and fills it in from a template.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Set up a schedule
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule, i) => (
            <ScheduleCard key={schedule.id} schedule={schedule} index={i} />
          ))}
        </div>
      )}

      <ScheduleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
