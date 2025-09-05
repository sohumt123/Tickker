import type { Metadata } from 'next'
import './globals.css'
import AuthButton from '@/components/AuthButton'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Tickker - Stock Portfolio Visualizer',
  description: 'Compare your portfolio performance with SPY through beautiful, interactive charts',
  keywords: 'portfolio, stocks, SPY, investment, performance, visualization, tickker',
  authors: [{ name: 'Tickker' }],
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
              <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <a href="/portfolio" className="inline-flex items-center gap-2">
                  <img src="/icon.png" alt="Tickker" className="w-8 h-8 rounded-lg" />
                  <span className="font-semibold dark:text-slate-100">Tickker</span>
                </a>
                <div className="hidden sm:flex items-center gap-8">
                  <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                    <a href="/portfolio" className="hover:text-blue-600 transition-colors duration-200">Portfolio</a>
                    <a href="/groups" className="hover:text-blue-600 transition-colors duration-200">Groups</a>
                    <a href="/rag" className="hover:text-blue-600 transition-colors duration-200">Research</a>
                    <a href="/about" className="hover:text-blue-600 transition-colors duration-200">About</a>
                  </nav>
                  <div className="flex items-center gap-3">
                    <AuthButton />
                  </div>
                </div>
              </div>
            </header>
            <div className="w-full dark:bg-slate-950 min-h-[calc(100vh-4rem)]">
              <div className="min-w-0">{children}</div>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}