import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms owned by W3b (Paper & laporan). Only that agent edits this file.
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary
 * file (lib/glossary.test.ts fails on duplicates).
 */
export const GLOSSARY_EXTRA_W3B = {
  paper_progress: {
    label: 'Transaksi paper',
    short: 'Transaksi',
    tip: 'Transaksi simulasi yang sudah ditutup. Tim baru menilai preset setelah minimal 30 transaksi.',
    group: 'laporan',
  },
  preset_status: {
    label: 'Status preset',
    tip: 'Belum diuji, Lolos, atau Gagal dari rapor saat disimpan; Paper berjalan atau Menyimpang selama simulasi jalan.',
    values: { belum_diuji: 'Belum diuji', lolos: 'Lolos', gagal: 'Gagal', paper: 'Paper berjalan', menyimpang: 'Menyimpang' },
    group: 'lab',
  },
  mirror_sizing: {
    label: 'Ukuran posisi seperti uji',
    tip: 'Akun simulasi memakai ukuran posisi yang sama dengan uji preset, supaya hasil paper bisa dibandingkan.',
    group: 'lab',
  },
  live_bot_trades: {
    label: 'Trade bot live',
    tip: 'Trade bot live yang diimpor tiap 5 menit. Memakai uang asli, jadi tidak pernah dihitung di statistik paper.',
    group: 'bot',
  },
  weekly_findings: {
    label: 'Ringkasan minggu ini',
    tip: 'Tiga temuan terpenting dari laporan minggu ini, masalah lebih dulu.',
    group: 'laporan',
  },
} as const satisfies GlossaryDict
