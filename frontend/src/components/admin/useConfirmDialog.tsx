import React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmOptions = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      })
    })
  }, [])

  const close = React.useCallback((value: boolean) => {
    setState((prev) => {
      if (prev) prev.resolve(value)
      return null
    })
  }, [])

  const ConfirmDialog = React.useCallback(() => {
    if (!state) return null
    const { options } = state
    return (
      <AlertDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {options.cancelText || "取消"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => close(true)}>
              {options.confirmText || "確認"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }, [close, state])

  return [confirm, ConfirmDialog] as const
}

