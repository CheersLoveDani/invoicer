import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { addDays, addWeeks, addMonths } from 'date-fns'
import { toast } from 'sonner'
import {
  profileService,
  clientService,
  invoiceService,
  templateService,
  settingsService,
  scheduleService,
} from '@/db'
import type {
  Client,
  Currency,
  Invoice,
  InvoiceFromSnapshot,
  InvoicePaymentDetails,
  LineItem,
  PdfTemplate,
  Schedule,
} from '@/types'

export type InvoiceFormMode = 'blank' | 'template' | 'client' | 'duplicate' | 'edit'

export interface InvoiceFormState {
  invoiceNumber: string
  title: string
  status: Invoice['status']
  date: Date
  dueDate: Date
  from: InvoiceFromSnapshot
  to: InvoiceFromSnapshot
  lineItems: LineItem[]
  expenses: LineItem[]
  notes: string
  paymentDetails: InvoicePaymentDetails
  currency: Currency
  pdfTemplate: PdfTemplate
  templateId?: string
  clientId?: string
}

export interface UseInvoiceFormReturn {
  form: InvoiceFormState
  setField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void
  setClientDetails: (client: Client | null) => void
  setLineItems: (items: LineItem[]) => void
  setExpenses: (items: LineItem[]) => void
  total: number
  save: () => Promise<string>
  /** Record in the form that the saved invoice has been sent, so a later save keeps that. */
  markSent: () => void
  isLoading: boolean
  isDirty: boolean
  hasUnsavedChanges: () => boolean
  mode: InvoiceFormMode
  selectedClient: Client | undefined
}

const emptyFrom: InvoiceFromSnapshot = {
  name: '',
  email: '',
  address: '',
  phone: '',
}

const emptyPayment: InvoicePaymentDetails = {
  bankAccountName: '',
  bankAccountNumber: '',
  bankSortCode: '',
  bankName: '',
  reference: '',
}

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

/**
 * After saving an invoice that was started from a schedule, move the
 * schedule on to its next date in the future.
 */
async function advanceSchedule(scheduleId: string | null): Promise<void> {
  if (!scheduleId) return
  try {
    const schedule = await scheduleService.getById(scheduleId)
    if (!schedule) return
    const now = new Date()
    await scheduleService.update(schedule.id, {
      lastGeneratedDate: now,
      nextDueDate: nextScheduleDate(
        new Date(schedule.nextDueDate),
        schedule.frequency,
        schedule.customIntervalDays,
        now,
      ),
    })
  } catch (err) {
    // The invoice itself was saved; only the schedule's date is left behind
    console.error('Failed to advance schedule:', err)
  }
}

function createBlankForm(): InvoiceFormState {
  const today = new Date()
  return {
    invoiceNumber: '',
    title: 'Invoice',
    status: 'draft',
    date: today,
    dueDate: addDays(today, 30),
    from: { ...emptyFrom },
    to: { ...emptyFrom },
    lineItems: [],
    expenses: [],
    notes: '',
    paymentDetails: { ...emptyPayment },
    currency: 'GBP',
    pdfTemplate: 'clean',
  }
}

export function useInvoiceForm(): UseInvoiceFormReturn {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const templateParam = searchParams.get('template')
  const clientParam = searchParams.get('client')
  const duplicateParam = searchParams.get('duplicate')
  const scheduleParam = searchParams.get('schedule')

  const mode: InvoiceFormMode = id
    ? 'edit'
    : templateParam
      ? 'template'
      : clientParam
        ? 'client'
        : duplicateParam
          ? 'duplicate'
          : 'blank'

  const [form, setForm] = useState<InvoiceFormState>(createBlankForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  // Read synchronously by the leave-page guard, which runs before state updates land
  const dirtyRef = useRef(false)
  const markDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
    setIsDirty(dirty)
  }, [])
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined)
  const [existingId, setExistingId] = useState<string | undefined>(id)

  // Initialize the form based on mode
  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      // The editor stays mounted between routes, so forget the previous invoice
      setExistingId(id)
      setSelectedClient(undefined)
      markDirty(false)
      try {
        const [profile, settings] = await Promise.all([
          profileService.get(),
          settingsService.get(),
        ])

        const fromSnapshot: InvoiceFromSnapshot = {
          name: profile.name,
          email: profile.email,
          address: profile.address,
          phone: profile.phone,
        }

        const paymentDetails: InvoicePaymentDetails = {
          bankAccountName: profile.bankAccountName,
          bankAccountNumber: profile.bankAccountNumber,
          bankSortCode: profile.bankSortCode,
          bankName: profile.bankName,
          reference: '',
        }

        const baseCurrency = profile.defaultCurrency || 'GBP'
        const basePdfTemplate = settings.defaultPdfTemplate || 'clean'
        const dueDays = settings.defaultDueDays ?? 30

        if (cancelled) return

        if (mode === 'edit' && id) {
          const invoice = await invoiceService.getById(id)
          if (!invoice) {
            toast.error('Invoice not found')
            navigate('/invoices')
            return
          }
          if (cancelled) return
          setExistingId(id)
          setForm({
            invoiceNumber: invoice.invoiceNumber,
            title: invoice.title,
            status: invoice.status,
            date: new Date(invoice.date),
            dueDate: new Date(invoice.dueDate),
            from: { ...invoice.from },
            to: { ...invoice.to },
            lineItems: invoice.lineItems.map((li) => ({ ...li })),
            expenses: invoice.expenses.map((li) => ({ ...li })),
            notes: invoice.notes,
            paymentDetails: { ...invoice.paymentDetails },
            currency: invoice.currency,
            pdfTemplate: invoice.pdfTemplate,
            templateId: invoice.templateId,
            clientId: invoice.clientId,
          })
          const owner = await clientService.findForInvoice(invoice)
          if (!cancelled) setSelectedClient(owner)
        } else if (mode === 'template' && templateParam) {
          const template = await templateService.getById(templateParam)
          if (!template) {
            toast.error('Template not found')
            if (cancelled) return
            setForm({
              ...createBlankForm(),
              from: fromSnapshot,
              paymentDetails,
              currency: baseCurrency,
              pdfTemplate: basePdfTemplate,
              dueDate: addDays(new Date(), dueDays),
            })
          } else {
            if (cancelled) return
            let invoiceNumber = ''
            let client: Client | undefined

            // A schedule names its client; otherwise use the template's own
            const templateClientId = clientParam ?? template.clientId
            if (templateClientId) {
              client = await clientService.getById(templateClientId)
              if (client) {
                invoiceNumber = await clientService.suggestInvoiceNumber(client.id)
                if (cancelled) return
                setSelectedClient(client)
              }
            }

            setForm({
              ...createBlankForm(),
              title: template.title,
              invoiceNumber,
              from: fromSnapshot,
              to: client
                ? { name: client.name, email: client.email, address: client.address, phone: '' }
                : { ...emptyFrom },
              lineItems: template.lineItems.map((li) => ({ ...li, id: uuid() })),
              expenses: template.expenses.map((li) => ({ ...li, id: uuid() })),
              notes: template.notes,
              paymentDetails: {
                ...paymentDetails,
                reference: template.paymentReference
                  ? template.paymentReference.replace(/\{number\}/g, invoiceNumber)
                  : invoiceNumber,
              },
              currency: baseCurrency,
              pdfTemplate: template.pdfTemplate,
              templateId: template.id,
              clientId: client?.id,
              dueDate: addDays(new Date(), dueDays),
            })
          }
        } else if (mode === 'client' && clientParam) {
          const client = await clientService.getById(clientParam)
          if (cancelled) return
          if (client) {
            const invoiceNumber = await clientService.suggestInvoiceNumber(client.id)
            if (cancelled) return
            setSelectedClient(client)
            setForm({
              ...createBlankForm(),
              invoiceNumber,
              clientId: client.id,
              from: fromSnapshot,
              to: {
                name: client.name,
                email: client.email,
                address: client.address,
                phone: '',
              },
              paymentDetails: {
                ...paymentDetails,
                reference: invoiceNumber,
              },
              currency: baseCurrency,
              pdfTemplate: basePdfTemplate,
              dueDate: addDays(new Date(), dueDays),
            })
          } else {
            toast.error('Client not found')
            setForm({
              ...createBlankForm(),
              from: fromSnapshot,
              paymentDetails,
              currency: baseCurrency,
              pdfTemplate: basePdfTemplate,
              dueDate: addDays(new Date(), dueDays),
            })
          }
        } else if (mode === 'duplicate' && duplicateParam) {
          const original = await invoiceService.getById(duplicateParam)
          if (cancelled) return
          if (!original) {
            toast.error('Invoice not found')
            setForm({
              ...createBlankForm(),
              from: fromSnapshot,
              paymentDetails,
              currency: baseCurrency,
              pdfTemplate: basePdfTemplate,
              dueDate: addDays(new Date(), dueDays),
            })
          } else {
            // Take the client's next number; without a client, count on from the original
            const owner = await clientService.findForInvoice(original)
            let newNumber = original.invoiceNumber
            if (owner) {
              newNumber = await clientService.suggestInvoiceNumber(owner.id)
            } else {
              const match = original.invoiceNumber.match(/^(.*?)(\d+)$/)
              if (match) {
                const prefix = match[1]
                const num = parseInt(match[2], 10) + 1
                newNumber = `${prefix}${String(num).padStart(match[2].length, '0')}`
              }
            }
            if (cancelled) return
            setSelectedClient(owner)

            setForm({
              invoiceNumber: newNumber,
              title: original.title,
              status: 'draft',
              date: new Date(),
              dueDate: addDays(new Date(), dueDays),
              from: { ...original.from },
              to: { ...original.to },
              lineItems: original.lineItems.map((li) => ({ ...li, id: uuid() })),
              expenses: original.expenses.map((li) => ({ ...li, id: uuid() })),
              notes: original.notes,
              paymentDetails: { ...original.paymentDetails, reference: newNumber },
              currency: original.currency,
              pdfTemplate: original.pdfTemplate,
              templateId: original.templateId,
              clientId: owner?.id,
            })
          }
        } else {
          // blank mode
          setForm({
            ...createBlankForm(),
            from: fromSnapshot,
            paymentDetails,
            currency: baseCurrency,
            pdfTemplate: basePdfTemplate,
            dueDate: addDays(new Date(), dueDays),
          })
        }
      } catch (err) {
        console.error('Failed to initialize invoice form:', err)
        toast.error('Failed to load invoice data')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, templateParam, clientParam, duplicateParam, mode])

  const setField = useCallback(
    <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value }
        // A payment reference that mirrored the invoice number keeps mirroring it
        if (field === 'invoiceNumber' && prev.paymentDetails.reference === prev.invoiceNumber) {
          next.paymentDetails = { ...prev.paymentDetails, reference: value as string }
        }
        return next
      })
      markDirty(true)
    },
    [markDirty],
  )

  const setClientDetails = useCallback(
    async (client: Client | null) => {
      if (!client) {
        // "Enter manually" or cleared — empty the fields so the user can type
        setSelectedClient(undefined)
        setForm((prev) => ({ ...prev, clientId: undefined, to: { ...emptyFrom } }))
        markDirty(true)
        return
      }
      setSelectedClient(client)
      // A sent invoice keeps the number it went out with
      const keepNumber = form.status !== 'draft'
      const invoiceNumber = keepNumber
        ? form.invoiceNumber
        : await clientService.suggestInvoiceNumber(client.id, existingId)
      setForm((prev) => ({
        ...prev,
        invoiceNumber,
        clientId: client.id,
        to: {
          name: client.name,
          email: client.email,
          address: client.address,
          phone: '',
        },
        paymentDetails: {
          ...prev.paymentDetails,
          reference:
            !prev.paymentDetails.reference || prev.paymentDetails.reference === prev.invoiceNumber
              ? invoiceNumber
              : prev.paymentDetails.reference,
        },
      }))
      markDirty(true)
    },
    [form.status, form.invoiceNumber, existingId, markDirty],
  )

  const setLineItems = useCallback((items: LineItem[]) => {
    setForm((prev) => ({ ...prev, lineItems: items }))
    markDirty(true)
  }, [markDirty])

  const setExpenses = useCallback((items: LineItem[]) => {
    setForm((prev) => ({ ...prev, expenses: items }))
    markDirty(true)
  }, [markDirty])

  const total = useMemo(() => {
    const lineItemsTotal = form.lineItems.reduce((s, i) => s + i.price, 0)
    const expensesTotal = form.expenses.reduce((s, i) => s + i.price, 0)
    return lineItemsTotal + expensesTotal
  }, [form.lineItems, form.expenses])

  const save = useCallback(async (): Promise<string> => {
    const data = {
      invoiceNumber: form.invoiceNumber,
      title: form.title,
      status: form.status,
      date: form.date,
      dueDate: form.dueDate,
      from: form.from,
      to: form.to,
      lineItems: form.lineItems,
      expenses: form.expenses,
      notes: form.notes,
      paymentDetails: form.paymentDetails,
      currency: form.currency,
      pdfTemplate: form.pdfTemplate,
      templateId: form.templateId,
      clientId: selectedClient?.id ?? form.clientId,
    }

    if (existingId) {
      await invoiceService.update(existingId, data)
      markDirty(false)
      toast.success('Invoice updated')
      return existingId
    } else {
      const newId = await invoiceService.create(data)
      setExistingId(newId)
      markDirty(false)
      toast.success('Invoice created')

      await advanceSchedule(scheduleParam)

      navigate(`/invoices/${newId}`, { replace: true })
      return newId
    }
  }, [form, existingId, navigate, selectedClient, scheduleParam, markDirty])

  const markSent = useCallback(() => {
    setForm((prev) => (prev.status === 'draft' ? { ...prev, status: 'sent' } : prev))
  }, [])

  return {
    form,
    setField,
    setClientDetails,
    setLineItems,
    setExpenses,
    total,
    save,
    markSent,
    isLoading,
    isDirty,
    hasUnsavedChanges: () => dirtyRef.current,
    mode,
    selectedClient,
  }
}
