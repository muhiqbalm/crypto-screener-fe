import type { PageHelpContent } from '@/components/shell/page'

/** "Apa ini? · Cara pakai" for the Paper berjalan hub (Klasemen and Jurnal). Server-safe. */
export const PAPER_HELP: PageHelpContent = {
  apaIni: (
    <>
      Preset yang dijalankan di <b>akun simulasi</b>: Lab menghitung sinyal preset tiap candle tutup dan membuka posisi pura-pura.
      Tidak ada order sungguhan ke exchange.
    </>
  ),
  caraPakai: [
    'Mulai paper dari halaman Preset (tombol "Mulai paper"). Preset itu langsung muncul di Klasemen.',
    'Klasemen menjawab: preset mana yang masih sesuai hasil ujinya dan mana yang menyimpang. Ketuk satu baris untuk detailnya.',
    'Tim baru menilai sebuah preset setelah 30 transaksi tertutup; sebelum itu angkanya masih anekdot.',
    'Basket = satu strategi default di banyak koin dengan satu akun; dihitung sebagai satu baris, progresnya x/30 transaksi gabungan semua koin.',
    'Jurnal berisi setiap transaksi paper. Transaksi bot live (uang asli) disembunyikan kecuali kamu menyalakannya.',
  ],
  istilah: ['paper', 'paper_progress', 'basket', 'pre_paper_position', 'drift', 'fair_range', 'r_multiple', 'live_bot_trades'],
}
