import Link from "next/link";
import { Inter } from "next/font/google";
import { UserCircle, PenSquare } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { Button } from "../components/ui/button";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <header className="bg-primary text-primary-foreground shadow-md">
          <nav className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold">
                My Blog
              </Link>
              <div className="flex flex-row items-center">
                <ul className="flex space-x-4">
                  <li>
                    <Link href="/" className="hover:underline">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/posts" className="hover:underline">
                      All Posts
                    </Link>
                  </li>
                </ul>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full ml-2 active:text-slate-600 active:bg-slate-100"
                    >
                      <UserCircle className="h-6 w-6" />
                      <span className="sr-only">Open user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white text-slate-700 rounded-sm border border-slate-300"
                  >
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link
                        href="/posts/new"
                        className="flex items-center w-full px-6 py-2"
                      >
                        <PenSquare className="mr-2 h-4 w-4" />
                        <span>New Post</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                <li>
                  <Link href="/privacy" className="hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:underline">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
