import type { NotificationProvider } from "@refinedev/core"
import { toast } from "sonner"

const byKey = new Map<string, string | number>()

export const adminNotificationProvider: NotificationProvider = {
  open: ({ key, message, description, type }) => {
    const text = description ? `${message}\n${description}` : message
    let id: string | number
    if (type === "success") id = toast.success(text)
    else if (type === "error") id = toast.error(text)
    else id = toast(text)
    if (key) byKey.set(key, id)
  },
  close: (key: string) => {
    const id = byKey.get(key)
    if (id !== undefined) {
      toast.dismiss(id)
      byKey.delete(key)
      return
    }
    toast.dismiss()
  },
}

