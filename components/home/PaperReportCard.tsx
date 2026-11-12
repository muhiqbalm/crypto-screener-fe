'use client'

import Link from 'next/link'
import { ArrowRight, Bell, FileText, FlaskConical } from 'lucide-react'
import { Panel } from '@/components/ui/hero-card'
import { IconTitle } from '@/components/ui/icon-title'
import { StatusPill } from '@/components/ui/status-pill'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import type { LabNotification } from '@/lib/api/types/report'
import type { PaperSummary } from '@/components/home/logic'

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

function Mini({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num display text-lg font-extrabold">{value}</dd>
    </div>
  )
}

export interface ReportView {
  /** "3 Nov – 10 Nov" */
  range: string | null
  lines: string[]
}

/**
 * Paper [PAPER] card. Admins: the preset closest to the review target as a
 * big "12/30" + progress bar (never a "ready for live" label), the preset
 * counts, last week's frozen report in one line and the unread count.
 * Everyone else: the weekly report summary only.
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
  reportUnavailable: boolean
  notifications: LabNotification[]
}) {
  const reportBlock = (
    <div className="space-y-2">
      <p className="eyebrow">Minggu lalu{report?.range ? ` · ${report.range}` : ''}</p>
      {reportLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : reportUnavailable || !report || report.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ringkasan belum tersedia di sini.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {report.lines.slice(0, admin ? 1 : 3).map((l) => (
            <li key={l} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lab" aria-hidden="true" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (!admin) {
    return (
      <Panel aria-labelledby="report-title" className="flex flex-col gap-5 xl:col-span-2">
        <IconTitle icon={FileText} tone="lab" title={<span id="report-title">Laporan mingguan</span>} />
        {reportBlock}
        <div className="mt-auto">
          <LinkRow href="/lab/report">Buka laporan</LinkRow>
        </div>
      </Panel>
    )
  }

  return (
    <Panel aria-labelledby="paper-title" className="flex flex-col gap-5 xl:col-span-2">
      <IconTitle icon={FlaskConical} tone="lab" title={<span id="paper-title">Paper</span>} action={<StatusPill kind="paper" size="xs" />} />
      {paperLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : paperError || !paper ? (
        <p className="text-base text-muted-foreground">Data paper tidak tersedia saat ini.</p>
      ) : paper.accounts === 0 ? (
        <p className="text-base text-muted-foreground">Belum ada preset yang berjalan di paper.</p>
      ) : (
        <>
          {paper.leader && (
            <div className="space-y-2">
              <p className="flex items-baseline gap-2">
                <span className="num display text-4xl font-extrabold leading-none">{paper.leader.closed}</span>
                <span className="num text-xl font-bold text-muted-foreground">/ {paper.target}</span>
                <span className="ml-1 text-sm text-muted-foreground">transaksi</span>
              </p>
              <ProgressBar value={Math.min(paper.leader.closed, paper.target)} max={paper.target} tone="lab" size="lg" label={`${paper.leader.name}: progres menuju ${paper.target} transaksi simulasi`} />
              <p className="break-words text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{paper.leader.name}</span>
                {paper.leader.closed >= paper.target ? ` · target ${paper.target} tercapai` : ` · kurang ${paper.target - paper.leader.closed} lagi`}
              </p>
            </div>
          )}
          <dl className="space-y-1.5 border-t pt-4">
            <Mini label="Preset berjalan" value={paper.presets} />
            <Mini label={<Term k="ready_review" />} value={paper.ready} />
            <Mini label="Menyimpang dari uji" value={paper.drifting} />
          </dl>
        </>
      )}
      {reportBlock}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <LinkRow href="/lab/arena">Paper berjalan</LinkRow>
        {notifications.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {notifications.length} belum dibaca
          </span>
        )}
      </div>
    </Panel>
  )
}
