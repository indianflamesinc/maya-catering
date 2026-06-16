import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'MAYA Indian Catering · Boston, MA', template: '%s · MAYA' },
  description: 'Authentic regional Indian catering for weddings, home parties & events across New England. Order trays online.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
