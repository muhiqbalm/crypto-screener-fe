'use client'

import { useState } from 'react'
import { Loader2, Plus, Wallet } from 'lucide-react'
import { DeckCard } from '@/components/lab/arena/deck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatUsd, formatUsdSigned } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
import { StatusPill } from '@/components/ui/status-pill'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { openPositionCount } from '@/lib/lab/paper'
import { useCreatePaperAccount, usePaperAccounts } from '@/lib/queries/paper'


interface FormState {
  name: string
  starting_balance: string
  risk_pct: string
  leverage_max: string
}

const INITIAL: FormState = { name: '', starting_balance: '10000', risk_pct: '1', leverage_max: '5' }

function validateAccountForm(f: FormState): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.name.trim()) e.name = 'Nama wajib diisi'
  const bal = Number(f.starting_balance)
  if (!Number.isFinite(bal) || bal <= 0) e.starting_balance = 'Saldo awal harus > 0'
  const risk = Number(f.risk_pct)
  if (!Number.isFinite(risk) || risk <= 0 || risk > 100) e.risk_pct = 'Risiko 0–100%'
  const lev = Number(f.leverage_max)
  if (!Number.isFinite(lev) || lev < 1 || lev > 125) e.leverage_max = 'Leverage 1–125×'
  return e
}

export function PaperAccountsSection() {
  const q = usePaperAccounts()
  const create = useCreatePaperAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    const e = validateAccountForm(form)
    setErrors(e)
    if (Object.keys(e).length) return
    create.mutate(
      {
        name: form.name.trim(),
        starting_balance: Number(form.starting_balance),
        risk_pct: Number(form.risk_pct),
        leverage_max: Number(form.leverage_max),
      },
      {
        onSuccess: () => {
          notify.success('Akun simulasi dibuat')
          setForm(INITIAL)
          setOpen(false)
        },
        onError: () => notify.error('Akun simulasi gagal dibuat', { description: 'Cek isian lalu coba lagi.' }),
      },
    )
  }

  const accounts = q.data ?? []

  return (
    <DeckCard
      icon={Wallet}
      iconTone="lab"
      title={
        <span className="inline-flex items-center gap-2">
          Akun simulasi <StatusPill kind="paper" size="xs" />
        </span>
      }
      action={
        <Button variant="outline" className="gap-1.5 rounded-full" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Akun baru
        </Button>
      }
    >
      <div className="space-y-4">
        {open && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-5">
            {(
              [
                ['name', 'Nama', 'text'],
                ['starting_balance', 'Saldo awal (USDT)', 'number'],
                ['risk_pct', 'Risiko per transaksi (%)', 'number'],
                ['leverage_max', 'Leverage maks. (×)', 'number'],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`acc-${key}`} className="text-xs font-medium">{label}</label>
                <Input
                  id={`acc-${key}`}
                  type={type}
                  step="any"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  aria-invalid={Boolean(errors[key])}
                  className={cn('h-8 text-xs', type === 'number' && 'font-mono', errors[key] && 'border-bearish')}
                />
                {errors[key] && <p className="text-2xs text-bearish">{errors[key]}</p>}
              </div>
            ))}
            <div className="flex items-end">
              <Button size="sm" className="w-full" onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                Buat akun
              </Button>
            </div>
          </div>
        )}

        {q.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : q.error ? (
          <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Akun simulasi tidak bisa dimuat." />
        ) : accounts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Belum ada akun simulasi. Tombol &quot;Mulai paper&quot; di Preset membuatnya otomatis, atau klik &quot;Akun baru&quot;.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-2xl border bg-background/40 p-5">
                <div className="truncate text-[17px] font-semibold">{a.name}</div>
                <div className="text-[13px] text-muted-foreground">dibuat {formatTime(a.created_at)}</div>
                <div className="font-display mt-3 text-2xl font-bold tabular-nums">{formatUsd(a.equity)}</div>
                <div className="text-[13px] text-muted-foreground">ekuitas</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[14px] tabular-nums">
                  <dt className="text-muted-foreground">Hasil tertutup</dt>
                  <dd className={cn('text-right font-semibold', signClass(a.realized_pnl))}>{formatUsdSigned(a.realized_pnl)}</dd>
                  <dt className="text-muted-foreground">Posisi terbuka</dt>
                  <dd className="text-right">{openPositionCount(a)}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </DeckCard>
  )
}
