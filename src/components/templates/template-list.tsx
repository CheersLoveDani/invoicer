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
            placeholder="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      {templates === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex animate-page flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <FileText className="mb-4 size-12 text-muted-foreground/50" />
          {search.trim() ? (
            <>
              <h3 className="text-[15px] font-semibold">No templates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing matches "{search}".
              </p>
            </>
          ) : (
            <>
              <h3 className="text-[15px] font-semibold">No templates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Save the work and expenses you bill often, and start each invoice already filled in.
              </p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create a template
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template, i) => (
            <div key={template.id} className="animate-rise" style={{ '--i': i } as React.CSSProperties}>
              <TemplateCard template={template} />
            </div>
          ))}
        </div>
      )}

      <TemplateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
