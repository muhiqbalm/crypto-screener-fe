import { LabHeader } from '@/components/lab/LabHeader'
import { PresetsView } from '@/components/lab/PresetsView'
import { PageContainer } from '@/components/shell/page'

export const metadata = {
  title: 'Preset',
  description: 'Setting strategi tersimpan per koin dan timeframe: status uji, mulai paper, pantau sinyal.',
}

export default function LabPresetsPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Preset"
        subtitle="Setting strategi yang tersimpan, satu per koin dan timeframe. Dari sini kamu menjalankannya di paper atau memantau sinyalnya."
        help={{
          apaIni: 'Preset adalah setting strategi yang disimpan dari hasil uji. Statusnya menunjukkan rapor saat disimpan atau keadaan paper-nya sekarang.',
          caraPakai: [
            'Pilih preset yang Lolos, lalu tekan "Mulai paper". Akun simulasi 10,000 USDT dibuat otomatis dan kamu dibawa ke Paper berjalan.',
            'Ketuk satu baris untuk detail, uji ulang, pantau sinyal saja (tanpa paper), atau hapus.',
            'Preset yang sedang paper menunjukkan progres menuju 30 transaksi. Penilaian dilakukan setelah itu.',
          ],
          istilah: ['preset', 'preset_status', 'verdict', 'holdout', 'paper', 'mirror_sizing'],
        }}
      />
      <PresetsView />
    </PageContainer>
  )
}
