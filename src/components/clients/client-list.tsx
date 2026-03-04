import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientCard } from './client-card'
import { ClientFormDialog } from './client-form-dialog'
import { Plus, Search, Users } from 'lucide-react'

export function ClientList() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const clients = useLiveQuery(() => db.clients.toArray())

  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (!search.trim()) return clients
    const lower = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower),
    )
  }, [clients, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add Client
        </Button>
      </div>

      {clients === undefined ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading clients...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="mb-4 size-12 text-muted-foreground/50" />
          {search.trim() ? (
            <>
              <h3 className="text-lg font-medium">No clients found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No clients match "{search}". Try a different search term.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">No clients yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding your first client.
              </p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add Your First Client
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      <ClientFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
