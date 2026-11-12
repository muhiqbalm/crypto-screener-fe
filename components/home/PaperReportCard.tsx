'use client'

import Link from 'next/link'
import { ArrowRight, Bell } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { StatusPill } from '@/components/ui/status-pill'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { formatAge } from '@/lib/utils/time'
import { safeNotificationLink } from '@/lib/lab/report'
import type { LabNotification } from '@/lib/api/types/report'
import type { PaperSummary } from '@/components/home/logic'

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )
}

function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-3xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="num text-lg font-bold leading-7">{value}</dd>
    </div>
  )
}

export interface ReportView {
  /** "3 Nov – 10 Nov" */
  range: string | null
  lines: string[]
}

/**
 * Paper & laporan [PAPER]. Admins: paper presets (progress to the review
 * target, never a "ready for live" label), last week's frozen report and up
 * to 3 unread notifications. Everyone else: the report summary only.
 */
export function PaperReportCard({
  admin,
  paper,
  paperLoading,
  paperError,
  report,
  reportLoading,
  reportUnavailable,
  notifications,
}: {
  admin: boolean
  paper: PaperSummary | null
  paperLoading: boolean
  paperError: boolean
  report: ReportView | null
  reportLoading: boolean
  /** No access yet or no frozen week: say so, link to the page. */
  reportUnavailable: boolean
  notifications: LabNotification[]
}) {
  const progress = paper?.leader ? Math.min(100, Math.round((paper.leader.closed / paper.target) * 100)) : 0
  return (
    <Section
      title={
        admin ? (
          <>
            Paper &amp; laporan <StatusPill kind="paper" size="xs" />
          </>
        ) : (
          'Laporan mingguan'
        )
      }
      action={admin ? <LinkRow href="/lab/arena">Paper berjalan</LinkRow> : undefined}
    >
      <div className="space-y-4">
        {admin &&
          (paperLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : paperError || !paper ? (
            <p className="text-sm text-muted-foreground">Data paper tidak tersedia saat ini.</p>
          ) : paper.presets === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada preset yang berjalan di paper. Mulai dari menu Preset.</p>
          ) : (
            <div className="space-y-3">
              <dl className="grid grid-cols-3 gap-3">
                <Stat label="Preset berjalan" value={paper.presets} />
                <Stat label={<Term k="ready_review" />} value={paper.ready} />
                <Stat label="Menyimpang" value={paper.drifting} />
              </dl>
              {paper.leader && (
                <div className="space-y-1">
                  <p className="flex flex-wrap justify-between gap-x-2 text-2xs text-muted-foreground">
                    <span>
                      Trade terbanyak: <span className="font-medium text-foreground">{paper.leader.name}</span>
                    </span>
                    <span className="num">
                      {paper.leader.closed} / {paper.target} trade
                    </span>
                  </p>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={paper.target}
                    aria-valuenow={paper.leader.closed}
                    aria-label={`Progres menuju ${paper.target} trade simulasi`}
                  >
                    <div className="h-full rounded-full bg-lab" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}

        <div className="space-y-1.5">
          <p className="eyebrow">Laporan minggu lalu{report?.range ? ` · ${report.range}` : ''}</p>
          {reportLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : reportUnavailable || !report ? (
            <p className="text-sm text-muted-foreground">Ringkasan belum tersedia di sini. Buka halamannya untuk melihat laporan.</p>
          ) : report.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Laporan final minggu lalu tidak punya data ringkasan.</p>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {report.lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}
          <LinkRow href="/lab/report">Buka laporan</LinkRow>
        </div>

        {admin && notifications.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="eyebrow flex items-center gap-1.5">
              <Bell className="h-3 w-3" aria-hidden="true" />
              Notifikasi belum dibaca
            </p>
            <ul className="space-y-1">
              {notifications.map((n) => {
                const href = safeNotificationLink(n.link)
                const body = (
                  <>
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    <span className="shrink-0 text-2xs text-muted-foreground">{formatAge(n.created_at)}</span>
                  </>
                )
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-2 rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {body}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 text-sm">{body}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}
