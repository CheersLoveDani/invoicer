import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { scheduleService, clientService, templateService } from '@/db'
import type { Schedule, ScheduleFrequency } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: Schedule
}

interface ScheduleFormData {
  clientId: string
  templateId: string
  frequency: ScheduleFrequency
  customIntervalDays: number
  nextDueDate: Date
  active: boolean
}

const initialFormData: ScheduleFormData = {
  clientId: '',
  templateId: '',
  frequency: 'monthly',
  customIntervalDays: 14,
  nextDueDate: new Date(),
  active: true,
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
}: ScheduleFormDialogProps) {
  const isEdit = !!schedule
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ScheduleFormData>(initialFormData)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const clients = useLiveQuery(() => clientService.getAll())

  // The client's own templates, plus any not tied to a client
  const templates = useLiveQuery(
    async () =>
      (await templateService.getAll()).filter(
        (t) => !form.clientId || !t.clientId || t.clientId === form.clientId,
      ),
    [form.clientId],
  )

  useEffect(() => {
    if (open) {
      if (schedule) {
        setForm({
          clientId: schedule.clientId,
          templateId: schedule.templateId,
          frequency: schedule.frequency,
          customIntervalDays: schedule.customIntervalDays ?? 14,
          nextDueDate: new Date(schedule.nextDueDate),
          active: schedule.active,
        })
      } else {
        setForm(initialFormData)
      }
    }
  }, [open, schedule])

  const updateField = <K extends keyof ScheduleFormData>(
    key: K,
    value: ScheduleFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // When client changes, reset template if the current template doesn't belong to the new client
  const handleClientChange = (clientId: string) => {
    setForm((prev) => ({ ...prev, clientId, templateId: '' }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.clientId) {
      toast.error('Please select a client')
      return
    }
    if (!form.templateId) {
      toast.error('Please select a template')
      return
    }
    if (form.frequency === 'custom' && (!form.customIntervalDays || form.customIntervalDays < 1)) {
      toast.error('Custom interval must be at least 1 day')
      return
    }

    setSaving(true)
    try {
      const data = {
        clientId: form.clientId,
        templateId: form.templateId,
        frequency: form.frequency,
        customIntervalDays:
          form.frequency === 'custom' ? form.customIntervalDays : undefined,
        nextDueDate: form.nextDueDate,
        active: form.active,
      }

      if (isEdit && schedule) {
        await scheduleService.update(schedule.id, data)
        toast.success('Schedule updated successfully')
      } else {
        await scheduleService.create(data)
        toast.success('Schedule created successfully')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? 'Failed to update schedule' : 'Failed to create schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Schedule' : 'New Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the recurring schedule details below.'
              : 'Set up a recurring invoice schedule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-client">
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.clientId}
              onValueChange={handleClientChange}
            >
              <SelectTrigger id="schedule-client" className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-template">
              Template <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.templateId}
              onValueChange={(value) => updateField('templateId', value)}
            >
              <SelectTrigger id="schedule-template" className="w-full">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    {form.clientId
                      ? 'No templates for this client'
                      : 'No templates available'}
                  </SelectItem>
                ) : (
                  templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(value) =>
                updateField('frequency', value as ScheduleFrequency)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.frequency === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="schedule-interval">Every X days</Label>
              <Input
                id="schedule-interval"
                type="number"
                min={1}
                value={form.customIntervalDays}
                onChange={(e) =>
                  updateField(
                    'customIntervalDays',
                    Math.max(1, parseInt(e.target.value) || 1),
                  )
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Next Due Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !form.nextDueDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {form.nextDueDate
                    ? format(form.nextDueDate, 'PPP')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.nextDueDate}
                  onSelect={(date) => {
                    if (date) {
                      updateField('nextDueDate', date)
                      setDatePickerOpen(false)
                    }
                  }}
                  defaultMonth={form.nextDueDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="schedule-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Paused schedules won't generate notifications
              </p>
            </div>
            <Switch
              id="schedule-active"
              checked={form.active}
              onCheckedChange={(checked) => updateField('active', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
