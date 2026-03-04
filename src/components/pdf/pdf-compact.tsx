import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PdfTemplateProps } from './pdf-clean'
import { formatCurrency, formatDate, calculateTotal } from '@/lib/pdf-utils'

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 8,
    color: '#555',
    marginBottom: 1,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    marginTop: 8,
  },
  // Info sections side by side
  infoContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  infoBlock: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 1,
  },
  infoLabel: {
    width: 50,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    fontSize: 7,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
  },
  // Table
  table: {
    marginTop: 2,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 2,
    paddingHorizontal: 4,
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
    fontSize: 7,
    color: '#333',
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginRight: 16,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  // Notes
  notes: {
    marginTop: 8,
    fontSize: 7,
    color: '#555',
    lineHeight: 1.4,
  },
  // Payment details
  paymentTable: {
    marginTop: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    paddingVertical: 1,
  },
  paymentLabel: {
    width: 90,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#555',
  },
  paymentValue: {
    flex: 1,
    fontSize: 8,
  },
})

function hasHourlyItems(items: PdfTemplateProps['lineItems']): boolean {
  return items.some((item) => item.type === 'hourly' && item.rate != null && item.hours != null)
}

export function CompactTemplate({
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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{title || 'Invoice'}</Text>
            <Text style={styles.metaText}>#{invoiceNumber}  |  {formatDate(date)}</Text>
          </View>
          {logo ? <Image style={styles.logo} src={logo} /> : null}
        </View>

        {/* From / To side by side */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>From</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{from.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{from.email}</Text>
            </View>
            {from.address ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{from.address}</Text>
              </View>
            ) : null}
            {from.phone ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{from.phone}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>To</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{to.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{to.email}</Text>
            </View>
            {to.address ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{to.address}</Text>
              </View>
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
              {lineItems.map((item) => (
                <View key={item.id} style={styles.tableRow}>
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
              {expenses.map((item) => (
                <View key={item.id} style={styles.tableRow}>
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
            <Text style={styles.sectionTitle}>Payment Details</Text>
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
      </Page>
    </Document>
  )
}
