'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/lab/outlook/OutlookBadges'
import { GradeLetter } from '@/components/market/quality/GradeLetter'
import { useCalibrateOutlook, useOutlookTrackRecord } from '@/lib/queries/outlook'
import { coinLabel, formatProb, formatR, formatWib } from '@/lib/lab/outlook'
import { relativeTime } from '@/lib/lab/form'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatPrice, signClass } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import type { CalibStats, OutlookResponse, TrackGroup } from '@/lib/api/types/outlook'

// Rows are 52px high (design spec), text 13px.
const td = 'h-[52px] px-3 py-3 text-right font-mono tabular-nums'
const tdl = 'h-[52px] px-3 py-3 text-left'
const thc = 'px-3 py-2.5 text-right text-3xs font-medium uppercase tracking-wide text-muted-foreground'

function StatsRow({ label, s }: { label: React.ReactNode; s: CalibStats | undefined }) {
  if (!s || !s.n_cases) {
    return (
      <tr>
        <td className={tdl}>{label}</td>
        <td colSpan={6} className="h-[52px] px-3 py-3 text-muted-foreground">belum ada data</td>
      </tr>
    )
  }
  return (
    <tr>
      <td className={tdl}>{label}</td>
      <td className={td}>{s.n_pos.toLocaleString('en-US')}</td>
      <td className={td}>{formatProb(s.p_tp)}</td>
      <td className={td}>{formatProb(s.p_sl)}</td>
      <td className={td}>{formatProb(s.p_batal)}</td>
      <td className={cn(td, signClass(s.mean_r))}>{formatR(s.mean_r)}</td>
      <td className={cn(td, 'text-muted-foreground')}>{formatR(s.lo95_r)}</td>
    </tr>
  )
}

function LiveRow({ label, g }: { label: string; g: TrackGroup | undefined }) {
  if (!g || !g.n_calls) return null
  return (
    <tr>
      <td className={tdl}>{label}</td>
      <td className={td}>{g.n_calls}</td>
      <td className={td}>{g.n_open}</td>
      <td className={td}>{g.n_done ? formatProb(g.tp) : '—'}</td>
      <td className={td}>{g.n_done ? formatProb(g.sl) : '—'}</td>
      <td className={td}>{g.n_done ? formatProb(g.batal) : '—'}</td>
      <td className={cn(td, signClass(g.mean_r))}>{g.n_done ? formatR(g.mean_r) : '—'}</td>
    </tr>
  )
}

export function OutlookTrackRecord({ data }: { data: OutlookResponse }) {
  const cal = data.calibration
  const groups = data.track_record?.groups ?? {}
  const tr = useOutlookTrackRecord(true)
  const calibrate = useCalibrateOutlook()
  const busy = data.calibrate?.status === 'queued' || data.calibrate?.status === 'running'
  const onCalibrate = () =>
    calibrate.mutate(undefined, {
      onSuccess: () => notify.info('Kalibrasi dijadwalkan', { description: 'Simulasi historis berjalan di worker Lab (beberapa menit).' }),
      onError: (e) => notify.error('Gagal menjadwalkan', { description: apiErrorDetail(e) ?? undefined }),
    })
  const oos = cal?.oos_check
  const fase = cal?.fase_split
  const recent = (tr.data?.recent ?? []).slice(0, 15)
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Setiap panggilan dinilai setelah kejadian: masuk di close 4H, SL &amp; TP terpasang, keluar saat strategi menutup
          posisi, atau setelah 7 hari. R bersih setelah biaya.
        </p>
        {data.can_refresh && (
          <Button variant="outline" size="sm" onClick={onCalibrate} disabled={busy || calibrate.isPending} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            {busy ? 'Kalibrasi berjalan…' : 'Hitung ulang kalibrasi'}
          </Button>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-semibold">Live (panggilan yang tersimpan)</h3>
          <p className="mb-2 text-2xs text-muted-foreground">
            {data.track_record?.first_call ? `Sejak ${formatWib(data.track_record.first_call)}.` : 'Belum ada panggilan tersimpan: rekam jejak live mulai setelah versi ini aktif.'}
          </p>
          {Object.keys(groups).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-2xs">
                <thead>
                  <tr>
                    <th className={cn(thc, 'text-left')}>Kelompok</th>
                    <th className={thc}>Panggilan</th>
                    <th className={thc}>Berjalan</th>
                    <th className={thc}>TP dulu</th>
                    <th className={thc}>SL dulu</th>
                    <th className={thc}>Batal</th>
                    <th className={thc}>Rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <LiveRow label="Semua" g={groups['*|*']} />
                  <LiveRow label="Keyakinan tinggi" g={groups['*|tinggi']} />
                  <LiveRow label="Keyakinan sedang" g={groups['*|sedang']} />
                  <LiveRow label="Keyakinan rendah" g={groups['*|rendah']} />
                  <LiveRow label="Long" g={groups['long|*']} />
                  <LiveRow label="Short" g={groups['short|*']} />
                </tbody>
              </table>
            </div>
          )}
          {recent.length > 0 && (
            <ul className="mt-3 space-y-1 text-2xs">
              {recent.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-1.5">
                  {c.kualitas !== undefined && <GradeLetter grade={c.kualitas} size="xs" />}
                  <StatusBadge status={c.status} />
                  <span className="font-mono font-semibold">{coinLabel(c.symbol)}</span>
                  <span className={c.side === 'long' ? 'text-bullish' : 'text-bearish'}>{c.side?.toUpperCase()}</span>
                  <span className="text-muted-foreground">{c.keyakinan} · {formatWib(c.bar_close)} · {formatPrice(c.price)}</span>
                  {c.r_net !== null && <span className={cn('num', signClass(c.r_net))}>{formatR(c.r_net)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-1 text-xs font-semibold">Simulasi historis (kalibrasi)</h3>
          {!cal ? (
            <p className="text-2xs text-muted-foreground">
              Belum ada kalibrasi. Keyakinan sementara memakai aturan sederhana. Kalibrasi berjalan otomatis seminggu sekali di jam sepi.
            </p>
          ) : (
            <>
              <p className="mb-2 text-2xs text-muted-foreground">
                {cal.counts.cases.toLocaleString('en-US')} panggilan dari {cal.counts.positions.toLocaleString('en-US')} posisi di {cal.counts.coins} koin
                ({formatWib(cal.counts.first)} – {formatWib(cal.counts.last)}), dihitung {relativeTime(cal.computed_at)}.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-2xs">
                  <thead>
                    <tr>
                      <th className={cn(thc, 'text-left')}>Uji label (data sesudah {oos?.split?.slice(0, 10)})</th>
                      <th className={thc}>Posisi</th>
                      <th className={thc}>TP dulu</th>
                      <th className={thc}>SL dulu</th>
                      <th className={thc}>Batal</th>
                      <th className={thc}>Rata-rata</th>
                      <th className={thc} title="Batas bawah 95%">Bawah 95%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <StatsRow label="Keyakinan tinggi" s={oos?.v2['*|tinggi']} />
                    <StatsRow label="Keyakinan sedang" s={oos?.v2['*|sedang']} />
                    <StatsRow label="Keyakinan rendah" s={oos?.v2['*|rendah']} />
                  </tbody>
                </table>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-2xs">
                  <thead>
                    <tr>
                      <th className={cn(thc, 'text-left')}>Fase (sebelum → sesudah {oos?.split?.slice(0, 10)})</th>
                      <th className={thc}>Sebelum</th>
                      <th className={thc}>Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(['long|baru', 'long|berjalan', 'short|baru', 'short|berjalan'] as const).map((k) => (
                      <tr key={k}>
                        <td className={tdl}>{k.replace('|baru', ' · posisi baru').replace('|berjalan', ' · menyusul')}</td>
                        {(['sebelum', 'sesudah'] as const).map((per) => {
                          const v = fase?.[per]?.[k]
                          return (
                            <td key={per} className={cn(td, signClass(v?.mean_r))} title={v ? `${v.n_pos} posisi, bawah 95% ${formatR(v.lo95_r)}` : undefined}>
                              {v ? formatR(v.mean_r) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-2xs text-muted-foreground">
                Label dibuat dari data sebelum {oos?.split?.slice(0, 10)} lalu dicek di data sesudahnya. Temuan utama: masuk saat
                <span className="text-foreground"> posisi baru </span>
                konsisten lebih baik daripada menyusul posisi yang sudah berjalan, di kedua periode.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(cal.factor_lift ?? {}).map(([f, v]) => (
                  <Badge key={f} variant={v.verdict === 'teruji' ? 'bullish' : v.verdict === 'terbalik' ? 'bearish' : 'muted'} size="sm"
                    title={`searah ${formatR(v.searah?.mean_r)} vs berlawanan ${formatR(v.berlawanan?.mean_r)}`}>
                    {f.replace('_', ' ')}: {v.verdict === 'teruji' ? 'teruji' : v.verdict === 'terbalik' ? 'terbalik' : 'belum terbukti'}
                  </Badge>
                ))}
              </div>
              <details className="mt-2 text-2xs text-muted-foreground">
                <summary className="cursor-pointer">Tidak diuji ulang (tanpa riwayat jujur)</summary>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {(cal.excluded ?? []).map((e) => <li key={e.factor}><span className="font-medium text-foreground">{e.factor}</span>: {e.reason}</li>)}
                </ul>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
