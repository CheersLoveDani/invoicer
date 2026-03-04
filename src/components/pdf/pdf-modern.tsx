import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PdfTemplateProps } from './pdf-clean'
import { formatCurrency, formatDate, calculateTotal } from '@/lib/pdf-utils'

const ACCENT = '#1e3a5f'
const ACCENT_LIGHT = '#f0f4f8'

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  accentBar: {
    height: 7,
    backgroundColor: ACCENT,
  },
  content: {
    padding: 44,
    paddingTop: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    marginBottom: 8,
    marginTop: 22,
  },
  // Info sections side by side
  infoContainer: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 10,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 6,
  },
  // Table styles
  table: {
    marginTop: 6,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  tableRowAlt: {
    backgroundColor: ACCENT_LIGHT,
  },
  colDescription: {
    flex: 3,
  },
  colRate: {
    flex: 1,
    textAlign: 'right',
  },
  colHours: {
    flex: 1,
    textAlign: 'right',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colExpenseDesc: {
    flex: 3,
  },
  colExpenseCost: {
    flex: 1,
    textAlign: 'right',
  },
  headerCell: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginRight: 24,
    color: ACCENT,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
  },
  // Notes
  notes: {
    marginTop: 20,
    fontSize: 9,
    color: '#555',
    lineHeight: 1.6,
  },
  // Payment details
  paymentTable: {
    marginTop: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 4,
  },
  paymentLabel: {
    width: 120,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#666',
  },
  paymentValue: {
    flex: 1,
    fontSize: 10,
  },
})

function hasHourlyItems(items: PdfTemplateProps['lineItems']): boolean {
  return items.some((item) => item.type === 'hourly' && item.rate != null && item.hours != null)
}

export function ModernTemplate({
  title,
  invoiceNumber,
  date,
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
  const showHourlyColumns = hasHourlyItems(lineItems)
  const hasExpenses = expenses.length > 0
  const hasPaymentDetails =
    paymentDetails.bankAccountName ||
    paymentDetails.bankAccountNumber ||
    paymentDetails.bankSortCode ||
    paymentDetails.bankName

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{title || 'Invoice'}</Text>
              <Text style={styles.metaText}>Invoice #{invoiceNumber}</Text>
              <Text style={styles.metaText}>Date: {formatDate(date)}</Text>
            </View>
            {logo ? <Image style={styles.logo} src={logo} /> : null}
          </View>

          {/* From / To side by side */}
          <View style={styles.infoContainer}>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>From</Text>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{from.name}</Text>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{from.email}</Text>
              {from.address ? (
                <>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{from.address}</Text>
                </>
              ) : null}
              {from.phone ? (
                <>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{from.phone}</Text>
                </>
              ) : null}
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>To</Text>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{to.name}</Text>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{to.email}</Text>
              {to.address ? (
                <>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{to.address}</Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Work items */}
          {lineItems.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Work</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
                  {showHourlyColumns ? (
                    <>
                      <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
                      <Text style={[styles.colHours, styles.headerCell]}>Hours</Text>
                    </>
                  ) : null}
                  <Text style={[styles.colPrice, styles.headerCell]}>Price</Text>
                </View>
                {lineItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                  >
                    <Text style={styles.colDescription}>{item.description}</Text>
                    {showHourlyColumns ? (
                      <>
                        <Text style={styles.colRate}>
                          {item.type === 'hourly' && item.rate != null
                            ? formatCurrency(item.rate, currency)
                            : '-'}
                        </Text>
                        <Text style={styles.colHours}>
                          {item.type === 'hourly' && item.hours != null
                            ? String(item.hours)
                            : '-'}
                        </Text>
                      </>
                    ) : null}
                    <Text style={styles.colPrice}>{formatCurrency(item.price, currency)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Expenses */}
          {hasExpenses ? (
            <View>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colExpenseDesc, styles.headerCell]}>Description</Text>
                  <Text style={[styles.colExpenseCost, styles.headerCell]}>Cost</Text>
                </View>
                {expenses.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                  >
                    <Text style={styles.colExpenseDesc}>{item.description}</Text>
                    <Text style={styles.colExpenseCost}>
                      {formatCurrency(item.price, currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
          </View>

          {/* Notes */}
          {notes ? (
            <View>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notes}>{notes}</Text>
            </View>
          ) : null}

          {/* Payment details */}
          {hasPaymentDetails ? (
            <View>
              <Text style={styles.sectionTitle}>Electronic payments can be made to:</Text>
              <View style={styles.paymentTable}>
                {paymentDetails.bankAccountName ? (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Account Name</Text>
                    <Text style={styles.paymentValue}>{paymentDetails.bankAccountName}</Text>
                  </View>
                ) : null}
                {paymentDetails.bankName ? (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Bank</Text>
                    <Text style={styles.paymentValue}>{paymentDetails.bankName}</Text>
                  </View>
                ) : null}
                {paymentDetails.bankAccountNumber ? (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Account Number</Text>
                    <Text style={styles.paymentValue}>{paymentDetails.bankAccountNumber}</Text>
                  </View>
                ) : null}
                {paymentDetails.bankSortCode ? (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Sort Code</Text>
                    <Text style={styles.paymentValue}>{paymentDetails.bankSortCode}</Text>
                  </View>
                ) : null}
                {paymentDetails.reference ? (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Reference</Text>
                    <Text style={styles.paymentValue}>{paymentDetails.reference}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
