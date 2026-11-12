import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms for basket paper strategies (one default strategy on many coins, one
 * simulated account). Same shape as lib/glossary.ts; keys must not exist in any other file.
 */
export const GLOSSARY_EXTRA_BASKET = {
  basket: {
    label: 'Basket',
    tip: 'Satu strategi dengan parameter default di daftar koin yang tetap; semua koin masuk ke satu akun simulasi dan dihitung bersama.',
    group: 'lab',
  },
  basket_checkpoint: {
    label: 'Checkpoint basket',
    tip: 'Penilaian otomatis tiap Senin setelah minimal 30 transaksi, 28 hari, 8 koin, dan 10 hari entry berbeda.',
    group: 'lab',
  },
  basket_fidelity: {
    label: 'Cocok dengan engine',
    tip: 'Paper mengikuti sinyal engine di bar yang sama: minimal 90% sinyal diikuti dan selisih hasil median paling besar 0.30 poin %.',
    group: 'lab',
  },
  pre_paper_position: {
    label: 'Posisi sebelum paper',
    tip: 'Strategi sudah memegang posisi saat paper dimulai. Posisi itu tidak disalin; paper masuk di sinyal berikutnya.',
    group: 'lab',
  },
  praregistrasi: {
    label: 'Praregistrasi',
    tip: 'Aturan uji (koin, parameter, ukuran, syarat lulus dan gagal) dikunci sebelum hasilnya dilihat.',
    group: 'lab',
  },
} as const satisfies GlossaryDict
