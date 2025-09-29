"use client"

import { useTheme } from "next-themes"
import useCurrentTheme from "@/hooks/styles/theme"
import Link from "next/link"
import { Twitter, MessageCircle, Github } from "lucide-react"

const resources = [
  // {
  //   label: "Institutional",
  //   destination: "/institutional",
  // },
  // {
  //   label: "Fee Discounts",
  //   destination: "/fee-discounts",
  // },
  {
    label: "Privacy Policy",
    destination: "/privacy-policy",
  },
]

const support = [
  {
    label: "GTX Docs",
    destination: "/docs",
  },
  {
    label: "API Documentation",
    destination: "/api-docs",
  },
  {
    label: "Terms & Conditions",
    destination: "/terms",
  },
]

const Footer = () => {
  const { theme, setTheme } = useTheme()
  const currentTheme = useCurrentTheme()

  return (
    <footer className="text-gray-300 relative overflow-hidden bg-[#0A0A0A]">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/10 opacity-30"></div>
      <div className="absolute inset-0 bg-[url('/blockchain-bg.svg')] bg-repeat opacity-5"></div>

      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-20"
            style={{
              width: Math.random() * 4 + 2 + "px",
              height: Math.random() * 4 + 2 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            }}
          />
        ))}
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Logo Section */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <img src={"/logo/gtx.png"} className="h-10" alt="GTX Logo" />
              <span className="text-3xl font-bold text-white">GTX</span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              Experience the power of permissionless spot trading.
            </p>
            <div className="py-5">
              <p className="text-gray-400 text-sm">© 2025 Great Trading eXperience</p>
            </div>
          </div>

          {/* Resources Section */}
          <div className="col-span-1">
            <h2 className="text-white font-semibold mb-4 text-lg">Resources</h2>
            <ul className="space-y-3">
              {resources.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.destination}
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <div className="w-1 h-1 rounded-full bg-white/60"></div>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Section */}
          <div className="col-span-1">
            <h2 className="text-white font-semibold mb-4 text-lg">Support</h2>
            <ul className="space-y-3">
              {support.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.destination}
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <div className="w-1 h-1 rounded-full bg-white/60"></div>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Section */}
          <div className="col-span-1">
            <h2 className="text-white font-semibold mb-4 text-lg">Community</h2>
            <div className="flex flex-col space-y-4">
              {/* <a
                href="https://discord.gg/liquidbook"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <div className="bg-white/10 p-2 rounded-md">
                  <MessageCircle size={18} />
                </div>
                <span>Discord</span>
              </a> */}
              <a
                href="https://x.com/gtxfi_official"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <div className="bg-white/10 p-2 rounded-md">
                  <Twitter size={18} />
                </div>
                <span>Twitter</span>
              </a>
              {/* <a
                href="https://github.com/Great-Trading-eXperience"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <div className="bg-white/10 p-2 rounded-md">
                  <Github size={18} />
                </div>
                <span>Github</span>
              </a> */}
            </div>
          </div>
        </div>

        {/* Gradient bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-700 via-white/40 to-gray-700"></div>
      </div>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>
    </footer>
  )
}

export default Footer

