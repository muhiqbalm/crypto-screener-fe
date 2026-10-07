import { LoginForm } from '@/components/auth/LoginForm'
import { BarChart2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Login — BMTM MoonTrade',
  description: 'Sign in to BMTM MoonTrade — Screener & Trade System.',
}

export default function LoginPage() {
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

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SCREENER & TRADE SYSTEM
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Terminal Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your quantitative trading dashboard
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 rounded-lg border border-border/40 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
          🔒 <span className="font-medium text-foreground">Private Terminal</span> • Access restricted to authorized team members (Yanandra, Rosyade, Iqbal).
        </div>
      </div>
    </div>
  )
}
