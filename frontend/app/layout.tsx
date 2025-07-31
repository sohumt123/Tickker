import type { Metadata } from 'next'
import './globals.css'

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
          {children}
        </div>
      </body>
    </html>
  )
}