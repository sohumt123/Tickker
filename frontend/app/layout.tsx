import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'
import AuthButton from '@/components/AuthButton'

export const metadata: Metadata = {
  title: 'Stock Portfolio Visualizer',
  description: 'Compare your portfolio performance with SPY through beautiful, interactive charts',
  keywords: 'portfolio, stocks, SPY, investment, performance, visualization',
  authors: [{ name: 'Portfolio Visualizer' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <header className="sticky top-0 z-50 border-b border-white/40 bg-gradient-to-r from-primary-50 via-fuchsia-50 to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 backdrop-blur">
            <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <a href="/" className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg brand-gradient dark:bg-slate-800 dark:text-white">T</span>
                <span className="font-semibold dark:text-slate-100">Tickker</span>
              </a>
              <div className="hidden sm:flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <a href="/" className="hover:text-primary-700 dark:hover:text-primary-400">Portfolio</a>
                <a href="/groups" className="hover:text-primary-700 dark:hover:text-primary-400">Groups</a>
                <a href="/rag" className="hover:text-primary-700 dark:hover:text-primary-400">Research</a>
                <AuthButton />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="w-full px-4 sm:px-6 lg:px-8 dark:bg-slate-950 min-h-[calc(100vh-3.5rem)]">
            <div className="min-w-0 dark:text-slate-100">{children}</div>
          </div>
        </div>
      </body>
    </html>
  )
}