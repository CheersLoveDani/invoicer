import { useCallback } from 'react'
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
import type { LineItem, LineItemType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  DollarSign,
  GripVertical,
  Package,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'

interface LineItemEditorProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  label?: string
}

const TYPE_CONFIG: Record<
  LineItemType,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }
> = {
  hourly: { label: 'Hourly', icon: <Clock className="size-3" />, variant: 'default' },
  fixed: { label: 'Fixed', icon: <Package className="size-3" />, variant: 'secondary' },
  expense: { label: 'Expense', icon: <DollarSign className="size-3" />, variant: 'outline' },
  custom: { label: 'Custom', icon: <Settings2 className="size-3" />, variant: 'secondary' },
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

interface SortableRowProps {
  item: LineItem
  onUpdate: (id: string, updates: Partial<LineItem>) => void
  onRemove: (id: string) => void
}

function SortableRow({ item, onUpdate, onRemove }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = TYPE_CONFIG[item.type]

  const handleRateChange = (value: string) => {
    const rate = parseFloat(value) || 0
    onUpdate(item.id, {
      rate,
      price: rate * (item.hours ?? 0),
    })
  }

  const handleHoursChange = (value: string) => {
    const hours = parseFloat(value) || 0
    onUpdate(item.id, {
      hours,
      price: (item.rate ?? 0) * hours,
    })
  }

  const handlePriceChange = (value: string) => {
    onUpdate(item.id, { price: parseFloat(value) || 0 })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-background p-2 ${
        isDragging ? 'z-50 shadow-lg opacity-90' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Badge variant={config.variant} className="shrink-0 gap-1 text-[10px]">
        {config.icon}
        {config.label}
      </Badge>

      <Input
        placeholder="Description"
        value={item.description}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
        className="h-8 min-w-0 flex-1 text-sm"
      />

      {item.type === 'hourly' ? (
        <>
          <Input
            type="number"
            placeholder="Rate"
            value={item.rate ?? ''}
            onChange={(e) => handleRateChange(e.target.value)}
            className="h-8 w-20 text-sm"
            min={0}
            step="0.01"
          />
          <span className="text-xs text-muted-foreground">x</span>
          <Input
            type="number"
            placeholder="Hours"
            value={item.hours ?? ''}
            onChange={(e) => handleHoursChange(e.target.value)}
            className="h-8 w-20 text-sm"
            min={0}
            step="0.25"
          />
          <span className="text-xs text-muted-foreground">=</span>
          <div className="w-24 rounded-md border bg-muted/50 px-2 py-1.5 text-right text-sm font-medium tabular-nums">
            {item.price.toFixed(2)}
          </div>
        </>
      ) : (
        <Input
          type="number"
          placeholder="Price"
          value={item.price || ''}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="h-8 w-28 text-sm"
          min={0}
          step="0.01"
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        title="Remove item"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export function LineItemEditor({ items, onChange, label }: LineItemEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleAddItem = useCallback(
    (type: LineItemType) => {
      onChange([...items, createLineItem(type)])
    },
    [items, onChange],
  )

  const handleUpdate = useCallback(
    (id: string, updates: Partial<LineItem>) => {
      onChange(
        items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      )
    },
    [items, onChange],
  )

  const handleRemove = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id))
    },
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-medium">{label}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="size-3.5" />
              Add Item
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAddItem('hourly')}>
              <Clock className="size-4" />
              Hourly
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddItem('fixed')}>
              <Package className="size-4" />
              Fixed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddItem('expense')}>
              <DollarSign className="size-4" />
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddItem('custom')}>
              <Settings2 className="size-4" />
              Custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          No items yet. Click "Add Item" to get started.
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end border-t pt-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className="font-semibold tabular-nums">
              {subtotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
