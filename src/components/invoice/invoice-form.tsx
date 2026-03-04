import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { UseInvoiceFormReturn } from '@/hooks/use-invoice-form'
import type { Currency, PdfTemplate } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'GBP', label: `GBP (${CURRENCY_SYMBOLS.GBP})` },
  { value: 'USD', label: `USD (${CURRENCY_SYMBOLS.USD})` },
  { value: 'EUR', label: `EUR (${CURRENCY_SYMBOLS.EUR})` },
  { value: 'JPY', label: `JPY (${CURRENCY_SYMBOLS.JPY})` },
  { value: 'CAD', label: `CAD (${CURRENCY_SYMBOLS.CAD})` },
  { value: 'AUD', label: `AUD (${CURRENCY_SYMBOLS.AUD})` },
]

const PDF_TEMPLATES: { value: PdfTemplate; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'modern', label: 'Modern' },
  { value: 'compact', label: 'Compact' },
]

export function InvoiceForm({ invoiceForm }: InvoiceFormProps) {
  const {
    form,
    setField,
    setClientDetails,
    setLineItems,
    setExpenses,
    total,
    selectedClient,
  } = invoiceForm

  const currencySymbol = CURRENCY_SYMBOLS[form.currency]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Invoice title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={form.invoiceNumber}
                onChange={(e) => setField('invoiceNumber', e.target.value)}
                placeholder="e.g. INV-0001"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                date={form.date}
                onChange={(d) => setField('date', d)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DatePicker
                date={form.dueDate}
                onChange={(d) => setField('dueDate', d)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client section */}
      <Card>
        <CardHeader>
          <CardTitle>Bill To</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientPicker
            value={selectedClient}
            onChange={setClientDetails}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="toName">Name</Label>
              <Input
                id="toName"
                value={form.to.name}
                onChange={(e) =>
                  setField('to', { ...form.to, name: e.target.value })
                }
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toEmail">Email</Label>
              <Input
                id="toEmail"
                type="email"
                value={form.to.email}
                onChange={(e) =>
                  setField('to', { ...form.to, email: e.target.value })
                }
                placeholder="client@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="toAddress">Address</Label>
            <Textarea
              id="toAddress"
              value={form.to.address}
              onChange={(e) =>
                setField('to', { ...form.to, address: e.target.value })
              }
              placeholder="Client address"
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemEditor
            items={form.lineItems}
            onChange={setLineItems}
          />
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemEditor
            items={form.expenses}
            onChange={setExpenses}
            label="Expenses"
          />
        </CardContent>
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums">
              {currencySymbol}
              {total.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Notes & Payment Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Payment terms, notes, or special instructions..."
            className="min-h-24"
          />
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Account Name</Label>
              <Input
                id="bankAccountName"
                value={form.paymentDetails.bankAccountName}
                onChange={(e) =>
                  setField('paymentDetails', {
                    ...form.paymentDetails,
                    bankAccountName: e.target.value,
                  })
                }
                placeholder="Account holder name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={form.paymentDetails.bankName}
                onChange={(e) =>
                  setField('paymentDetails', {
                    ...form.paymentDetails,
                    bankName: e.target.value,
                  })
                }
                placeholder="Bank name"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={form.paymentDetails.bankAccountNumber}
                onChange={(e) =>
                  setField('paymentDetails', {
                    ...form.paymentDetails,
                    bankAccountNumber: e.target.value,
                  })
                }
                placeholder="Account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankSortCode">Sort Code</Label>
              <Input
                id="bankSortCode"
                value={form.paymentDetails.bankSortCode}
                onChange={(e) =>
                  setField('paymentDetails', {
                    ...form.paymentDetails,
                    bankSortCode: e.target.value,
                  })
                }
                placeholder="Sort code"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentReference">Reference</Label>
            <Input
              id="paymentReference"
              value={form.paymentDetails.reference}
              onChange={(e) =>
                setField('paymentDetails', {
                  ...form.paymentDetails,
                  reference: e.target.value,
                })
              }
              placeholder="Payment reference"
            />
          </div>
        </CardContent>
      </Card>

      {/* Options row */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setField('currency', v as Currency)}
              >
                <SelectTrigger className="w-[140px]">
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
            </div>
            <div className="space-y-2">
              <Label>PDF Template</Label>
              <Select
                value={form.pdfTemplate}
                onValueChange={(v) => setField('pdfTemplate', v as PdfTemplate)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PDF_TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Internal date picker component
function DatePicker({
  date,
  onChange,
}: {
  date: Date
  onChange: (date: Date) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date ? format(date, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(d)}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
}
