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
    <section aria-labelledby="mulai-title" className="relative rounded-3xl border border-brand/30 bg-brand/[0.06] p-5 sm:p-6">
      <button
        type="button"
        onClick={close}
        aria-label="Tutup kartu Mulai di sini"
        className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <h2 id="mulai-title" className="display pr-12 text-lg font-bold">
        Mulai di sini
      </h2>
      <p className="mt-0.5 pr-12 text-sm text-muted-foreground">Empat hal yang dicek tiap hari.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tasks(isAdmin).map((t, i) => (
          <li key={t.href} className="min-w-0">
            <Link
              href={t.href}
              className="lift group flex h-full items-center gap-3 rounded-2xl border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                <t.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">
                  <span className="num mr-1.5 text-brand">{i + 1}.</span>
                  {t.title}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{t.text}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
