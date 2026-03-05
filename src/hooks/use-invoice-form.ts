import { useState, useEffect, useCallback, useMemo } from 'react'
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
}

export interface UseInvoiceFormReturn {
  form: InvoiceFormState
  setField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void
  setClientDetails: (client: Client | null) => void
  setLineItems: (items: LineItem[]) => void
  setExpenses: (items: LineItem[]) => void
  total: number
  save: () => Promise<string>
  isLoading: boolean
  isDirty: boolean
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

/**
 * After saving an invoice created from a schedule (template+client combo),
 * advance the schedule's nextDueDate based on its frequency.
 */
async function advanceMatchingSchedule(
  templateId: string | undefined,
  clientId: string | undefined,
): Promise<void> {
  if (!templateId || !clientId) return
  try {
    const allSchedules = await scheduleService.getAll()
    const match = allSchedules.find(
      (s) =>
        s.active &&
        s.templateId === templateId &&
        s.clientId === clientId,
    )
    if (!match) return

    const currentDue = new Date(match.nextDueDate)
    let nextDue: Date

    switch (match.frequency) {
      case 'weekly':
        nextDue = addWeeks(currentDue, 1)
        break
      case 'monthly':
        nextDue = addMonths(currentDue, 1)
        break
      case 'custom':
        nextDue = addDays(currentDue, match.customIntervalDays ?? 14)
        break
      default:
        nextDue = addMonths(currentDue, 1)
    }

    await scheduleService.update(match.id, {
      lastGeneratedDate: new Date(),
      nextDueDate: nextDue,
    })
  } catch {
    // Silently ignore schedule advancement errors —
    // the invoice was already saved successfully
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
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined)
  const [existingId, setExistingId] = useState<string | undefined>(id)

  // Initialize the form based on mode
  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
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
        const dueDays = settings.defaultDueDays || 30

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
          })
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

            if (template.clientId) {
              client = await clientService.getById(template.clientId)
              if (client) {
                invoiceNumber = await clientService.incrementInvoiceNumber(client.id)
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
                reference: template.paymentReference || invoiceNumber,
              },
              currency: baseCurrency,
              pdfTemplate: template.pdfTemplate,
              templateId: template.id,
              dueDate: addDays(new Date(), dueDays),
            })
          }
        } else if (mode === 'client' && clientParam) {
          const client = await clientService.getById(clientParam)
          if (cancelled) return
          if (client) {
            const invoiceNumber = await clientService.incrementInvoiceNumber(client.id)
            setSelectedClient(client)
            setForm({
              ...createBlankForm(),
              invoiceNumber,
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
            // Try to increment the number by parsing the original
            let newNumber = original.invoiceNumber
            const match = original.invoiceNumber.match(/^(.*?)(\d+)$/)
            if (match) {
              const prefix = match[1]
              const num = parseInt(match[2], 10) + 1
              newNumber = `${prefix}${String(num).padStart(match[2].length, '0')}`
            }

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
      setForm((prev) => ({ ...prev, [field]: value }))
      setIsDirty(true)
    },
    [],
  )

  const setClientDetails = useCallback(
    async (client: Client | null) => {
      if (client === null) {
        // "Enter manually" — clear to fields so user can type
        setSelectedClient(undefined)
        setForm((prev) => ({
          ...prev,
          to: { ...emptyFrom },
        }))
      } else if (client === (undefined as unknown as Client)) {
        // Clear selection
        setSelectedClient(undefined)
        setForm((prev) => ({
          ...prev,
          to: { ...emptyFrom },
        }))
      } else {
        setSelectedClient(client)
        const invoiceNumber = await clientService.incrementInvoiceNumber(client.id)
        setForm((prev) => ({
          ...prev,
          invoiceNumber,
          to: {
            name: client.name,
            email: client.email,
            address: client.address,
            phone: '',
          },
          paymentDetails: {
            ...prev.paymentDetails,
            reference: invoiceNumber,
          },
        }))
      }
      setIsDirty(true)
    },
    [],
  )

  const setLineItems = useCallback((items: LineItem[]) => {
    setForm((prev) => ({ ...prev, lineItems: items }))
    setIsDirty(true)
  }, [])

  const setExpenses = useCallback((items: LineItem[]) => {
    setForm((prev) => ({ ...prev, expenses: items }))
    setIsDirty(true)
  }, [])

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
    }

    if (mode === 'edit' && existingId) {
      await invoiceService.update(existingId, data)
      setIsDirty(false)
      toast.success('Invoice updated')
      return existingId
    } else {
      const newId = await invoiceService.create(data)
      setExistingId(newId)
      setIsDirty(false)
      toast.success('Invoice created')

      // Advance any matching schedule after creating an invoice from a template
      await advanceMatchingSchedule(form.templateId, selectedClient?.id)

      navigate(`/invoices/${newId}`, { replace: true })
      return newId
    }
  }, [form, mode, existingId, navigate, selectedClient])

  return {
    form,
    setField,
    setClientDetails,
    setLineItems,
    setExpenses,
    total,
    save,
    isLoading,
    isDirty,
    mode,
    selectedClient,
  }
}
