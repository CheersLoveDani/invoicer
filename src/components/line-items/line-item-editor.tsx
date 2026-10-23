import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, GripVertical, Package, Plus, Receipt, Settings2, Trash2 } from 'lucide-react'
import type { Currency, LineItem, LineItemType } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LineItemEditorProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  currency: Currency
  /** What a new row is, and what the empty state calls the list. */
  kind?: 'work' | 'expenses'
}

const TYPE_CONFIG: Record<LineItemType, { label: string; icon: typeof Clock }> = {
  hourly: { label: 'Hourly', icon: Clock },
  fixed: { label: 'Fixed price', icon: Package },
  expense: { label: 'Expense', icon: Receipt },
  custom: { label: 'Other', icon: Settings2 },
}

function createLineItem(type: LineItemType): LineItem {
  return {
    id: uuid(),
    type,
    description: '',
    rate: type === 'hourly' ? 0 : undefined,
    hours: type === 'hourly' ? 0 : undefined,
    price: 0,
  }
}

/**
 * A number input that keeps what is typed ("0.", "0.5", "") instead of
 * snapping back to the parsed number on every keystroke.
 */
function NumberField({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: number | undefined
  onValueChange: (value: number) => void
}) {
  const [text, setText] = useState(() => (value ? String(value) : ''))

  // Follow changes made elsewhere (e.g. switching type) without fighting the user's typing
  if (parseFloat(text || '0') !== (value ?? 0)) {
    setText(value ? String(value) : '')
  }

  return (
    <Input
      {...props}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const next = e.target.value.replace(',', '.')
        if (!/^\d*\.?\d*$/.test(next)) return
        setText(next)
        onValueChange(parseFloat(next) || 0)
      }}
      className={cn('h-9 text-right tabular', className)}
    />
  )
}

interface SortableRowProps {
  item: LineItem
  currency: Currency
  onUpdate: (id: string, updates: Partial<LineItem>) => void
  onRemove: (id: string) => void
}

function SortableRow({ item, currency, onUpdate, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const config = TYPE_CONFIG[item.type]
  const symbol = CURRENCY_SYMBOLS[currency]

  const changeType = (type: LineItemType) => {
    if (type === 'hourly') {
      onUpdate(item.id, { type, rate: item.rate ?? item.price, hours: item.hours ?? 1, price: (item.rate ?? item.price) * (item.hours ?? 1) })
    } else {
      onUpdate(item.id, { type, rate: undefined, hours: undefined })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex animate-rise flex-wrap items-center gap-2 rounded-lg border bg-card p-2 transition-shadow sm:flex-nowrap',
        isDragging && 'relative z-50 shadow-lift',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`${config.label}: change type`}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <config.icon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(Object.keys(TYPE_CONFIG) as LineItemType[]).map((type) => {
            const { label, icon: Icon } = TYPE_CONFIG[type]
            return (
              <DropdownMenuItem key={type} onClick={() => changeType(type)}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        placeholder={item.type === 'hourly' ? 'What was the work?' : 'Description'}
        value={item.description}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
        className="h-9 min-w-40 flex-1"
      />

      {item.type === 'hourly' ? (
        <div className="flex items-center gap-1.5">
          <NumberField
            aria-label="Hours"
            placeholder="Hours"
            value={item.hours}
            onValueChange={(hours) => onUpdate(item.id, { hours, price: (item.rate ?? 0) * hours })}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">hrs at</span>
          <NumberField
            aria-label={`Rate in ${symbol} per hour`}
            placeholder={`${symbol}/h`}
            value={item.rate}
            onValueChange={(rate) => onUpdate(item.id, { rate, price: rate * (item.hours ?? 0) })}
            className="w-24"
          />
          <span className="w-24 text-right text-sm font-medium tabular">
            {formatCurrency(item.price, currency)}
          </span>
        </div>
      ) : (
        <NumberField
          aria-label={`Amount in ${symbol}`}
          placeholder={`${symbol}0.00`}
          value={item.price}
          onValueChange={(price) => onUpdate(item.id, { price })}
          className="w-32"
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove item"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export function LineItemEditor({ items, onChange, currency, kind = 'work' }: LineItemEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleAddItem = useCallback(
    (type: LineItemType) => onChange([...items, createLineItem(type)]),
    [items, onChange],
  )

  const handleUpdate = useCallback(
    (id: string, updates: Partial<LineItem>) =>
      onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item))),
    [items, onChange],
  )

  const handleRemove = useCallback(
    (id: string) => onChange(items.filter((item) => item.id !== id)),
    [items, onChange],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        onChange(arrayMove(items, oldIndex, newIndex))
      }
    },
    [items, onChange],
  )

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const addTypes: LineItemType[] = kind === 'expenses' ? ['expense', 'fixed', 'custom'] : ['hourly', 'fixed', 'custom']

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {addTypes.map((type) => {
          const { label, icon: Icon } = TYPE_CONFIG[type]
          return (
            <Button key={type} type="button" variant="outline" size="sm" onClick={() => handleAddItem(type)}>
              <Plus className="size-3.5" />
              <Icon className="size-3.5 text-muted-foreground" />
              {label}
            </Button>
          )
        })}
        {items.length > 0 && (
          <p className="ml-auto text-sm text-muted-foreground">
            Subtotal{' '}
            <span className="font-semibold text-foreground tabular">{formatCurrency(subtotal, currency)}</span>
          </p>
        )}
      </div>
    </div>
  )
}
