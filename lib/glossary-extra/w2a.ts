import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms owned by W2a (Peluang koin). Only that agent edits this file.
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary
 * file (lib/glossary.test.ts fails on duplicates).
 */
export const GLOSSARY_EXTRA_W2A = {
  kasus_serupa: {
    label: 'Kasus serupa',
    tip: 'Panggilan Outlook di masa lalu dengan arah, fase posisi dan jenis bukti strategi yang sama, dihitung ulang tanpa melihat masa depan lalu dinilai hasilnya.',
    aliases: ['similar calls', 'kalibrasi'],
    group: 'outlook',
  },
  zona_entry: {
    label: 'Zona entry',
    tip: 'Kisaran harga masuk yang masih sesuai rencana: harga close ± seperempat jarak ke SL. Di luar zona, untung : rugi memburuk.',
    aliases: ['entry zone'],
    group: 'outlook',
  },
  batal_kalau: {
    label: 'Batal kalau',
    tip: 'Kondisi yang membuat rencana tidak berlaku lagi: harga menyentuh SL, strategi menutup atau membalik posisi, atau horizon 7 hari habis.',
    aliases: ['invalidation'],
    group: 'outlook',
  },
  konteks_searah: {
    label: 'Konteks searah',
    tip: 'Berapa dari faktor 1D, 1H dan kondisi BTC yang searah dengan arah strategi. Di uji historis belum terbukti menambah keunggulan.',
    aliases: ['k dari n', 'MTF alignment'],
    group: 'outlook',
  },
  peluang_terbaik: {
    label: 'Peluang terbaik',
    tip: 'Hanya panggilan yang kasus serupanya terbukti untung (batas bawah 95% di atas nol), diurutkan dari nilai harapannya.',
    aliases: ['ranking', 'peluang'],
    group: 'outlook',
  },
  posisi_skor: {
    label: 'Posisi skor',
    tip: 'Peringkat skor screener koin ini di antara semua koin; ke-1 berarti skor tertinggi.',
    aliases: ['Score'],
    group: 'pasar',
  },
} as const satisfies GlossaryDict
