import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms owned by W3a (Uji strategi). Only that agent edits this file.
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary
 * file (lib/glossary.test.ts fails on duplicates).
 */
export const GLOSSARY_EXTRA_W3A = {
  param_stability: {
    label: 'Stabil antar koin dan tahun',
    short: 'Stabil',
    tip: 'Penting & stabil: berpengaruh di sebagian besar koin dan tahun uji. Penting tapi tidak stabil: berpengaruh, tapi arahnya beda-beda antar koin atau tahun, jadi hati-hati mengubahnya.',
    values: {
      'penting & stabil': 'penting & stabil',
      'penting tapi tidak stabil': 'penting tapi tidak stabil',
      'tidak berpengaruh': 'tidak berpengaruh',
    },
    group: 'lab',
  },
  param_influence: {
    label: 'Pengaruh',
    tip: 'Seberapa besar parameter ini mengubah hasil, dibanding parameter terkuat di daftar. Dasarnya disebut di judul langkah (riset atau run).',
    group: 'lab',
  },
  param_plateau: {
    label: 'Rentang stabil',
    tip: 'Rentang nilai yang hasilnya tetap bagus di riset dan tidak berubah tajam. Lebih aman daripada satu angka terbaik, tapi bukan jaminan.',
    aliases: ['Plateau'],
    group: 'lab',
  },
} as const satisfies GlossaryDict
