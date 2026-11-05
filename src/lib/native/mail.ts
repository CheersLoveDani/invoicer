import { isTauri } from '@/lib/runtime'
import type { SmtpSettings } from '@/types'

/**
 * Sends email through the user's own mail account, from the desktop app.
 * The password goes straight into the OS keychain and is never read back.
 */

export interface OutgoingEmail {
  to: string
  subject: string
  body: string
  /** A styled version of the body. */
  html?: string
  /** Images the HTML shows as "cid:<cid>". */
  inlineImages?: { cid: string; data: Blob }[]
  attachment?: { name: string; data: Blob }
}

export const GMAIL_DEFAULTS: Pick<SmtpSettings, 'host' | 'port' | 'security'> = {
  host: 'smtp.gmail.com',
  port: 465,
  security: 'tls',
}

async function invoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  try {
    return await invoke<T>(command, args)
  } catch (err) {
    // Commands reject with a plain message
    throw new Error(typeof err === 'string' ? err : String(err))
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** The login used for the account: its own username, or the email address. */
export function smtpLogin(smtp: SmtpSettings): string {
  return smtp.username.trim() || smtp.fromEmail.trim()
}

/** Whether there are enough details to try sending. The password is checked when sending. */
export function isMailConfigured(smtp: SmtpSettings | undefined): smtp is SmtpSettings {
  return isTauri() && !!smtp && !!smtp.fromEmail.trim() && !!smtp.host.trim() && smtp.port > 0
}

export const mail = {
  supported: isTauri(),

  savePassword(login: string, password: string): Promise<void> {
    return invoke('smtp_save_password', { username: login, password })
  },

  hasPassword(login: string): Promise<boolean> {
    return invoke('smtp_has_password', { username: login })
  },

  deletePassword(login: string): Promise<void> {
    return invoke('smtp_delete_password', { username: login })
  },

  async send(smtp: SmtpSettings, email: OutgoingEmail): Promise<void> {
    const attachment = email.attachment
      ? {
          attachmentName: email.attachment.name,
          attachmentBase64: await blobToBase64(email.attachment.data),
        }
      : {}
    const inlineImages = await Promise.all(
      (email.inlineImages ?? []).map(async (image) => ({
        cid: image.cid,
        contentType: image.data.type || 'image/png',
        base64: await blobToBase64(image.data),
      })),
    )
    await invoke('smtp_send', {
      config: {
        host: smtp.host.trim(),
        port: smtp.port,
        security: smtp.security,
        username: smtpLogin(smtp),
        fromName: smtp.fromName,
        fromEmail: smtp.fromEmail.trim(),
      },
      email: { to: email.to, subject: email.subject, body: email.body, html: email.html, inlineImages, ...attachment },
    })
  },
}

/** Start at sign-in and stay in the tray when closed (desktop only). */
export async function setBackgroundMode(enabled: boolean): Promise<void> {
  if (!isTauri()) return
  await invoke('set_background_mode', { enabled })
}
