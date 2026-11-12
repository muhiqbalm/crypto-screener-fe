import { ApiError, apiErrorDetail, type ApiErrorKind } from '@/lib/api/errors'

/**
 * Turns any error into Indonesian copy for the user: a title, a sentence and
 * a suggested action. Never returns technical strings like "ApiError(server:422)"
 * or a stack trace. Use in <ErrorState error={…}> and in toasts:
 *
 *   toast.error(describeError(err).message)
 */
export interface ErrorCopy {
  title: string
  message: string
  /** What the user can do. */
  hint?: string
  kind: ApiErrorKind
  status?: number
}

/** Common backend reasons (FastAPI `detail`) → Indonesian. Matched case-insensitively as substrings. */
const DETAIL_ID: [RegExp, string][] = [
  [/restricted to admins|not an admin|admin only/i, 'Fitur ini khusus admin.'],
  [/rate limit|too many requests/i, 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'],
  [/already (running|queued)|job .*in progress/i, 'Proses yang sama sedang berjalan. Tunggu sampai selesai.'],
  [/not found/i, 'Data tidak ditemukan.'],
  [/timeout|timed out/i, 'Server terlalu lama menjawab. Coba lagi sebentar lagi.'],
  [/holdout/i, 'Data baru (holdout) untuk kombinasi ini sudah terkunci atau bermasalah.'],
  [/invalid (credentials|api key)|signature/i, 'API key exchange ditolak. Cek lagi key dan izinnya di Akun & koneksi.'],
  [/insufficient|balance/i, 'Saldo tidak cukup untuk aksi ini.'],
  [/limit .*reached|max(imum)? .*reached|too many watches/i, 'Batas jumlah sudah tercapai. Hapus yang tidak dipakai dulu.'],
]

/** True when a string looks technical (English stack/exception text). */
function looksTechnical(s: string): boolean {
  return /Error\b|Exception|Traceback|ApiError|^\w+Error:|\bat \w+ \(|[{}[\]]|undefined|null/.test(s)
}

function translateDetail(detail: string | null): string | null {
  if (!detail) return null
  for (const [re, txt] of DETAIL_ID) if (re.test(detail)) return txt
  return null
}

export function describeError(error: unknown): ErrorCopy {
  if (!(error instanceof ApiError)) {
    if (error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message))) {
      return {
        kind: 'network',
        title: 'Tidak bisa terhubung',
        message: 'Tidak bisa terhubung ke server.',
        hint: 'Cek koneksi internet kamu, lalu coba lagi.',
      }
    }
    return { kind: 'server', title: 'Terjadi kesalahan', message: 'Ada yang tidak beres saat memuat data.', hint: 'Coba lagi sebentar lagi.' }
  }

  const status = error.status
  const detail = apiErrorDetail(error)
  const translated = translateDetail(detail)

  switch (error.kind) {
    case 'network':
      return {
        kind: 'network',
        status,
        title: 'Tidak bisa terhubung',
        message: 'Tidak bisa terhubung ke server.',
        hint: 'Cek koneksi internet kamu, lalu coba lagi.',
      }
    case 'auth':
      return status === 403
        ? {
            kind: 'auth',
            status,
            title: 'Tidak ada akses',
            message: translated ?? 'Akun kamu tidak punya akses ke bagian ini.',
            hint: 'Minta admin membuka akses kalau kamu butuh.',
          }
        : {
            kind: 'auth',
            status,
            title: 'Sesi berakhir',
            message: 'Sesi kamu berakhir.',
            hint: 'Silakan login ulang.',
          }
    case 'not_found':
      return {
        kind: 'not_found',
        status,
        title: 'Tidak ditemukan',
        message: translated ?? 'Data tidak ditemukan atau sudah dihapus.',
      }
    default: {
      if (status === 429) {
        return { kind: 'server', status, title: 'Terlalu sering', message: 'Terlalu banyak permintaan.', hint: 'Tunggu sebentar lalu coba lagi.' }
      }
      if (status !== undefined && status >= 400 && status < 500) {
        // 400 / 409 / 422: the request was rejected. Show the backend reason only
        // when we can translate it, or when it is already plain human text.
        const plain = detail && !looksTechnical(detail) && /[a-z]/i.test(detail) ? detail : null
        return {
          kind: 'server',
          status,
          title: 'Permintaan ditolak',
          message: translated ?? (plain ? `Server menolak permintaan ini: ${plain}` : 'Server menolak permintaan ini.'),
          hint: 'Cek isian kamu, lalu coba lagi.',
        }
      }
      return {
        kind: 'server',
        status,
        title: 'Server bermasalah',
        message: translated ?? 'Server sedang bermasalah.',
        hint: 'Coba lagi sebentar lagi. Kalau terus terjadi, kabari admin.',
      }
    }
  }
}
