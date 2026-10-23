import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import type { UseInvoiceFormReturn } from '@/hooks/use-invoice-form'
import type { Currency, PdfTemplate } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
import { db } from '@/db'
import { formatInvoiceNumber, invoiceBelongsTo, lastUsedNumber } from '@/db/services/invoice-numbering'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientPicker } from '@/components/invoice/client-picker'
import { LineItemEditor } from '@/components/line-items/line-item-editor'

interface InvoiceFormProps {
  invoiceForm: UseInvoiceFormReturn
}

const CURRENCIES = (Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((value) => ({
  value,
  label: `${value} (${CURRENCY_SYMBOLS[value]})`,
}))

const PDF_TEMPLATES: { value: PdfTemplate; label: string; hint: string }[] = [
  { value: 'clean', label: 'Clean', hint: 'Plain and airy' },
  { value: 'modern', label: 'Modern', hint: 'With a colour band' },
  { value: 'compact', label: 'Compact', hint: 'Fits more on a page' },
]

const DUE_PRESETS = [7, 14, 30]

function Section({
  title,
  description,
  children,
  aside,
}: {
  title: string
  description?: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section className="space-y-4 border-b py-6 first:pt-0 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** "Last sent ACME0012" for the chosen client, so the number can be checked at a glance. */
function useLastSent(clientId: string | undefined) {
  return useLiveQuery(async () => {
    if (!clientId) return null
    const client = await db.clients.get(clientId)
    if (!client) return null
    const invoices = await db.invoices.toArray()
    const last = lastUsedNumber(client, invoices.filter((inv) => invoiceBelongsTo(client, inv)))
    return last === null ? 'none' : formatInvoiceNumber(client.invoicePrefix, last)
  }, [clientId])
}

export function InvoiceForm({ invoiceForm }: InvoiceFormProps) {
  const { form, setField, setClientDetails, setLineItems, setExpenses, selectedClient } = invoiceForm
  const [showPayment, setShowPayment] = useState(false)
  const lastSent = useLastSent(selectedClient?.id)

  const dueIn = differenceInCalendarDays(form.dueDate, form.date)
  const payment = form.paymentDetails
  const setPayment = (key: keyof typeof payment, value: string) =>
    setField('paymentDetails', { ...payment, [key]: value })

  const paymentSummary = [payment.bankName, payment.bankAccountNumber && `ending ${payment.bankAccountNumber.slice(-4)}`]
    .filter(Boolean)
    .join(', ')

  return (
    <div>
      <Section title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Invoice number"
            htmlFor="invoiceNumber"
            hint={
              selectedClient && lastSent
                ? lastSent === 'none'
                  ? `Nothing sent to ${selectedClient.name} yet`
                  : `Last sent to ${selectedClient.name}: ${lastSent}`
                : undefined
            }
          >
            <Input
              id="invoiceNumber"
              value={form.invoiceNumber}
              onChange={(e) => setField('invoiceNumber', e.target.value)}
              placeholder="e.g. INV0001"
              className="font-medium tabular"
            />
          </Field>
          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Invoice"
            />
          </Field>
          <Field label="Date">
            <DatePicker date={form.date} onChange={(d) => setField('date', d)} />
          </Field>
          <Field
            label="Due"
            hint={
              <span className="flex flex-wrap items-center gap-1">
                {DUE_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setField('dueDate', addDays(startOfDay(form.date), days))}
                    className={cn(
                      'cursor-pointer rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground',
                      dueIn === days && 'bg-primary/10 font-medium text-primary',
                    )}
                  >
                    {days} days
                  </button>
                ))}
                {!DUE_PRESETS.includes(dueIn) && (
                  <span className="px-1.5 tabular">
                    {dueIn === 0 ? 'On receipt' : dueIn < 0 ? 'Before the invoice date' : `${dueIn} days`}
                  </span>
                )}
              </span>
            }
          >
            <DatePicker date={form.dueDate} onChange={(d) => setField('dueDate', d)} />
          </Field>
        </div>
      </Section>

      <Section title="Bill to">
        <ClientPicker value={selectedClient} onChange={setClientDetails} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="toName">
            <Input
              id="toName"
              value={form.to.name}
              onChange={(e) => setField('to', { ...form.to, name: e.target.value })}
              placeholder="Client or company"
            />
          </Field>
          <Field label="Email" htmlFor="toEmail">
            <Input
              id="toEmail"
              type="email"
              value={form.to.email}
              onChange={(e) => setField('to', { ...form.to, email: e.target.value })}
              placeholder="accounts@client.com"
            />
          </Field>
        </div>
        <Field label="Address" htmlFor="toAddress">
          <Textarea
            id="toAddress"
            value={form.to.address}
            onChange={(e) => setField('to', { ...form.to, address: e.target.value })}
            placeholder="Street, town, postcode"
            className="min-h-20"
          />
        </Field>
      </Section>

      <Section title="Work" description="Hours or fixed prices for what you did.">
        <LineItemEditor items={form.lineItems} onChange={setLineItems} currency={form.currency} />
      </Section>

      <Section title="Expenses" description="Costs you are passing on to the client.">
        <LineItemEditor items={form.expenses} onChange={setExpenses} currency={form.currency} kind="expenses" />
      </Section>

      <Section title="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Payment terms, thanks, or anything else the client should know"
          className="min-h-24"
        />
      </Section>

      <Section
        title="Payment details"
        description={showPayment ? 'Filled in from your profile. Changes here apply to this invoice only.' : paymentSummary || 'Not set. Add your bank details in Settings.'}
        aside={
          <Button variant="ghost" size="sm" onClick={() => setShowPayment((v) => !v)} aria-expanded={showPayment}>
            {showPayment ? 'Hide' : 'Edit'}
            <ChevronDown className={cn('transition-transform duration-200', showPayment && 'rotate-180')} />
          </Button>
        }
      >
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft',
            showPayment ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="grid gap-4 p-px sm:grid-cols-2">
              <Field label="Account name" htmlFor="bankAccountName">
                <Input id="bankAccountName" value={payment.bankAccountName} onChange={(e) => setPayment('bankAccountName', e.target.value)} />
              </Field>
              <Field label="Bank" htmlFor="bankName">
                <Input id="bankName" value={payment.bankName} onChange={(e) => setPayment('bankName', e.target.value)} />
              </Field>
              <Field label="Account number" htmlFor="bankAccountNumber">
                <Input id="bankAccountNumber" value={payment.bankAccountNumber} onChange={(e) => setPayment('bankAccountNumber', e.target.value)} className="tabular" />
              </Field>
              <Field label="Sort code" htmlFor="bankSortCode">
                <Input id="bankSortCode" value={payment.bankSortCode} onChange={(e) => setPayment('bankSortCode', e.target.value)} className="tabular" />
              </Field>
            </div>
          </div>
        </div>
        <Field label="Payment reference" htmlFor="paymentReference" hint="What the client should quote when paying. Follows the invoice number unless you change it.">
          <Input id="paymentReference" value={payment.reference} onChange={(e) => setPayment('reference', e.target.value)} className="tabular" />
        </Field>
      </Section>

      <Section title="Look">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field label="Currency">
            <Select value={form.currency} onValueChange={(v) => setField('currency', v as Currency)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="PDF style">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="PDF style">
              {PDF_TEMPLATES.map((t) => {
                const active = form.pdfTemplate === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setField('pdfTemplate', t.value)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-150',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'bg-card hover:border-foreground/20 hover:bg-accent/50',
                    )}
                  >
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.hint}</span>
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Section>
    </div>
  )
}

function DatePicker({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal">
          <CalendarIcon className="text-muted-foreground" />
          {format(date, 'EEE d MMMM yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) onChange(d)
            setOpen(false)
          }}
          defaultMonth={date}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  )
}
