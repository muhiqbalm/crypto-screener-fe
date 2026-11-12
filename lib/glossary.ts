/**
 * Glossary: the single source for user-facing terms (audit 02-audit-ux.md §4).
 * One concept = one name. UI shows `label` (or `short` where space is tight)
 * and the one-sentence `tip` behind a tappable InfoTip (`<Term k="holdout" />`).
 * The backend may use the same keys.
 *
 * Numbers inside tips follow the app style (exchange `1,234.56`).
 *
 * Adding terms: W1 owns this file. Other packages add terms in their own file
 * `lib/glossary-extra/<agent>.ts` (already created, merged below). Keys must
 * be unique across all files (enforced by lib/glossary.test.ts).
 */
import { GLOSSARY_EXTRA_W2A } from './glossary-extra/w2a'
import { GLOSSARY_EXTRA_W2B } from './glossary-extra/w2b'
import { GLOSSARY_EXTRA_W3A } from './glossary-extra/w3a'
import { GLOSSARY_EXTRA_W3B } from './glossary-extra/w3b'
import { GLOSSARY_EXTRA_BASKET } from './glossary-extra/basket'

export type GlossaryGroup = 'pasar' | 'outlook' | 'lab' | 'rekam_jejak' | 'bot' | 'laporan' | 'status'

export interface GlossaryEntry {
  /** Label to show in the UI. */
  label: string
  /** Shorter label for tight spaces (table headers, chips). Falls back to `label`. */
  short?: string
  /** One plain-Indonesian sentence; shown in the InfoTip. No tip = no InfoTip. */
  tip?: string
  /** Names for the values of this concept, e.g. arah → LONG / SHORT / NETRAL. */
  values?: Readonly<Record<string, string>>
  /** Old or English names this entry replaces (for search and migration). */
  aliases?: readonly string[]
  group: GlossaryGroup
}

export type GlossaryDict = Readonly<Record<string, GlossaryEntry>>

export const GLOSSARY = {
  // ── 4.1 Pasar & koin ─────────────────────────────────────────────────────
  perpetual: {
    label: 'Kontrak perpetual (USDT)',
    short: 'Perpetual',
    tip: 'Kontrak berjangka tanpa tanggal jatuh tempo, dibayar dalam USDT.',
    aliases: ['Perpetual', 'Perp', 'USDⓈ-M'],
    group: 'pasar',
  },
  funding: {
    label: 'Funding',
    tip: 'Pembayaran tiap 8 jam antara posisi long dan short; positif berarti long membayar short.',
    aliases: ['Avg Funding Rate', 'Funding rate'],
    group: 'pasar',
  },
  funding_apr_7d: {
    label: 'Funding 7 hari (per tahun)',
    tip: 'Rata-rata funding 7 hari terakhir kalau dihitung setahun.',
    aliases: ['Funding 7d APR'],
    group: 'pasar',
  },
  open_interest: {
    label: 'OI (posisi terbuka pasar)',
    short: 'OI',
    tip: 'Total nilai kontrak yang masih terbuka; naik bersama harga berarti ada uang baru masuk.',
    aliases: ['Open Interest'],
    group: 'pasar',
  },
  // Audit 2026-11-13 S2: Binance has three different L/S numbers; screener and Arus besar use two of them.
  long_short_ratio: {
    label: 'Rasio L/S akun top-trader',
    short: 'L/S akun top-trader',
    tip: 'Jumlah akun top-trader Binance yang net long dibagi yang net short (dipakai screener). Beda dengan rasio posisi top-trader dan rasio seluruh pasar.',
    aliases: ['Long/Short Ratio', 'L/S Ratio', 'Rasio long/short', 'Rasio L/S', 'Top Trader Long/Short Ratio (Accounts)'],
    group: 'pasar',
  },
  top_trader_position_ratio: {
    label: 'Rasio L/S posisi top-trader',
    short: 'L/S posisi top-trader',
    tip: 'Besar posisi long top-trader Binance dibagi posisi short-nya (halaman Arus besar). Beda dengan rasio akun top-trader dan rasio seluruh pasar.',
    aliases: ['Top Trader Long/Short Ratio (Positions)'],
    group: 'pasar',
  },
  top_trader: {
    label: 'Trader besar',
    tip: 'Arah posisi top-trader Binance Futures: porsi posisi long dibanding short mereka (rasio posisi, bukan jumlah akun).',
    values: { long: 'condong long', short: 'condong short', netral: 'seimbang' },
    aliases: ['Top Trader Stance', 'Long Skew', 'Short Skew', 'NET LONG', 'BALANCED'],
    group: 'pasar',
  },
  whale_trades: {
    label: 'Transaksi besar (arus besar)',
    short: 'Transaksi besar',
    tip: 'Order ≥ $50,000 yang langsung mengambil harga pasar dalam ±500 transaksi terakhir.',
    aliases: ['Large Taker Buys/Sells', 'Whale'],
    group: 'pasar',
  },
  net_flow: {
    label: 'Selisih beli − jual besar',
    short: 'Selisih beli − jual',
    tip: 'Total beli besar dikurangi jual besar di jendela yang sama.',
    aliases: ['Net Flow'],
    group: 'pasar',
  },
  notional: {
    label: 'Nilai posisi',
    tip: 'Ukuran posisi dalam dolar = modal × leverage.',
    aliases: ['Notional'],
    group: 'pasar',
  },
  screener_score: {
    label: 'Skor screener',
    short: 'Skor',
    tip: 'Gabungan 5 faktor (momentum 30%, funding 25%, OI 20%, rasio L/S akun top-trader 15%, pembalikan 1 hari 10%) dibanding koin lain.',
    aliases: ['Composite Multi-Factor Score', 'Score'],
    group: 'pasar',
  },
  screener_signal: {
    // Audit 2026-11-13 P7: not "sinyal", so it is never read as the strategy's LONG/SHORT.
    label: 'Arah skor screener',
    short: 'Arah skor',
    tip: 'Ke mana 5 faktor pasar condong saat ini. Ini bukan posisi strategi (LONG/SHORT) dan bukan perintah beli atau jual.',
    values: { BULLISH: 'naik', BEARISH: 'turun', NEUTRAL: 'netral' },
    aliases: ['Signal BULLISH / BEARISH / NEUTRAL', 'Sinyal screener', 'Sinyal'],
    group: 'pasar',
  },
  tier: {
    label: 'Kelompok skor',
    short: 'Kelompok',
    tip: 'Sepertiga koin dengan skor tertinggi, tengah, dan terendah, relatif terhadap koin lain.',
    values: { A: 'atas', B: 'tengah', C: 'bawah' },
    aliases: ['Tier A / B / C'],
    group: 'pasar',
  },
  score_consistency: {
    label: 'Kekompakan skor',
    tip: 'Seberapa kuat skor menonjol dan seberapa banyak dari 5 faktor yang searah.',
    aliases: ['Confidence Level (HIGH/MEDIUM)'],
    group: 'pasar',
  },
  momentum_30d: {
    label: 'Momentum 30 hari',
    tip: 'Arah dan kekuatan gerak harga 30 hari terakhir.',
    aliases: ['Trend Momentum (30D)'],
    group: 'pasar',
  },
  reversal_1d: {
    label: 'Pembalikan 1 hari',
    tip: 'Tanda harga sudah naik atau turun terlalu jauh dalam sehari dan bisa berbalik.',
    aliases: ['Mean-Reversion (1D)', 'Overbought/oversold'],
    group: 'pasar',
  },
  atr_pct: {
    label: 'Gejolak harga (ATR %)',
    short: 'Gejolak (ATR %)',
    tip: 'Rata-rata rentang gerak harga per candle, dalam persen.',
    aliases: ['Volatility (ATR %)'],
    group: 'pasar',
  },
  suggested_allocation: {
    label: 'Usulan porsi (lanjutan)',
    short: 'Usulan porsi',
    tip: 'Porsi modal yang mengecil untuk koin yang lebih bergejolak; bukan saran Lab.',
    aliases: ['Suggested Allocation (Inverse Volatility)'],
    group: 'pasar',
  },
  regime: {
    label: 'Kondisi pasar BTC',
    short: 'Kondisi pasar',
    tip: 'Naik = harga di atas rata-rata 200 hari dan rata-rata 50 hari ikut naik; Turun = kebalikannya; selain itu Datar.',
    values: { naik: 'Naik', turun: 'Turun', datar: 'Datar' },
    aliases: ['regime'],
    group: 'pasar',
  },
  ema: {
    label: 'Rata-rata harga 50 / 200 hari',
    tip: 'Rata-rata harga yang memberi bobot lebih besar ke hari-hari terakhir.',
    aliases: ['EMA 50', 'EMA 200'],
    group: 'pasar',
  },
  fear_greed: {
    label: 'Indeks takut–serakah',
    short: 'Takut–serakah',
    tip: 'Angka 0–100 dari alternative.me; rendah berarti pasar takut, tinggi berarti serakah. Hanya konteks.',
    aliases: ['Fear & Greed'],
    group: 'pasar',
  },
  headline_sentiment: {
    label: 'Sentimen judul',
    tip: 'Ditebak dari kata kunci di judul berita, bukan dari isi artikel.',
    values: { BULLISH: 'positif', BEARISH: 'negatif', NEUTRAL: 'netral' },
    aliases: ['Catalyst', 'Macro', 'Regulatory', 'Headline Sentiment', 'net bias'],
    group: 'pasar',
  },
  price_change: {
    label: 'Perubahan harga',
    tip: 'Perubahan harga dalam periode itu.',
    values: { '1d': '1 hari', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' },
    aliases: ['1H / 7H / 30H / 90H (Koin Terkuat)'],
    group: 'pasar',
  },
  history_min: {
    label: 'Data < 120 hari',
    tip: 'Koin dengan data kurang dari 120 hari tidak diberi peringkat.',
    aliases: ['belum layak', 'eligible'],
    group: 'pasar',
  },
  stale_data: {
    label: 'Data terlambat',
    tip: 'Server memakai data terakhir yang berhasil diambil karena pembaruan terbaru gagal.',
    values: { snapshot: 'Data terakhir', stale: 'Data terlambat' },
    aliases: ['Snapshot', 'data basi'],
    group: 'pasar',
  },

  // ── 4.2 Outlook & rencana trade ──────────────────────────────────────────
  direction: {
    label: 'Arah',
    tip: 'Arah mengikuti posisi strategi utama koin itu di close terakhir; NETRAL berarti strategi tidak memegang posisi.',
    values: { LONG: 'LONG', SHORT: 'SHORT', NETRAL: 'NETRAL' },
    aliases: ['Bias LONG / SHORT / NETRAL', 'FLAT'],
    group: 'outlook',
  },
  keyakinan: {
    label: 'Keyakinan',
    tip: 'Diukur dari hasil panggilan serupa di masa lalu, lalu dibatasi oleh hasil uji strateginya.',
    values: { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' },
    aliases: ['keyakinan tinggi / sedang / rendah', 'confidence'],
    group: 'outlook',
  },
  condong: {
    label: 'Condong long / short',
    tip: 'Strategi tidak berposisi, tapi faktor lain lebih banyak ke satu arah.',
    values: { naik: 'condong long', turun: 'condong short' },
    group: 'outlook',
  },
  fresh_signal: {
    label: 'Posisi baru',
    tip: 'Strategi baru masuk posisi di candle 4H terakhir.',
    aliases: ['Sinyal baru', 'BARU', 'fresh'],
    group: 'outlook',
  },
  fase: {
    label: 'Fase posisi',
    tip: 'Posisi baru = strategi masuk tepat di close terakhir; menyusul = posisi strategi sudah berjalan sebelumnya.',
    values: { baru: 'Posisi baru', berjalan: 'Menyusul' },
    group: 'outlook',
  },
  entry: {
    label: 'Harga masuk (entry)',
    short: 'Harga masuk',
    tip: 'Harga saat strategi masuk posisi.',
    group: 'outlook',
  },
  sl: {
    label: 'Batal jika (SL)',
    short: 'SL',
    tip: 'Harga di mana ide trading dianggap salah dan posisi ditutup.',
    aliases: ['SL', 'Stop loss'],
    group: 'outlook',
  },
  tp: {
    label: 'Target (TP)',
    short: 'TP',
    tip: 'Harga ambil untung yang dipasang strategi; ini exit resmi strategi.',
    aliases: ['TP', 'Take profit'],
    group: 'outlook',
  },
  tp1: {
    label: 'Target awal (bersyarat)',
    tip: 'Harga ambil untung lebih awal yang hanya dipakai kalau momentum melemah.',
    aliases: ['TP1', 'exhaustion'],
    group: 'outlook',
  },
  target_realistis: {
    label: 'Target realistis',
    tip: 'Harga yang dicapai setengah dari kasus serupa sebelum posisi ditutup; bukan exit resmi strategi.',
    aliases: ['target_typical', 'gerak tipikal'],
    group: 'outlook',
  },
  rr: {
    // Audit 2026-11-13 P5: the long form carries the short one, so "R:R" in a
    // tight list is recognisably the same number as on the cards.
    label: 'Untung : rugi (R:R)',
    short: 'R:R',
    tip: 'Untung di target dibanding rugi di SL setelah biaya; 2 : 1 berarti target dua kali risiko.',
    aliases: ['R:R', 'Untung : Rugi', 'Reward-to-risk'],
    group: 'outlook',
  },
  money_at_tp: {
    label: 'Untung di target',
    tip: 'Hasil bersih dalam dolar kalau harga sampai target (TP); termasuk fee & slippage, belum funding.',
    aliases: ['Kena TP', 'Kena take profit', 'Di target', 'Profit TP'],
    group: 'outlook',
  },
  money_at_sl: {
    label: 'Rugi di SL',
    tip: 'Hasil bersih dalam dolar kalau harga kena batas rugi (SL); termasuk fee & slippage, belum funding.',
    aliases: ['Kena SL', 'Kena stop loss', 'Di SL', 'Rugi SL'],
    group: 'outlook',
  },
  money_at_tp_sl: {
    label: 'Untung di target / rugi di SL',
    tip: 'Hasil bersih dalam dolar kalau masuk sekarang; termasuk fee & slippage, belum funding.',
    aliases: ['Profit TP', 'Rugi SL'],
    group: 'outlook',
  },
  sizing_mode: {
    label: 'Ukuran posisi',
    tip: 'Pilih ukuran dari modal × leverage, atau dari berapa % modal yang siap hilang di SL.',
    values: { notional: 'dari modal', risk: 'dari risiko' },
    aliases: ['Modal × leverage', 'Risiko % di SL'],
    group: 'outlook',
  },
  leverage: {
    label: 'Leverage (pengali)',
    short: 'Leverage',
    tip: 'Pengali ukuran posisi terhadap modal; 2× berarti posisi dua kali modal.',
    aliases: ['Lev.'],
    group: 'outlook',
  },
  open_pnl: {
    label: 'Untung/rugi berjalan',
    tip: 'Hasil posisi strategi dari entry sampai harga close 4H terakhir.',
    aliases: ['PnL terbuka', 'open R'],
    group: 'outlook',
  },
  contaminated: {
    label: 'Data uji sudah pernah dilihat',
    tip: 'Data baru (holdout) preset ini sudah dipakai saat riset, jadi hasilnya bisa terlalu bagus.',
    aliases: ['tercemar', 'contaminated'],
    group: 'outlook',
  },
  evidence: {
    label: 'Bukti',
    tip: 'Seberapa sering faktor ini benar di masa lalu, dari rekam jejak sinyal atau uji Lab.',
    values: {
      lolos_uji: 'data baru',
      terbukti: 'terbukti',
      belum_terbukti: 'belum terbukti',
      belum_diuji: 'belum diuji',
      historis: 'sejarah',
      konteks: 'konteks',
    },
    group: 'outlook',
  },
  bobot: {
    label: 'Bobot',
    tip: 'Seberapa besar faktor ini menggeser keyakinan.',
    group: 'outlook',
  },
  template_default: {
    label: 'Setting bawaan (belum diuji)',
    tip: 'Koin ini belum punya preset yang diuji; arahnya memakai setting bawaan strategi Rosyade.',
    aliases: ['Default template', 'BELUM DIUJI'],
    group: 'outlook',
  },

  // ── 4.3 Uji strategi, rapor & preset ─────────────────────────────────────
  strategy: {
    label: 'Strategi',
    tip: 'Kumpulan aturan entry dan exit; Rosyade dipakai bot live lewat preset 4H-ETH-Basic.',
    aliases: ['Template', 'Rosyade family'],
    group: 'lab',
  },
  preset: {
    label: 'Preset (setting tersimpan)',
    short: 'Preset',
    tip: 'Set parameter bernama untuk satu strategi × koin × timeframe, misalnya 4H-ETH-v2.',
    group: 'lab',
  },
  timeframe: {
    label: 'Timeframe',
    tip: 'Ukuran satu candle; strategi live memakai 4 jam.',
    values: { '15m': '15 menit', '30m': '30 menit', '1h': '1 jam', '4h': '4 jam', '1d': '1 hari' },
    group: 'lab',
  },
  backtest: {
    label: 'Uji historis cepat (tanpa rapor)',
    short: 'Uji cepat',
    tip: 'Menjalankan strategi di seluruh data lama; untuk coba-coba, bukan bukti.',
    aliases: ['Backtest'],
    group: 'lab',
  },
  validate: {
    label: 'Uji jujur (validasi)',
    short: 'Uji jujur',
    tip: 'Diuji di data baru yang dikunci dan belum pernah dipakai menyetel; hasilnya rapor Lolos/Gagal.',
    aliases: ['Validasi', 'Validate'],
    group: 'lab',
  },
  optimize: {
    label: 'Cari setting terbaik',
    tip: 'Mencoba banyak kombinasi di data latih, lalu menguji yang terbaik sekali di data baru.',
    aliases: ['Cari Parameter Terbaik', 'Optimize', 'Optimasi'],
    group: 'lab',
  },
  trials: {
    label: 'Jumlah percobaan',
    tip: 'Makin banyak kombinasi dicoba, makin besar peluang juara karena kebetulan.',
    aliases: ['Percobaan', 'trials'],
    group: 'lab',
  },
  holdout: {
    label: 'Data baru (holdout)',
    short: 'Data baru',
    tip: '±20% data paling baru yang dikunci; dipakai sekali untuk ujian akhir.',
    aliases: ['Holdout'],
    group: 'lab',
  },
  holdout_locked: {
    label: 'Data baru terkunci',
    tip: 'Sejak validasi pertama, awal data baru untuk strategi × koin × TF ini tidak bisa digeser.',
    aliases: ['Holdout terkunci'],
    group: 'lab',
  },
  in_sample: {
    label: 'Data latih',
    tip: 'Data lama yang dipakai untuk menyetel strategi.',
    aliases: ['In-sample', 'IS'],
    group: 'lab',
  },
  walk_forward: {
    label: 'Uji maju bertahap',
    tip: 'Setel di satu periode, uji di periode sesudahnya, ulangi.',
    aliases: ['Walk-forward'],
    group: 'lab',
  },
  monte_carlo: {
    label: 'Uji acak berulang',
    tip: 'Urutan transaksi diacak berkali-kali; DD95 adalah penurunan yang tidak dilampaui 95% simulasi.',
    aliases: ['Monte Carlo'],
    group: 'lab',
  },
  dd95: {
    label: 'Turun terdalam wajar (DD95)',
    short: 'DD95',
    tip: 'Urutan transaksi diacak berkali-kali; DD95 adalah penurunan yang tidak dilampaui 95% simulasi.',
    aliases: ['DD95'],
    group: 'lab',
  },
  rapor: {
    label: 'Rapor uji',
    tip: '7 syarat yang harus dipenuhi supaya Lolos.',
    aliases: ['Rapor kejujuran'],
    group: 'lab',
  },
  verdict: {
    label: 'Lolos / Gagal',
    tip: 'Lolos = untung di data baru setelah biaya dan memenuhi semua syarat rapor.',
    values: { PASS: 'Lolos', FAIL: 'Gagal', belum_diuji: 'Belum diuji' },
    aliases: ['LOLOS / GAGAL', 'PASS / FAIL'],
    group: 'lab',
  },
  trade: {
    label: 'Transaksi',
    tip: 'Satu posisi dari dibuka sampai ditutup.',
    aliases: ['Trade', 'trade'],
    group: 'lab',
  },
  net_return: {
    label: 'Hasil bersih',
    tip: 'Untung atau rugi total setelah fee, slippage, dan funding.',
    aliases: ['Net return', 'Return', 'Hasil'],
    group: 'lab',
  },
  cagr: {
    label: 'Hasil per tahun',
    tip: 'Rata-rata pertumbuhan modal per tahun.',
    aliases: ['CAGR'],
    group: 'lab',
  },
  max_drawdown: {
    label: 'Turun terdalam',
    tip: 'Penurunan terdalam dari puncak modal (drawdown).',
    aliases: ['Max drawdown', 'Max DD', 'Drawdown', 'Turun maks'],
    group: 'lab',
  },
  profit_factor: {
    label: 'PF (rasio untung/rugi)',
    short: 'PF',
    tip: 'Total untung ÷ total rugi; di atas 1 berarti untung.',
    aliases: ['Profit factor'],
    group: 'lab',
  },
  sharpe: {
    label: 'Kemulusan hasil (Sharpe)',
    short: 'Sharpe',
    tip: 'Hasil dibanding naik-turunnya; makin tinggi makin stabil.',
    aliases: ['Sharpe'],
    group: 'lab',
  },
  win_rate: {
    label: 'Win rate (persentase menang)',
    short: 'Win rate',
    tip: 'Persentase transaksi yang untung.',
    aliases: ['Winrate'],
    group: 'lab',
  },
  cost_stress: {
    label: 'Tahan biaya dobel',
    tip: 'Apakah strategi masih untung kalau fee dan slippage dua kali lipat.',
    aliases: ['Biaya 2×', 'Tahan biaya 2×'],
    group: 'lab',
  },
  cost_drag: {
    label: 'Beban biaya (poin %)',
    short: 'Beban biaya',
    tip: 'Berapa poin persen hasil yang habis untuk biaya.',
    aliases: ['Beban biaya (pp)'],
    group: 'lab',
  },
  cost_vs_range: {
    label: 'Biaya vs gerak candle',
    tip: 'Biaya sekali masuk-keluar dibanding rata-rata gerak satu candle; makin besar makin sulit untung.',
    aliases: ['Biaya bolak-balik vs range candle'],
    group: 'lab',
  },
  fee: {
    label: 'Fee per transaksi',
    short: 'Fee',
    tip: 'Biaya exchange setiap kali beli atau jual.',
    aliases: ['Commission', 'Fee per sisi'],
    group: 'lab',
  },
  maker_taker: {
    label: 'Order limit (maker) / order pasar (taker)',
    tip: 'Maker menunggu di harga tertentu dengan fee lebih murah; taker langsung mengambil harga.',
    values: { maker: 'order limit (maker)', taker: 'order pasar (taker)' },
    aliases: ['Maker', 'Taker'],
    group: 'lab',
  },
  slippage: {
    label: 'Slippage (selisih harga)',
    short: 'Slippage',
    tip: 'Selisih harga eksekusi dengan harga sinyal; 1 bps = 0.01%.',
    group: 'lab',
  },
  data_snooping: {
    label: 'Terlalu banyak mencoba',
    tip: 'Makin banyak yang dicoba, makin besar peluang hasil terbaik cuma kebetulan.',
    aliases: ['Data-snooping'],
    group: 'lab',
  },
  overfitting: {
    label: 'Terlalu pas dengan masa lalu',
    tip: 'Hasil bagus karena disetel ke kebetulan masa lalu, bukan karena pola yang nyata.',
    aliases: ['Overfitting'],
    group: 'lab',
  },
  sensitivity: {
    label: 'Ketahanan setting',
    tip: 'Hasil masih bagus kalau parameter digeser sedikit? Rapuh berarti hasilnya langsung berubah jauh.',
    values: { stabil: 'setting tahan', rapuh: 'setting rapuh' },
    aliases: ['Sensitivitas', 'Stabilitas', 'Parameter rapuh'],
    group: 'lab',
  },
  profitable_segments: {
    label: 'Potongan waktu yang untung',
    tip: 'Dari 4 potongan waktu yang sama panjang, berapa yang untung.',
    aliases: ['Segmen untung'],
    group: 'lab',
  },
  objective: {
    label: 'Cara memilih juara',
    tip: 'Rumus penilaian saat mencari setting terbaik.',
    aliases: ['Objektif'],
    group: 'lab',
  },
  param_importance: {
    label: 'Parameter penting',
    tip: 'Penting = paling mengubah hasil menurut data; sisanya di Lanjutan.',
    values: { penting: 'Parameter penting', lanjutan: 'Lanjutan' },
    aliases: ['Parameter utama', 'Parameter lanjutan'],
    group: 'lab',
  },
  mtf_filter: {
    label: 'Filter timeframe besar',
    tip: 'Arah tren dari timeframe di atasnya dipakai sebagai syarat entry.',
    aliases: ['MTF', 'HTF', 'Timing entry (MTF, riset)'],
    group: 'lab',
  },
  atr: {
    label: 'ATR',
    tip: 'Rata-rata rentang candle; stop digeser mengikuti harga sejauh N × ATR.',
    values: { trailing: 'stop ikut gerak (ATR)' },
    aliases: ['Trailing ATR'],
    group: 'lab',
  },
  adx_chop: {
    label: 'Kekuatan tren (ADX) / pasar sideways',
    tip: 'Di atas batas ADX dianggap tren kuat; di atas batas choppiness entry diblokir.',
    aliases: ['ADX', 'Choppiness'],
    group: 'lab',
  },
  swing_pivot: {
    label: 'Titik balik / pivot / zona order',
    tip: 'Titik tertinggi atau terendah lokal yang dipakai untuk entry dan exit.',
    aliases: ['Swing', 'Pivot', 'Order block'],
    group: 'lab',
  },
  cooldown: {
    label: 'Jeda antar trade',
    tip: 'Berapa bar menunggu setelah exit sebelum boleh masuk lagi.',
    aliases: ['Cooldown'],
    group: 'lab',
  },
  breakeven: {
    label: 'Kunci impas',
    tip: 'Setelah untung sekian, SL digeser ke harga masuk.',
    aliases: ['Kunci breakeven'],
    group: 'lab',
  },
  warmup: {
    label: 'Bar pemanasan',
    tip: 'Bar awal yang hanya dipakai menghitung indikator, tanpa trade.',
    aliases: ['Warm-up bars'],
    group: 'lab',
  },
  sizing_rule: {
    label: 'Ukuran posisi (1× / 2× / VT60)',
    tip: '1× = posisi sebesar modal; 2× = dua kali modal; VT60 = posisi mengecil saat pasar liar (target gejolak 60%/tahun).',
    values: { '1x': '1×', '2x': '2×', vt60: 'ikut gejolak (VT60)' },
    aliases: ['Sizing 1× / 2× / VT60'],
    group: 'lab',
  },
  scan: {
    label: 'Uji banyak koin',
    tip: 'Satu strategi diuji di banyak koin × timeframe sekaligus.',
    values: { heatmap: 'peta hasil' },
    aliases: ['Scan', 'heatmap'],
    group: 'lab',
  },
  run: {
    label: 'Uji',
    tip: 'Satu kali menjalankan strategi.',
    aliases: ['Run'],
    group: 'lab',
  },
  watch: {
    label: 'Pantau sinyal',
    tip: 'Lab menghitung sinyal strategi tiap candle tutup, tanpa order.',
    aliases: ['Watch', 'Pantau'],
    group: 'lab',
  },
  paper: {
    label: 'Paper (simulasi)',
    short: 'Paper',
    tip: 'Posisi pura-pura di akun simulasi; tidak ada order sungguhan.',
    values: { manual: 'paper', auto: 'paper otomatis' },
    aliases: ['Paper otomatis', 'Auto-follow'],
    group: 'lab',
  },
  paper_account: {
    label: 'Akun simulasi',
    tip: 'Akun dengan uang pura-pura, default 10,000 USDT.',
    aliases: ['Akun paper'],
    group: 'lab',
  },
  universal: {
    label: 'Universal (arsip)',
    tip: 'Strategi multi-koin yang dihentikan setelah uji jujur (−27%).',
    aliases: ['Universal v0', 'Rebalance', 'Turnover', 'Eksposur'],
    group: 'lab',
  },

  // ── 4.4 Rekam jejak sinyal ───────────────────────────────────────────────
  ledger: {
    label: 'Rekam jejak sinyal',
    tip: 'Semua sinyal dicatat lalu dicek apakah arahnya benar 4 jam sampai 7 hari kemudian.',
    aliases: ['Catatan Sinyal', 'Signal Ledger'],
    group: 'rekam_jejak',
  },
  hit_rate: {
    label: 'Persentase benar',
    tip: 'Persentase sinyal yang arahnya benar setelah waktu tertentu.',
    aliases: ['Hit rate'],
    group: 'rekam_jejak',
  },
  horizon: {
    label: 'Dicek setelah',
    values: { '4h': '4 jam', '1d': '1 hari', '3d': '3 hari', '7d': '7 hari' },
    aliases: ['Horizon'],
    group: 'rekam_jejak',
  },
  mean_move: {
    label: 'Rata-rata gerak searah sinyal',
    tip: 'Rata-rata pergerakan harga ke arah sinyal, sebelum biaya.',
    aliases: ['Rata-rata', 'Median (return searah sinyal)'],
    group: 'rekam_jejak',
  },
  vs_btc: {
    label: 'Dibanding BTC',
    tip: 'Gerak koin dikurangi gerak BTC, untuk memisahkan sinyal bagus dari arah pasar.',
    aliases: ['vs BTC'],
    group: 'rekam_jejak',
  },
  mfe_mae: {
    label: 'Gerak terbaik / terburuk',
    tip: 'Gerak paling menguntungkan dan paling merugikan selama jendela.',
    aliases: ['MFE', 'MAE'],
    group: 'rekam_jejak',
  },
  uncertainty_range: {
    label: 'Rentang ketidakpastian',
    tip: 'Nilai sebenarnya kemungkinan besar ada di rentang ini; makin lebar makin belum pasti.',
    aliases: ['Interval 95%', 'CI', 'clustered'],
    group: 'rekam_jejak',
  },
  terbukti: {
    label: 'Terbukti',
    tip: 'Rentang ketidakpastian di atas nol, baik gerak mentah maupun dibanding BTC, sebelum biaya. Petunjuk, bukan jaminan.',
    aliases: ['Positif'],
    group: 'rekam_jejak',
  },
  // Audit 2026-11-13 P3: a raw edge that is not also an edge against BTC is not "terbukti".
  searah_pasar: {
    label: 'Searah pasar',
    tip: 'Gerak searah sinyal positif, tapi dibanding BTC rentangnya mencakup nol: kemungkinan hanya ikut arah pasar, belum teruji di kondisi pasar lain.',
    aliases: ['Terbukti (mentah)'],
    group: 'rekam_jejak',
  },
  belum_terbukti: {
    label: 'Belum terbukti',
    tip: 'Rentangnya masih mencakup nol; belum bisa dibedakan dari kebetulan.',
    group: 'rekam_jejak',
  },
  negatif: {
    label: 'Negatif',
    tip: 'Sinyal ini cenderung salah arah.',
    group: 'rekam_jejak',
  },
  belum_cukup_data: {
    label: 'Belum cukup data',
    tip: 'Butuh minimal 10 sinyal yang sudah dinilai, di minimal 5 hari berbeda.',
    aliases: ['Belum bisa dinilai'],
    group: 'rekam_jejak',
  },
  reconstruction: {
    label: 'Rekonstruksi (data masa lalu)',
    short: 'Rekonstruksi',
    tip: 'Sinyal screener 27 hari ke belakang dihitung ulang memakai data yang tersedia saat itu.',
    aliases: ['Rekonstruksi screener'],
    group: 'rekam_jejak',
  },

  // ── 4.5 Bot live, eksekusi, saldo & jurnal ───────────────────────────────
  webhook: {
    label: 'Webhook (jalur alert → bot)',
    short: 'Webhook',
    tip: 'Alamat yang menerima alert TradingView lalu meneruskannya menjadi order di exchange.',
    group: 'bot',
  },
  login_password: {
    label: 'Kata sandi login',
    aliases: ['Password', 'Password login'],
    group: 'bot',
  },
  webhook_passphrase: {
    label: 'Kata sandi webhook',
    tip: 'Kode rahasia di setiap alert; tanpa kode ini alert ditolak.',
    aliases: ['Passphrase (webhook)'],
    group: 'bot',
  },
  okx_passphrase: {
    label: 'Passphrase API OKX',
    tip: 'Kode ketiga dari OKX, selain API key dan secret.',
    aliases: ['API Passphrase (OKX)'],
    group: 'bot',
  },
  alert_payload: {
    label: 'Isi alert (JSON)',
    tip: 'Teks yang ditempel di pesan alert TradingView.',
    aliases: ['Payload', 'Alert Payload Template'],
    group: 'bot',
  },
  automation: {
    label: 'Otomasi',
    tip: 'Saat tidak aktif, semua alert (buka maupun tutup posisi) diabaikan.',
    values: { active: 'aktif', inactive: 'tidak aktif' },
    aliases: ['Automation Active / Inactive'],
    group: 'bot',
  },
  size_type: {
    label: 'Ukuran',
    values: { percent: '% modal', fixed: 'jumlah tetap' },
    aliases: ['Size type', 'Size value'],
    group: 'bot',
  },
  signal_logs: {
    label: 'Log alert',
    values: { fill_price: 'harga eksekusi', rejected: 'ditolak' },
    aliases: ['Signal Logs', 'Fill Price', 'rejected'],
    group: 'bot',
  },
  alert_latency: {
    label: 'Jeda alert',
    tip: 'Waktu dari candle tutup sampai alert diterima server.',
    aliases: ['Latensi alert'],
    group: 'bot',
  },
  slippage_bps: {
    label: 'Slippage (bps)',
    tip: '1 bps = 0.01%; positif berarti lebih mahal dari harga close.',
    aliases: ['Slippage aktual (bps)'],
    group: 'bot',
  },
  limit_sim: {
    label: 'Simulasi order limit',
    tip: 'Kalau dulu memakai order limit sejauh k × ATR yang ditunggu X menit, berapa yang terisi dan berapa hemat.',
    aliases: ['Fill rate limit', 'Limit bayangan', 'k × ATR', 'TTL', 'post-only'],
    group: 'bot',
  },
  price_ran: {
    label: 'Harga menjauh',
    tip: 'Harga bergerak menjauh setelah alert sehingga limit tidak terisi.',
    aliases: ['Harga lari'],
    group: 'bot',
  },
  livecheck_status: {
    label: 'Status cek bot',
    tip: 'Hasil mencocokkan sinyal strategi dengan yang benar-benar dieksekusi bot live.',
    values: {
      cocok: 'Cocok',
      harga_beda: 'Harga beda',
      gagal: 'Gagal',
      tidak_terkirim: 'Tidak terkirim',
      tak_terduga: 'Tak terduga',
      tanpa_log: 'Tanpa log',
      diabaikan: 'Uji manual',
    },
    group: 'bot',
  },
  balance_parts: {
    label: 'Saldo',
    values: { free: 'Bebas', used: 'Dipakai margin', total: 'Total' },
    aliases: ['Free', 'Terpakai', 'Total'],
    group: 'bot',
  },
  stablecoin_total: {
    label: 'Total stablecoin',
    tip: 'Hanya USDT, USDC, dan sejenisnya; koin lain tidak dijumlahkan.',
    aliases: ['Total stablecoin (USD)'],
    group: 'bot',
  },
  upnl: {
    label: 'Untung/rugi berjalan',
    tip: 'Hasil posisi yang masih terbuka di harga acuan (mark).',
    aliases: ['Unrealized PnL', 'uPnL'],
    group: 'bot',
  },
  realized_pnl: {
    label: 'Untung/rugi tertutup (perkiraan)',
    short: 'Untung/rugi tertutup',
    tip: 'Dihitung dari harga masuk dan keluar; belum termasuk fee dan funding.',
    aliases: ['Realized PnL'],
    group: 'bot',
  },
  mark_price: {
    label: 'Harga acuan (mark)',
    short: 'Harga acuan',
    tip: 'Harga acuan exchange untuk PnL dan likuidasi.',
    aliases: ['Mark'],
    group: 'bot',
  },
  liq_price: {
    label: 'Harga likuidasi',
    tip: 'Harga saat exchange menutup paksa posisi.',
    group: 'bot',
  },
  qty: {
    label: 'Jumlah',
    aliases: ['Qty'],
    group: 'bot',
  },
  r_multiple: {
    label: 'R (kelipatan risiko)',
    short: 'R',
    tip: 'Satu R = jarak entry ke SL; 2R berarti untung dua kali risiko.',
    values: { avg: 'rata-rata R per trade' },
    aliases: ['R-multiple', 'Avg R', 'Expectancy'],
    group: 'bot',
  },
  net_pnl: {
    label: 'Hasil bersih',
    tip: 'Untung atau rugi setelah fee dan funding (paper).',
    aliases: ['Net P&L'],
    group: 'bot',
  },
  equity: {
    label: 'Ekuitas',
    tip: 'Nilai akun termasuk posisi terbuka.',
    values: { curve: 'kurva modal' },
    aliases: ['Equity', 'Kurva equity'],
    group: 'bot',
  },
  trade_source: {
    label: 'Sumber trade',
    values: { paper_manual: 'Simulasi manual', paper_auto: 'Simulasi otomatis', live: 'Bot live (uang asli)' },
    aliases: ['Paper manual', 'Paper auto', 'Bot live'],
    group: 'bot',
  },

  // ── 4.6 Arena, laporan & sistem ──────────────────────────────────────────
  arena: {
    label: 'Paper berjalan',
    tip: 'Semua preset simulasi berdampingan.',
    values: { klasemen: 'klasemen' },
    aliases: ['Arena Paper', 'Klasemen'],
    group: 'laporan',
  },
  drift: {
    label: 'Sesuai uji?',
    tip: 'Membandingkan hasil simulasi dengan hasil uji preset; menyimpang berarti di luar rentang wajar.',
    values: { sesuai: 'sesuai', menyimpang: 'menyimpang', belum_cukup: 'belum cukup data' },
    aliases: ['vs backtest'],
    group: 'laporan',
  },
  fair_range: {
    label: 'Rentang wajar',
    tip: 'Rentang hasil yang masih wajar karena kebetulan.',
    aliases: ['Rentang 95%', 'Poisson', 'binomial', 'Wilson', 't'],
    group: 'laporan',
  },
  ready_review: {
    label: 'Siap dinilai',
    tip: 'Aturan tim: preset dinilai setelah minimal 30 transaksi simulasi.',
    aliases: ['Siap direview (≥ 30 trade)'],
    group: 'laporan',
  },
  report_final: {
    label: 'Laporan final',
    tip: 'Dibekukan tiap Senin 07:30 WIB (00:30 UTC); angkanya tidak berubah lagi.',
    aliases: ['Snapshot (beku)'],
    group: 'laporan',
  },
  report_week: {
    label: 'Minggu Senin–Senin',
    tip: 'Senin 07:00 WIB sampai Senin berikutnya (00:00 UTC).',
    aliases: ['Minggu ISO'],
    group: 'laporan',
  },
  system_status: {
    label: 'Status sistem',
    values: { healthy: 'Sistem normal', degraded: 'Data screener terlambat', offline: 'Server tidak terjangkau' },
    aliases: ['API online', 'API lambat (data basi)', 'API offline'],
    group: 'laporan',
  },
  mock_mode: {
    label: 'Mode contoh (data palsu)',
    tip: 'Hanya untuk pengembangan; tidak boleh ada di produksi.',
    aliases: ['Mode mock'],
    group: 'laporan',
  },
  ops: {
    label: 'Operasional server',
    values: { deploy: 'Pembaruan sistem', backup: 'Cadangan', pm2: 'Proses server' },
    aliases: ['Deploy', 'Backup', 'PM2'],
    group: 'laporan',
  },

  // ── Status pills (StatusPill) ────────────────────────────────────────────
  live: {
    label: 'LIVE (uang asli)',
    short: 'LIVE',
    tip: 'Angka dan aksi ini memakai uang sungguhan di exchange.',
    group: 'status',
  },
  riset: {
    label: 'RISET',
    tip: 'Hasil riset atau uji Lab; belum dipakai bot live.',
    group: 'status',
  },
  arsip: {
    label: 'ARSIP',
    tip: 'Fitur lama yang sudah dihentikan; datanya tetap bisa dibaca.',
    group: 'status',
  },
} as const satisfies GlossaryDict

export type BaseGlossaryKey = keyof typeof GLOSSARY
export type GlossaryKey =
  | BaseGlossaryKey
  | keyof typeof GLOSSARY_EXTRA_W2A
  | keyof typeof GLOSSARY_EXTRA_W2B
  | keyof typeof GLOSSARY_EXTRA_W3A
  | keyof typeof GLOSSARY_EXTRA_W3B
  | keyof typeof GLOSSARY_EXTRA_BASKET

/** Base glossary + every package's extra terms. */
export const GLOSSARY_ALL: Readonly<Record<GlossaryKey, GlossaryEntry>> = {
  ...GLOSSARY_EXTRA_W2A,
  ...GLOSSARY_EXTRA_W2B,
  ...GLOSSARY_EXTRA_W3A,
  ...GLOSSARY_EXTRA_W3B,
  ...GLOSSARY_EXTRA_BASKET,
  // Base last so an accidental duplicate can never change a base term.
  ...GLOSSARY,
}

/** The extra dictionaries, for the uniqueness test. */
export const GLOSSARY_EXTRAS: Readonly<Record<string, GlossaryDict>> = {
  w2a: GLOSSARY_EXTRA_W2A,
  w2b: GLOSSARY_EXTRA_W2B,
  w3a: GLOSSARY_EXTRA_W3A,
  w3b: GLOSSARY_EXTRA_W3B,
  basket: GLOSSARY_EXTRA_BASKET,
}

/** Entry for a key, or undefined (never throws: unknown keys render as plain text). */
export function getTerm(k: GlossaryKey | string): GlossaryEntry | undefined {
  return (GLOSSARY_ALL as Readonly<Record<string, GlossaryEntry>>)[k]
}

/** Label for a key (`short: true` for the compact form). Unknown key → the key itself. */
export function termLabel(k: GlossaryKey | string, opts: { short?: boolean } = {}): string {
  const e = getTerm(k)
  if (!e) return k
  return (opts.short && e.short) || e.label
}

/** One-sentence explanation for a key, or undefined. */
export function termTip(k: GlossaryKey | string): string | undefined {
  return getTerm(k)?.tip
}

/** Name of one value of a concept, e.g. termValue('verdict', 'PASS') → "Lolos". Unknown → the raw value. */
export function termValue(k: GlossaryKey | string, value: string): string {
  return getTerm(k)?.values?.[value] ?? value
}
