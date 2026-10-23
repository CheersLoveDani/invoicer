import { useState } from 'react'
import { Check, Copy, Mail, Send } from 'lucide-react'
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
import { openEmailDraft } from '@/lib/email-utils'

interface SendInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientEmail: string
  subject: string
  body: string
  title?: string
  description?: string
  /** Shown when the email is for an invoice that should be recorded as sent. */
  onConfirmSend?: () => void
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={handleCopy}
      className="text-muted-foreground"
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {copied ? (
        <Check key="done" className="size-3.5 animate-pop text-success" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  recipientEmail,
  subject,
  body,
  title = 'Email the invoice',
  description = 'Open a ready-made draft in your mail app, or copy the parts you need. Drag the PDF card onto the draft to attach it.',
  onConfirmSend,
}: SendInvoiceDialogProps) {
  async function handleOpenMail() {
    try {
      await openEmailDraft({ to: recipientEmail, subject, body })
    } catch (err) {
      console.error('Failed to open mail app:', err)
      toast.error('No mail app opened. Copy the email instead.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>To</Label>
              <CopyButton text={recipientEmail} label="Email address" />
            </div>
            <Input value={recipientEmail} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Subject</Label>
              <CopyButton text={subject} label="Subject" />
            </div>
            <Input value={subject} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              <CopyButton text={body} label="Message" />
            </div>
            <Textarea value={body} readOnly className="max-h-60 min-h-32 bg-muted/50" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleOpenMail} disabled={!recipientEmail}>
            <Mail />
            Open in mail app
          </Button>
          {onConfirmSend ? (
            <Button onClick={onConfirmSend}>
              <Send />
              Mark as sent
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
