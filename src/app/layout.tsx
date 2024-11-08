import './globals.css';
import Link from 'next/link'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <header className="bg-primary text-primary-foreground shadow-md">
          <nav className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold">My Blog</Link>
              <ul className="flex space-x-4">
                <li><Link href="/" className="hover:underline">Home</Link></li>
                <li><Link href="/about" className="hover:underline">About</Link></li>
                <li><Link href="/blog" className="hover:underline">Blog</Link></li>
                <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              </ul>
            </div>
          </nav>
        </header>

        <main className="container mx-auto px-4 py-8 flex-grow">
          {children}
        </main>

        <footer className="bg-muted text-muted-foreground mt-auto">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <p>&copy; 2023 My Blog. All rights reserved.</p>
              <ul className="flex space-x-4">
                <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}