import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronsUpDown, PenLine, X } from 'lucide-react'
import { clientService } from '@/db'
import type { Client } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

interface ClientPickerProps {
  value?: Client
  onChange: (client: Client | null) => void
}

export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const clients = useLiveQuery(() => clientService.getAll(), [])

  const filtered = (clients ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? value.name : 'Select a client...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search clients..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onChange(client)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value?.id === client.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{client.name}</span>
                    {client.email && (
                      <span className="text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange(undefined as unknown as Client)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <X className="mr-2 size-4" />
                  Clear selection
                </CommandItem>
              )}
              <CommandItem
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                  setSearch('')
                }}
              >
                <PenLine className="mr-2 size-4" />
                Enter manually
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
