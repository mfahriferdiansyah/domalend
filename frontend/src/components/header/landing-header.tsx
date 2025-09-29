"use client"

import Link from "next/link"
import { useRouter } from "next/router"
import { ExternalLink, Monitor } from 'lucide-react'
import { motion } from "framer-motion"

// Custom event type to communicate with App component
const triggerMobileWarning = () => {
  // Create and dispatch a custom event that the App component can listen for
  const event = new CustomEvent('gtx:mobileTrigger');
  window.dispatchEvent(event);
};

const LandingHeader = () => {
  const router = useRouter()
  const pathname = router.pathname

  const links = [
    { destination: "/markets", label: "Launch App" },
  ]

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 0.5,
        ease: "easeOut"
      }}
      className="fixed top-0 left-0 right-0 z-30 pt-3 sm:pt-4 md:pt-5 px-4 sm:px-6 md:px-8 lg:px-12"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.5,
          delay: 0.2,
          ease: "easeOut"
        }}
        className="mx-auto max-w-7xl"
      >
        <div className="relative flex items-center justify-between rounded-[27px] lg:rounded-full border border-white/15 bg-neutral-950/70 backdrop-blur px-3 sm:px-4 md:px-6 py-2 shadow-[0_4px_30px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Background elements */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute inset-0 overflow-hidden pointer-events-none"
          >
            <div className="absolute -top-10 -right-10 w-32 sm:w-40 md:w-48 h-32 sm:h-40 md:h-48 bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-[27px] lg:rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 sm:w-60 md:w-72 h-48 sm:h-60 md:h-72 bg-gradient-to-tr from-blue-500/10 to-purple-500/5 rounded-[27px] lg:rounded-full blur-3xl" />
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5"></div>
          </motion.div>

          {/* Logo */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex-shrink-0 relative z-10"
          >
            <Link href="/" className="flex items-center group">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-[27px] lg:rounded-full blur-md" />
                <img src="/logo/gtx.png" alt="GTX Logo" className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 relative z-10" />
              </div>
              <div className="ml-2 sm:ml-3 md:ml-4 flex flex-col">
                <span className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide">GTX</span>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden md:flex items-center justify-center space-x-4 sm:space-x-6 md:space-x-8 lg:space-x-10 relative z-10"
          >
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.destination}
                target={link.label === "Launch App" ? "_blank" : undefined}
                rel={link.label === "Launch App" ? "noopener noreferrer" : undefined}
                className={`relative ${
                  link.label === "Launch App" 
                    ? "group inline-flex items-center gap-2 px-4 sm:px-5 md:px-6 lg:px-8 py-2 md:py-3 bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-900 text-white text-sm sm:text-base md:text-lg font-medium rounded-[27px] lg:rounded-full border border-gray-300/40 relative overflow-hidden"
                    : `text-gray-200 hover:text-white text-sm sm:text-base md:text-lg font-medium transition-colors group ${
                        pathname === link.destination ? "text-white" : ""
                      }`
                }`}
              >
                {link.label}
                {link.label === "Launch App" && (
                  <>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                    </div>
                  </>
                )}
                {link.label !== "Launch App" && (
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300 ${
                      pathname === link.destination ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                )}
              </Link>
            ))}
          </motion.div>

          {/* Mobile Desktop-Only Badge */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:hidden flex items-center relative z-10"
          >
            <button 
              onClick={triggerMobileWarning}
              className="px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-sm text-blue-400 font-medium flex items-center gap-1.5"
            >
              <Monitor className="h-4 w-4" />
              <span>Desktop Only</span>
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.header>
  )
}

export default LandingHeader