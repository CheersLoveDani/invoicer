import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SendInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientEmail: string
  subject: string
  body: string
  onConfirmSend: () => void
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      title={`Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  recipientEmail,
  subject,
  body,
  onConfirmSend,
}: SendInvoiceDialogProps) {
  async function handleCopyAll() {
    try {
      const full = `To: ${recipientEmail}\nSubject: ${subject}\n\n${body}`
      await navigator.clipboard.writeText(full)
      toast.success('Email content copied')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Invoice</DialogTitle>
          <DialogDescription>
            Copy the email details below and paste into your email client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>To</Label>
              <CopyButton text={recipientEmail} label="Email" />
            </div>
            <Input value={recipientEmail} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subject</Label>
              <CopyButton text={subject} label="Subject" />
            </div>
            <Input value={subject} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <CopyButton text={body} label="Body" />
            </div>
            <Textarea
              value={body}
              readOnly
              className="min-h-32 bg-muted/50"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopyAll}>
            <Copy className="mr-2 size-4" />
            Copy All
          </Button>
          <Button onClick={onConfirmSend}>
            Mark as Sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
