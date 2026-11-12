import { Archive } from 'lucide-react'

/** Universal v0 is retired (CEO decision K6): out of the menu, data and watches kept, no Lab Telegram. Server-safe. */
export function UniversalArchiveBanner() {
  return (
    <div role="note" className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
      <Archive className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">Arsip: Universal v0 dihentikan 10 Nov 2026.</p>
        <p className="text-muted-foreground">
          Hasil uji jujurnya −27% setelah koin yang sudah dihapus dari bursa ikut dihitung. Halaman ini disimpan untuk catatan: data, hasil uji dan
          pantauan lama tetap ada dan tidak dihapus. Alert Telegram dari Lab tetap mati.
        </p>
      </div>
    </div>
  )
}
