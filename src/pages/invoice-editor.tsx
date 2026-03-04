import { useParams } from 'react-router-dom'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">
        {isEditing ? 'Edit Invoice' : 'New Invoice'}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {isEditing
          ? `Editing invoice ${id}.`
          : 'Create a new invoice.'}
      </p>
    </div>
  )
}
