import type { Metadata } from 'next'
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers, ThemeProvider } from './providers'
import { Toaster } from '@/components/shell/Toaster'

// Text: Inter. Headings and big numbers: Plus Jakarta Sans. Code only: Geist Mono.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'BMTM MoonTrade',
    // Pages export just their own name; the brand suffix is added here.
    template: '%s · BMTM MoonTrade',
  },
  description: 'Screener kripto, otomasi webhook TradingView dan Strategy Lab tim BMTM.',
  // Private, invite-only terminal: keep it out of search engines.
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} antialiased`}>
        {/* ThemeProvider must be in the server layout so next-themes can inject
            its anti-flash script at the server level (React 19 / Next.js 16
            warns when a <script> tag is rendered inside a client component). */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="crypto-screener-theme"
        >
          <Providers>
            {children}
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
