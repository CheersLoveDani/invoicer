import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PdfTemplateProps } from './pdf-clean'
import { formatCurrency, formatDate, calculateTotal } from '@/lib/pdf-utils'
import { ELEGANT as C } from '@/lib/elegant-theme'
import type { LineItem } from '@/types'

const SERIF = 'Times-Roman'
const SANS = 'Helvetica'
const SANS_BOLD = 'Helvetica-Bold'

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: SANS, color: C.ink, paddingBottom: 70 },

  header: {
    backgroundColor: C.navy,
    paddingVertical: 26,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoTile: { backgroundColor: '#ffffff', borderRadius: 5, padding: 6 },
  logo: { height: 38, maxWidth: 170, objectFit: 'contain' },
  brandName: { fontFamily: SERIF, fontSize: 20, color: '#ffffff' },
  headerRight: { alignItems: 'flex-end' },
  kicker: { fontSize: 8, letterSpacing: 2.5, color: C.gold, textTransform: 'uppercase' },
  headerNumber: { fontFamily: SERIF, fontSize: 15, color: '#ffffff', marginTop: 4 },
  goldRule: { height: 2.5, backgroundColor: C.gold },

  content: { paddingHorizontal: 44, paddingTop: 32 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  label: { fontSize: 7.5, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase', marginBottom: 5 },
  billedName: { fontFamily: SERIF, fontSize: 14, color: C.ink, marginBottom: 3 },
  billedLine: { fontSize: 9.5, color: C.text, lineHeight: 1.45 },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontFamily: SERIF, fontSize: 30, color: C.navy },
  dueLine: { fontSize: 9.5, color: C.muted, marginTop: 4 },
  dueStrong: { fontFamily: SANS_BOLD, color: C.ink },

  metaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.rule,
    paddingVertical: 12,
    marginBottom: 26,
  },
  metaCell: { flex: 1 },
  metaValue: { fontSize: 10.5, color: C.ink },

  title: { fontFamily: SERIF, fontSize: 16, color: C.navy, marginBottom: 12 },

  tableHead: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: C.navy, paddingBottom: 6 },
  headCell: { fontSize: 7.5, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: C.rule, paddingVertical: 9 },
  colDesc: { flex: 1, paddingRight: 12 },
  colPrice: { width: 110, textAlign: 'right' },
  itemText: { fontSize: 10, color: C.ink },
  itemSub: { fontSize: 8.5, color: C.muted, marginTop: 2 },
  groupLabel: { fontSize: 7.5, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase', marginTop: 16, marginBottom: 2 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: C.gold,
  },
  totalLabel: { fontSize: 8, letterSpacing: 2, color: C.muted, textTransform: 'uppercase', marginRight: 18 },
  totalValue: { fontFamily: SERIF, fontSize: 18, color: C.navy, width: 140, textAlign: 'right' },

  notesTitle: { fontFamily: SERIF, fontSize: 13, color: C.navy, marginTop: 26, marginBottom: 6 },
  notes: { fontSize: 9.5, color: C.text, lineHeight: 1.55 },

  payBox: {
    marginTop: 26,
    backgroundColor: C.tint,
    borderWidth: 1,
    borderColor: C.rule,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  payTitle: { fontFamily: SERIF, fontSize: 13, color: C.navy },
  payHint: { fontSize: 8.5, color: C.muted, marginTop: 2, marginBottom: 8 },
  payRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.75, borderBottomColor: C.rule },
  payRowLast: { flexDirection: 'row', paddingVertical: 5 },
  payLabel: { width: 120, fontSize: 9, color: C.muted },
  payValue: { flex: 1, fontSize: 10, color: C.ink, fontFamily: SANS_BOLD },

  footer: {
    position: 'absolute',
    bottom: 26,
    left: 44,
    right: 44,
    borderTopWidth: 0.75,
    borderTopColor: C.rule,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerName: { fontFamily: SERIF, fontSize: 10, color: C.navy },
  footerText: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
})

function Items({ items, currency }: { items: LineItem[]; currency: PdfTemplateProps['currency'] }) {
  return (
    <>
      {items.map((item) => (
        <View key={item.id} style={styles.row} wrap={false}>
          <View style={styles.colDesc}>
            <Text style={styles.itemText}>{item.description}</Text>
            {item.type === 'hourly' && item.rate != null && item.hours != null ? (
              <Text style={styles.itemSub}>
                {item.hours} hrs at {formatCurrency(item.rate, currency)}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.colPrice, styles.itemText]}>{formatCurrency(item.price, currency)}</Text>
        </View>
      ))}
    </>
  )
}

export function ElegantTemplate({
  title,
  invoiceNumber,
  date,
  dueDate,
  from,
  to,
  lineItems,
  expenses,
  notes,
  paymentDetails,
  currency,
  logo,
}: PdfTemplateProps) {
  const total = calculateTotal(lineItems, expenses)
  const payment = (
    [
      ['Account name', paymentDetails.bankAccountName],
      ['Bank', paymentDetails.bankName],
      ['Sort code', paymentDetails.bankSortCode],
      ['Account number', paymentDetails.bankAccountNumber],
      ['Reference', paymentDetails.reference],
    ] as [string, string][]
  ).filter(([, v]) => v?.trim())
  const hasBank =
    paymentDetails.bankAccountName || paymentDetails.bankAccountNumber || paymentDetails.bankSortCode || paymentDetails.bankName
  const contact = [from.email, from.phone].filter((v) => v?.trim()).join('  ·  ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logo ? (
            // A white tile keeps dark logos visible on the navy band
            <View style={styles.logoTile}>
              <Image style={styles.logo} src={logo} />
            </View>
          ) : (
            <Text style={styles.brandName}>{from.name}</Text>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.kicker}>Invoice</Text>
            <Text style={styles.headerNumber}>{invoiceNumber}</Text>
          </View>
        </View>
        <View style={styles.goldRule} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.label}>Billed to</Text>
              <Text style={styles.billedName}>{to.name}</Text>
              {to.email ? <Text style={styles.billedLine}>{to.email}</Text> : null}
              {to.address ? <Text style={styles.billedLine}>{to.address}</Text> : null}
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.label}>Amount due</Text>
              <Text style={styles.amount}>{formatCurrency(total, currency)}</Text>
              {dueDate ? (
                <Text style={styles.dueLine}>
                  Due by <Text style={styles.dueStrong}>{formatDate(dueDate)}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.label}>Invoice number</Text>
              <Text style={styles.metaValue}>{invoiceNumber}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.label}>Issued</Text>
              <Text style={styles.metaValue}>{formatDate(date)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.label}>Due</Text>
              <Text style={styles.metaValue}>{dueDate ? formatDate(dueDate) : 'On receipt'}</Text>
            </View>
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.tableHead}>
            <Text style={[styles.colDesc, styles.headCell]}>Description</Text>
            <Text style={[styles.colPrice, styles.headCell]}>Amount</Text>
          </View>
          <Items items={lineItems} currency={currency} />
          {expenses.length > 0 ? (
            <>
              <Text style={styles.groupLabel}>Expenses</Text>
              <Items items={expenses} currency={currency} />
            </>
          ) : null}

          <View style={styles.totalRow} wrap={false}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
          </View>

          {notes ? (
            <View wrap={false}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notes}>{notes}</Text>
            </View>
          ) : null}

          {hasBank ? (
            <View style={styles.payBox} wrap={false}>
              <Text style={styles.payTitle}>How to pay</Text>
              <Text style={styles.payHint}>By bank transfer, quoting the reference below.</Text>
              {payment.map(([label, value], i) => (
                <View key={label} style={i === payment.length - 1 ? styles.payRowLast : styles.payRow}>
                  <Text style={styles.payLabel}>{label}</Text>
                  <Text style={styles.payValue}>{value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerName}>{from.name}</Text>
            {contact ? <Text style={styles.footerText}>{contact}</Text> : null}
          </View>
          {from.address ? (
            <Text style={[styles.footerText, { textAlign: 'right', maxWidth: 220 }]}>{from.address}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
