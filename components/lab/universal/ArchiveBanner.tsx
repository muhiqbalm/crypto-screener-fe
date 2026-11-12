import { Archive } from 'lucide-react'

/** Universal v0 is retired (CEO decision K6): out of the menu, data and watches kept, no Lab Telegram. Server-safe. */
export function UniversalArchiveBanner() {
  return (
    <div role="note" className="flex gap-4 rounded-3xl border bg-card p-6">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-muted/60 text-muted-foreground">
        <Archive className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Arsip: dihentikan 10 Nov 2026</p>
        <p className="text-[15px] text-muted-foreground">
          Hasil uji jujur −27% setelah koin yang sudah dihapus dari bursa ikut dihitung. Data dan pantauan lama disimpan; alert Telegram tetap mati.
        </p>
      </div>
    </div>
  )
}
