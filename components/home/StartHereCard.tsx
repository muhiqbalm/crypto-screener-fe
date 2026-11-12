'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, FileText, FlaskConical, Newspaper, Activity, Wallet, X, type LucideIcon } from 'lucide-react'

const KEY = 'bmtm:beranda:mulai:v1'

interface Task {
  href: string
  title: string
  text: string
  Icon: LucideIcon
}

function tasks(isAdmin: boolean): Task[] {
  return [
    { href: '/news', title: 'Cek pasar', text: 'Takut–serakah dan berita hari ini.', Icon: Newspaper },
    isAdmin
      ? { href: '/bot', title: 'Cek bot live', text: 'Apakah sinyal tereksekusi sesuai strategi.', Icon: Activity }
      : { href: '/balance', title: 'Cek saldo & posisi', text: 'Saldo dan posisi kamu di exchange.', Icon: Wallet },
    isAdmin
      ? { href: '/lab', title: 'Uji strategi', text: 'Uji ide di data lama, lalu di data baru.', Icon: FlaskConical }
      : { href: '/koin', title: 'Lihat peluang koin', text: 'Koin mana yang layak dilihat, ke arah mana.', Icon: Compass },
    { href: '/lab/report', title: 'Baca laporan', text: 'Ringkasan minggu lalu: paper, sinyal, bot.', Icon: FileText },
  ]
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'tutup'
  } catch {
    return false
  }
}

/** First-visit card with 4 starting tasks. Closing it is remembered (best effort). */
export function StartHereCard({ isAdmin }: { isAdmin: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(!readDismissed())
  }, [])

  if (!show) return null

  const close = () => {
    setShow(false)
    try {
      window.localStorage.setItem(KEY, 'tutup')
    } catch {
      // storage blocked: it just shows again next time
    }
  }

  return (
    <section aria-labelledby="mulai-title" className="relative rounded-xl border border-brand/30 bg-brand/[0.05] p-4 sm:p-5">
      <button
        type="button"
        onClick={close}
        aria-label="Tutup kartu Mulai di sini"
        className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <h2 id="mulai-title" className="pr-10 text-sm font-semibold">
        Mulai di sini
      </h2>
      <p className="mt-0.5 pr-10 text-xs text-muted-foreground">Empat hal yang biasa dicek tiap hari. Kartu ini bisa ditutup.</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tasks(isAdmin).map((t, i) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="group flex h-full items-start gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-2xs font-bold text-brand">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <t.Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {t.title}
                </span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">{t.text}</span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
