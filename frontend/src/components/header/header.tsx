import { cn } from "@/lib/utils";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import ButtonConnectWallet from "../button-connect-wallet.tsx/button-connect-wallet";

interface DomaLendHeaderProps {
  onTogglePanel?: () => void;
}

export default function DomaLendHeader({ onTogglePanel }: DomaLendHeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = router.pathname;

  const navigationLinks = [
    { destination: "/dashboard", label: "Dashboard" },
    { destination: "/domains", label: "Domains" },
    { destination: "/pools", label: "Pools" },
    { destination: "/auctions", label: "Auctions" },
  ];

  return (
    <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <nav className="container mx-auto px-4 py-4 flex flex-row md:grid md:grid-cols-3 md:items-center">
        {/* Left Column - Logo */}
        <div className="flex flex-row gap-4 items-center">
          <Link href="/domalend" className="flex flex-row items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                DomaLend
              </span>
              <span className="text-xs text-gray-500 -mt-1">
                AI-Powered Domain Lending
              </span>
            </div>
          </Link>
        </div>

        {/* Center Column - Navigation */}
        <div className="hidden md:flex items-center justify-center gap-1">
          {navigationLinks.map((link) => (
            <Link
              key={link.label}
              href={link.destination}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
                pathname === link.destination && 
                "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Column - Controls */}
        <div className="flex justify-end items-center gap-3">
          {/* Search Button */}
          <Button variant="ghost" size="sm" className="hidden md:flex" aria-label="Search">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden md:flex"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">{theme === "dark" ? "Light" : "Dark"} mode</span>
          </Button>

          {/* Connect Wallet Button */}
          <ButtonConnectWallet />

          {/* Mobile Menu */}
          <div className="flex md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-80">
                <div className="flex flex-col h-full">
                  {/* Mobile Logo */}
                  <div className="flex items-center gap-3 mb-8 pt-4">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">DomaLend</h2>
                      <p className="text-xs text-gray-500">AI-Powered Domain Lending</p>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex flex-col gap-2 mb-8">
                    {navigationLinks.map((link) => (
                      <Link key={link.label} href={link.destination}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start font-medium",
                            pathname === link.destination && 
                            "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          )}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </div>

                  {/* Mobile Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Theme</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}