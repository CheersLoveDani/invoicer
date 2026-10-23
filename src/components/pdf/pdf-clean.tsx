import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Currency, LineItem } from '@/types'
import { formatCurrency, formatDate, calculateTotal } from '@/lib/pdf-utils'

export interface PdfTemplateProps {
  title: string
  invoiceNumber: string
  date: Date
  dueDate?: Date
  from: { name: string; email: string; address: string; phone: string }
  to: { name: string; email: string; address: string }
  lineItems: LineItem[]
  expenses: LineItem[]
  notes: string
  paymentDetails: {
    bankAccountName: string
    bankAccountNumber: string
    bankSortCode: string
    bankName: string
    reference: string
  }
  currency: Currency
  logo?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 10,
    color: '#555',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    marginBottom: 6,
    marginTop: 16,
  },
  // Info table (From / To)
  infoTable: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 3,
  },
  infoLabel: {
    width: 70,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  infoValue: {
    flex: 1,
  },
  // Work table
  table: {
    marginTop: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
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
    fontSize: 9,
    color: '#333',
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#333',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  // Notes
  notes: {
    marginTop: 16,
    fontSize: 9,
    color: '#555',
    lineHeight: 1.5,
  },
  // Payment details table
  paymentTable: {
    marginTop: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 3,
  },
  paymentLabel: {
    width: 120,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  paymentValue: {
    flex: 1,
  },
})

function hasHourlyItems(items: LineItem[]): boolean {
  return items.some((item) => item.type === 'hourly' && item.rate != null && item.hours != null)
}

export function CleanTemplate({
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
        {/* Header with optional logo */}
        <View style={styles.header}>
          {logo ? (
            <View style={styles.logoContainer}>
              <View>
                <Text style={styles.title}>{title || 'Invoice'}</Text>
                <View style={styles.headerRow}>
                  <Text style={styles.headerText}>Invoice: {invoiceNumber}</Text>
                  <Text style={styles.headerText}>Date: {formatDate(date)}</Text>
                  {dueDate ? <Text style={styles.headerText}>Due: {formatDate(dueDate)}</Text> : null}
                </View>
              </View>
              <Image style={styles.logo} src={logo} />
            </View>
          ) : (
            <View>
              <Text style={styles.title}>{title || 'Invoice'}</Text>
              <View style={styles.headerRow}>
                <Text style={styles.headerText}>Invoice: {invoiceNumber}</Text>
                <Text style={styles.headerText}>Date: {formatDate(date)}</Text>
                  {dueDate ? <Text style={styles.headerText}>Due: {formatDate(dueDate)}</Text> : null}
              </View>
            </View>
          )}
        </View>

        {/* From section */}
        <Text style={styles.sectionTitle}>From:</Text>
        <View style={styles.infoTable}>
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

        {/* To section */}
        <Text style={styles.sectionTitle}>To:</Text>
        <View style={styles.infoTable}>
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
      </Page>
    </Document>
  )
}
