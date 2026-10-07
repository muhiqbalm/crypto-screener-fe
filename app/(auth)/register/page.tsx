import { BarChart2, ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Register Restricted — BMTM MoonTrade',
  description: 'Private registration is closed for BMTM MoonTrade.',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <Link
        href="/screener"
        className="mb-8 flex items-center gap-2.5 text-xl font-semibold tracking-tight transition-opacity hover:opacity-85"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-md shadow-emerald-500/10">
          <BarChart2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">BMTM</span>
          <span className="font-bold tracking-tight text-foreground">MOONTRADE</span>
        </div>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground">Registration Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Public user self-registration is currently disabled. <strong>BMTM MoonTrade</strong> is operating in private access mode for authorized quantitative traders.
        </p>

        <div className="mt-5 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground text-left space-y-1">
          <p className="font-medium text-foreground">Authorized System Accounts:</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li>Yanandra (Lead)</li>
            <li>Rosyade (Algo Lead)</li>
            <li>Iqbal (Quant Engineer)</li>
          </ul>
        </div>

        <div className="mt-6">
          <Link href="/login">
            <Button className="w-full gap-2 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              Return to Login Terminal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
