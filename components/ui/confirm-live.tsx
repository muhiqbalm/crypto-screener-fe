'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'

export interface ConfirmLiveProps {
  /** Element that opens the dialog (usually a <Button>). Omit when controlling `open`. */
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The question, e.g. "Nonaktifkan webhook?". The LIVE pill is always shown next to it. */
  title: string
  /** What will happen, in plain words. */
  description: React.ReactNode
  /** Confirm button text, e.g. "Ya, nonaktifkan". */
  confirmLabel: string
  cancelLabel?: string
  /**
   * Runs the action. If it returns a promise the dialog stays open (spinner)
   * until it settles; it closes on success and stays open on error so the
   * caller's error toast is next to the context.
   */
  onConfirm: () => void | Promise<unknown>
  /** External pending flag (e.g. mutation.isPending). */
  pending?: boolean
  /** Red confirm button (turn off / delete / replace). Default true. */
  destructive?: boolean
  /** Ask the user to type LIVE first. Use for irreversible actions (delete API key). */
  typeToConfirm?: boolean
  /** Extra details under the description (what changes, what stays). */
  children?: React.ReactNode
}

const LIVE_WORD = 'LIVE'

/**
 * Confirmation for anything that touches the LIVE bot or real money
 * (DESIGN.md security rule): the dialog always says LIVE (pill + sentence),
 * and can require typing LIVE. Behaviour of the wrapped action is unchanged:
 * this only asks first.
 */
export function ConfirmLive({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  pending: pendingProp,
  destructive = true,
  typeToConfirm,
  children,
}: ConfirmLiveProps) {
  const [openState, setOpenState] = React.useState(false)
  const open = openProp ?? openState
  const [typed, setTyped] = React.useState('')
  const [running, setRunning] = React.useState(false)
  const inputId = React.useId()
  const pending = Boolean(pendingProp) || running
  const typedOk = !typeToConfirm || typed.trim().toUpperCase() === LIVE_WORD

  const setOpen = (v: boolean) => {
    if (pending && !v) return
    if (!v) setTyped('')
    if (openProp === undefined) setOpenState(v)
    onOpenChange?.(v)
  }

  async function confirm() {
    if (!typedOk || pending) return
    let result: unknown
    try {
      result = onConfirm()
    } catch {
      return
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setRunning(true)
      try {
        await result
        setRunning(false)
        setOpen(false)
      } catch {
        setRunning(false)
      }
    } else {
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center sm:justify-start">
            <StatusPill kind="live" label="LIVE · uang asli" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{description}</p>
              <p className="font-medium text-foreground">Aksi ini memengaruhi bot {LIVE_WORD} dan uang asli di exchange.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        {typeToConfirm && (
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-xs font-medium">
              Ketik <span className="num font-bold">{LIVE_WORD}</span> untuk melanjutkan
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={LIVE_WORD}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void confirm()}
            disabled={!typedOk || pending}
            aria-busy={pending || undefined}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
