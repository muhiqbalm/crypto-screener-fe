import { RegisterForm } from '@/components/auth/RegisterForm'
import { BarChart2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Register — Crypto Screener',
  description: 'Create a new Crypto Screener account.',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <Link
        href="/screener"
        className="mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight transition-opacity hover:opacity-80"
      >
        <BarChart2 className="h-6 w-6 text-bullish" aria-hidden="true" />
        <span>Crypto Screener</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started with Crypto Screener today
          </p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline cursor-pointer"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
