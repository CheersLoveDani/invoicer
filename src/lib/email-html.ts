import { format } from 'date-fns'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal } from '@/lib/invoice-amounts'
import { ELEGANT as C } from '@/lib/elegant-theme'
import type { Invoice, LineItem } from '@/types'

/**
 * The HTML version of an invoice email, matching the Elegant PDF. Built from
 * tables with inline styles, which Gmail, Outlook and Apple Mail all render
 * the same way.
 */

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export type EmailInvoice = Pick<
  Invoice,
  'invoiceNumber' | 'title' | 'date' | 'dueDate' | 'from' | 'to' | 'lineItems' | 'expenses' | 'currency' | 'paymentDetails'
>

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const label = (text: string) =>
  `<div style="font-family:${SANS};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.muted};">${escape(text)}</div>`

/** The plain-text message as paragraphs, keeping single line breaks. */
function paragraphs(body: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.text};">${escape(p.trim()).replace(/\n/g, '<br>')}</p>`,
    )
    .join('')
}

function itemRows(items: LineItem[], currency: Invoice['currency']): string {
  return items
    .map((item) => {
      const hours =
        item.type === 'hourly' && item.rate != null && item.hours != null
          ? `<div style="font-size:12px;color:${C.muted};margin-top:3px;">${item.hours} hrs at ${escape(formatCurrency(item.rate, currency))}</div>`
          : ''
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:14px;color:${C.ink};">${escape(item.description || 'Item')}${hours}</td>
        <td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:14px;color:${C.ink};white-space:nowrap;">${escape(formatCurrency(item.price, currency))}</td>
      </tr>`
    })
    .join('')
}

function itemsTable(invoice: EmailInvoice, total: string): string {
  if (invoice.lineItems.length + invoice.expenses.length === 0) return ''
  const head = (text: string, align = 'left') =>
    `<td align="${align}" style="padding:0 0 8px;border-bottom:2px solid ${C.navy};font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">${text}</td>`
  const expenses = invoice.expenses.length
    ? `<tr><td colspan="2" style="padding:18px 0 2px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Expenses</td></tr>${itemRows(invoice.expenses, invoice.currency)}`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>${head('Description')}${head('Amount', 'right')}</tr>
    ${itemRows(invoice.lineItems, invoice.currency)}
    ${expenses}
    <tr>
      <td align="right" style="padding:14px 18px 0 0;border-top:2px solid ${C.gold};font-family:${SANS};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.muted};">Total</td>
      <td align="right" style="padding:12px 0 0;border-top:2px solid ${C.gold};font-family:${SERIF};font-size:22px;color:${C.navy};white-space:nowrap;">${escape(total)}</td>
    </tr>
  </table>`
}

function paymentCard(pay: Invoice['paymentDetails']): string {
  if (!pay.bankAccountName && !pay.bankAccountNumber && !pay.bankSortCode && !pay.bankName) return ''
  const entries = (
    [
      ['Account name', pay.bankAccountName],
      ['Bank', pay.bankName],
      ['Sort code', pay.bankSortCode],
      ['Account number', pay.bankAccountNumber],
      ['Reference', pay.reference],
    ] as [string, string][]
  ).filter(([, v]) => v.trim())
  const rows = entries
    .map(([name, value], i) => {
      const border = i === entries.length - 1 ? '' : `border-bottom:1px solid ${C.rule};`
      return `<tr>
        <td style="padding:10px 0;${border}font-family:${SANS};font-size:13px;color:${C.muted};">${escape(name)}</td>
        <td align="right" style="padding:10px 0;${border}font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink};">${escape(value)}</td>
      </tr>`
    })
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.tint};border:1px solid ${C.rule};border-radius:10px;">
    <tr><td style="padding:20px 24px 6px;">
      <div style="font-family:${SERIF};font-size:18px;color:${C.navy};">How to pay</div>
      <div style="font-family:${SANS};font-size:13px;color:${C.muted};margin-top:4px;">By bank transfer, quoting the reference below.</div>
    </td></tr>
    <tr><td style="padding:0 24px 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr>
  </table>`
}

export function renderInvoiceEmailHtml({
  invoice,
  body,
  logoSrc,
}: {
  invoice: EmailInvoice
  /** The message, as written for the plain-text email. */
  body: string
  /** Usually "cid:…" for a logo sent with the email. */
  logoSrc?: string
}): string {
  const total = formatCurrency(invoiceTotal(invoice), invoice.currency)
  const due = format(new Date(invoice.dueDate), 'd MMMM yyyy')
  const issued = format(new Date(invoice.date), 'd MMMM yyyy')
  const sender = invoice.from.name || 'Invoice'

  // A white tile keeps dark logos visible on the navy band
  const brand = logoSrc
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#ffffff;border-radius:6px;padding:7px 9px;">
        <img src="${escape(logoSrc)}" alt="${escape(sender)}" height="38" style="display:block;height:38px;width:auto;max-width:200px;border:0;">
      </td></tr></table>`
    : `<span style="font-family:${SERIF};font-size:22px;color:#ffffff;letter-spacing:0.3px;">${escape(sender)}</span>`

  // Mail apps turn addresses into links; colouring them keeps the footer tidy
  const email = invoice.from.email.trim()
    ? `<a href="mailto:${escape(invoice.from.email.trim())}" style="color:${C.navy};text-decoration:none;">${escape(invoice.from.email.trim())}</a>`
    : ''
  const contact = [email, escape(invoice.from.phone.trim())].filter(Boolean).join(' &nbsp;·&nbsp; ')
  const address = escape(invoice.from.address.trim()).replace(/\n/g, ' · ')
  const payment = paymentCard(invoice.paymentDetails)
  const items = itemsTable(invoice, total)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Invoice ${escape(invoice.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Invoice ${escape(invoice.invoiceNumber)} for ${escape(total)}, due ${escape(due)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px -18px rgba(30,58,95,0.4);">

    <tr><td style="background:${C.navy};padding:28px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${brand}</td>
        <td valign="middle" align="right" style="font-family:${SANS};">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};">Invoice</div>
          <div style="font-family:${SERIF};font-size:18px;color:#ffffff;margin-top:4px;">${escape(invoice.invoiceNumber)}</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${C.gold};">&nbsp;</td></tr>

    <tr><td style="padding:40px 40px 8px;">
      ${label('Amount due')}
      <div style="font-family:${SERIF};font-size:44px;line-height:1.15;color:${C.navy};margin-top:8px;">${escape(total)}</div>
      <div style="font-family:${SANS};font-size:14px;color:${C.muted};margin-top:8px;">Due by <span style="color:${C.ink};font-weight:600;">${escape(due)}</span> &nbsp;·&nbsp; Issued ${escape(issued)}</div>
    </td></tr>

    <tr><td style="padding:24px 40px 0;">
      <div style="height:1px;background:${C.rule};line-height:1px;font-size:0;">&nbsp;</div>
    </td></tr>

    <tr><td style="padding:28px 40px 8px;">${paragraphs(body)}</td></tr>

    ${
      items
        ? `<tr><td style="padding:12px 40px 0;">
      ${invoice.title ? `<div style="font-family:${SERIF};font-size:18px;color:${C.navy};margin-bottom:14px;">${escape(invoice.title)}</div>` : ''}
      ${items}
    </td></tr>`
        : ''
    }

    ${payment ? `<tr><td style="padding:32px 40px 0;">${payment}</td></tr>` : ''}

    <tr><td style="padding:28px 40px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding:10px 16px;border:1px solid ${C.rule};border-radius:8px;font-family:${SANS};font-size:13px;color:${C.text};">
          📎&nbsp; The full invoice is attached as a PDF.
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="background:${C.tint};border-top:1px solid ${C.rule};padding:24px 40px;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted};">
      <div style="font-family:${SERIF};font-size:15px;color:${C.navy};">${escape(sender)}</div>
      ${contact ? `<div>${contact}</div>` : ''}
      ${address ? `<div>${address}</div>` : ''}
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}
