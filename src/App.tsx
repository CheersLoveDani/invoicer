import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import DashboardPage from '@/pages/dashboard'
import InvoicesPage from '@/pages/invoices'
import InvoiceEditorPage from '@/pages/invoice-editor'
import ClientsPage from '@/pages/clients'
import SettingsPage from '@/pages/settings'

// A data router, so the editor can hold navigation while there are unsaved changes
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/invoices', element: <InvoicesPage /> },
      { path: '/invoices/new', element: <InvoiceEditorPage /> },
      { path: '/invoices/:id', element: <InvoiceEditorPage /> },
      { path: '/clients', element: <ClientsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
