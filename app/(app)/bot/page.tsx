import { BotStatusView } from '@/components/bot/BotStatusView'

export const metadata = {
  title: 'Status bot',
  description: 'Bot live aman? Sinyal strategi vs eksekusi, status webhook dan kualitas eksekusi. Hanya membaca.',
}

export default function BotPage() {
  return <BotStatusView />
}
