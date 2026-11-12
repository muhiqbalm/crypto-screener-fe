import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms for the signal quality grade ("Skor kualitas sinyal").
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary file.
 */
export const GLOSSARY_EXTRA_QUALITY = {
  skor_kualitas: {
    label: 'Skor kualitas',
    short: 'Skor',
    tip: 'Seberapa kuat bukti mendukung panggilan ini: A kuat, B cukup, C belum jelas, D tanpa keunggulan; dari batas bawah hasil kasus serupa.',
    values: { A: 'Bukti kuat', B: 'Bukti cukup', C: 'Belum jelas', D: 'Tanpa keunggulan' },
    aliases: ['grade', 'quality score', 'skor sinyal'],
    group: 'outlook',
  },
  rentang_95: {
    label: 'Rentang 95%',
    tip: 'Kisaran rata-rata hasil yang masih masuk akal dengan jumlah kasus yang ada; sampel kecil = rentang lebar. Batas bawahnya dipakai untuk skor.',
    aliases: ['confidence interval', 'batas bawah 95%', '±'],
    group: 'outlook',
  },
  rekam_skor: {
    label: 'Rekam jejak skor',
    tip: 'Hasil nyata panggilan live per skor (A–D), dinilai setelah kejadian. Sebuah skor dianggap teruji setelah minimal 20 posisi selesai.',
    aliases: ['scoreboard', 'graded grade'],
    group: 'rekam_jejak',
  },
} as const satisfies GlossaryDict
