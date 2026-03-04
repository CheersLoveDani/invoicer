import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TemplateCard } from './template-card'
import { TemplateFormDialog } from './template-form-dialog'
import { FileText, Plus, Search } from 'lucide-react'

export function TemplateList() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const templates = useLiveQuery(() => db.templates.toArray())

  const filteredTemplates = useMemo(() => {
    if (!templates) return []
    if (!search.trim()) return templates
    const lower = search.toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.title.toLowerCase().includes(lower),
    )
  }, [templates, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add Template
        </Button>
      </div>

      {templates === undefined ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 size-12 text-muted-foreground/50" />
          {search.trim() ? (
            <>
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No templates match "{search}". Try a different search term.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">No templates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a reusable invoice template to speed up invoicing.
              </p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add Your First Template
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <TemplateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
