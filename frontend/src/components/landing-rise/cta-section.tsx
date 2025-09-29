"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ExternalLink, ArrowRight, ChevronRight, Users, BarChart4, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTASection() {
  const stats = [
    { icon: Users, value: "50K+", label: "Active Traders" },
    { icon: BarChart4, value: "$2.5B", label: "Monthly Volume" },
    { icon: Zap, value: "0.01s", label: "Execution Time" },
  ]

  return (
    <section className="py-24 relative z-10 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>

        {/* Animated grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - CTA content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-900/20 text-blue-400 text-sm font-medium">
                <span className="mr-2 size-2 rounded-full bg-blue-400"></span>
                Now live on mainnet
              </div>

              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Start trading with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                  confidence
                </span>
              </h2>

              <p className="text-xl text-gray-300">
                Join thousands of traders who have already discovered the power of our platform. Trade with security,
                speed, and simplicity.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/markets" target="_blank">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-6 text-lg font-medium rounded-xl relative overflow-hidden group">
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-full transition-all duration-1000 ease-out"></span>
                    <div className="flex items-center gap-2 relative z-10">
                      Launch App
                      <ExternalLink size={20} />
                    </div>
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="border-blue-900/50 hover:border-blue-500/50 text-white px-6 py-6 text-lg font-medium rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    View Documentation
                    <ArrowRight size={18} />
                  </div>
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-blue-900/30">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex justify-center">
                      <stat.icon className="h-5 w-5 text-blue-400 mb-2" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right side - Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-20"></div>
            <div className="bg-[#0a0a0a] border border-blue-900/50 rounded-xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 opacity-50"></div>

              {/* Card content */}
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 rounded-lg bg-blue-900/30">
                    <BarChart4 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="bg-blue-900/30 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    New User Bonus
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4">Create your account today</h3>

                <ul className="space-y-3 mb-6">
                  {[
                    "No KYC required to start trading",
                    "Free $10 in trading credits for new users",
                    "Access to all trading pairs and features",
                    "24/7 customer support",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-5 h-5 rounded-full bg-blue-900/30 border border-blue-500/30 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <span className="text-xs text-blue-400">✓</span>
                      </div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t border-blue-900/30">
                  <Link
                    href="/signup"
                    className="flex items-center justify-between text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span className="font-medium">Sign up in less than 2 minutes</span>
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
