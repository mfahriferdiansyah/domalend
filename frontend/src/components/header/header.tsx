import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import ButtonConnectWallet from "../button-connect-wallet.tsx/button-connect-wallet";

interface DomaLendHeaderProps {
  onTogglePanel?: () => void;
}

export default function DomaLendHeader({ onTogglePanel }: DomaLendHeaderProps) {
  const router = useRouter();
  const pathname = router.pathname;

  const navigationLinks = [
    { destination: "/dashboard", label: "Dashboard" },
    { destination: "/domains", label: "Domains" },
    { destination: "/pools", label: "Pools" },
    { destination: "/auctions", label: "Auctions" },
  ];

  return (
    <header className="relative z-10 border-b border-gray-200 bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-row md:grid md:grid-cols-3 md:items-center">
        {/* Left Column - Logo */}
        <div className="flex flex-row gap-4 items-center">
          <Link href="/domalend" className="flex flex-row items-center gap-3">
            <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center">
              <img src="/icons/domalend-blue.png" alt="DomaLend Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">
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
                "hover:bg-gray-100",
                "text-gray-700 hover:text-gray-900",
                pathname === link.destination &&
                "bg-blue-50 text-blue-700 hover:bg-blue-100"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Column - Controls */}
        <div className="flex justify-end items-center gap-3">

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
                    <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center p-1">
                      <img src="/icons/domalend.png" alt="DomaLend Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">DomaLend</h2>
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
                            "bg-blue-50 text-blue-700"
                          )}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
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