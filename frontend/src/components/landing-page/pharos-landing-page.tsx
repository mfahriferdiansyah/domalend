"use client"

import { DotPattern } from "@/components/magicui/dot-pattern"
import { Button } from "@/components/ui/button"
import {
  BarChart2,
  ShieldCheck,
  Code2,
  Terminal,
  Puzzle,
  Users,
  Wallet,
  ArrowUpRight,
  LineChart,
  ArrowRightCircle,
  DollarSign,
  RefreshCcw,
} from "lucide-react"
import Head from "next/head"
import Link from "next/link"

export function PharosLandingPage() {
  return (
    <main className="relative bg-black min-h-screen text-white">
      <DotPattern />
      <Head>
        <title>Pharos - Decentralized Spot Trading Platform</title>
        <meta name="description" content="Trade with Confidence on the Most Secure Decentralized Exchange" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section className="w-full mx-auto pt-20 pb-32">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="w-full lg:w-1/2 space-y-8">
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-800 to-blue-900 text-blue-100 font-semibold rounded-full z-60">
                Secure Spot Trading Platform
              </div>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                <span className="block mb-2">Decentralized Trading</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600">Simplified</span>
              </h1>

              <p className="text-xl text-gray-300 font-light leading-relaxed">
                Experience secure, transparent, and efficient spot trading on our permissionless decentralized exchange.
              </p>

              <div className="flex flex-wrap gap-5 pt-6">
                <Link href="/spot">
                  <Button className="relative bg-black text-white border border-white/20 px-6 py-5 text-base font-bold rounded-md shadow-md hover:shadow-lg transition-all duration-300 hover:bg-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={20} />
                      Start Spot Trading
                    </div>
                  </Button>
                </Link>

                <Link href="/liquidity">
                  <Button className="relative bg-[#1A1A1A] border border-white/20 hover:border-white/30 text-white px-6 py-5 text-base font-bold rounded-md transition-all duration-300 hover:bg-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Users size={20} />
                      Provide Liquidity
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="relative">
                {/* Abstract background elements */}
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/10 to-blue-400/10 rounded-3xl blur-2xl"></div>

                {/* Trading dashboard mockup */}
                <div className="relative rounded-2xl bg-[#121212]/90 border border-white/20 overflow-hidden shadow-xl">
                  {/* Header with tabs */}
                  <div className="bg-[#0A0A0A] px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      <span className="font-bold text-white">ETH/USDC</span>
                      <span className="text-green-400">$3,124.50</span>
                      <span className="text-green-400 text-sm">+1.8%</span>
                    </div>
                    <div className="flex text-sm">
                      <div className="px-3 py-1 bg-blue-500/80 text-white rounded-l-md">1H</div>
                      <div className="px-3 py-1 bg-blue-500/30 text-blue-300 rounded-r-md">1D</div>
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="px-6 py-8">
                    {/* Simplified chart */}
                    <div className="h-60 w-full relative">
                      {/* Price grid lines */}
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="absolute w-full h-px bg-blue-500/10" style={{ top: `${i * 25}%` }}>
                          <span className="absolute right-0 transform -translate-y-1/2 text-xs text-gray-400">
                            ${Math.round(3124 - i * 50)}
                          </span>
                        </div>
                      ))}

                      {/* Chart line - static SVG */}
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <path
                          d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="3"
                        />
                        <path
                          d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30 L360,180 L0,180 Z"
                          fill="url(#blue-gradient)"
                          opacity="0.1"
                        />
                        <defs>
                          <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Price indicator dot */}
                      <div className="absolute top-[30px] right-[40px] w-4 h-4 rounded-full bg-blue-500 border-2 border-gray-800 shadow-lg"></div>
                    </div>
                  </div>

                  {/* Trading controls */}
                  <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                    <button className="py-3 px-5 bg-green-500/80 text-white font-bold rounded-lg hover:bg-green-600/80 transition-colors">
                      BUY
                    </button>
                    <button className="py-3 px-5 bg-red-500/80 text-white font-bold rounded-lg hover:bg-red-600/80 transition-colors">
                      SELL
                    </button>
                  </div>
                </div>

                {/* Stats floating card */}
                <div className="absolute -right-4 -bottom-16 p-4 bg-[#121212] border border-white/20 rounded-xl shadow-lg w-60">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-white">Market Stats</h4>
                    <ArrowRightCircle size={16} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">24h Volume</span>
                      <span className="text-xs font-medium">$892M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Liquidity</span>
                      <span className="text-xs font-medium">$420M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Trading Pairs</span>
                      <span className="text-xs font-medium">150+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Steps Section */}
      <section className="py-20 ">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">Start Trading in Minutes</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              A simple, secure process to get you trading on our decentralized platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Connect Wallet",
                description: "Connect your preferred Web3 wallet to access Pharos instantly - no KYC required",
                icon: Wallet,
                accent: "border-l-blue-400",
              },
              {
                title: "Deposit Assets",
                description: "Transfer your cryptocurrencies securely to your trading account",
                icon: ArrowUpRight,
                accent: "border-l-blue-400",
              },
              {
                title: "Start Trading",
                description: "Trade instantly with deep liquidity across all major cryptocurrency pairs",
                icon: LineChart,
                accent: "border-l-blue-400",
              },
              {
                title: "Manage Portfolio",
                description: "Track your assets, monitor performance, and withdraw anytime",
                icon: BarChart2,
                accent: "border-l-blue-400",
              },
            ].map((step, index) => (
              <div
                key={index}
                className={`group bg-[#121212] rounded-lg overflow-hidden border-l-4 ${step.accent} hover:shadow-[0_0_30px_rgba(245,_158,_11,_0.1)] transition-all duration-300 z-20`}
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-4">
                      <step.icon size={20} className="text-blue-400" />
                    </div>
                    <span className="text-lg font-bold">{step.title}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Ecosystem Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">Trading Ecosystem</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              A comprehensive ecosystem designed for secure and efficient decentralized trading
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Spot Trading",
                subtitle: "Deep Liquidity",
                description:
                  "Access secure spot trading with minimal slippage, competitive fees, and instant settlement across hundreds of cryptocurrency pairs",
                color: "bg-blue-500/10",
                icon: RefreshCcw,
                linkText: "Trade Spot Markets",
                linkHref: "/spot",
                highlights: ["Zero slippage", "Instant settlement", "150+ Trading pairs"],
              },
              {
                title: "Liquidity Pools",
                subtitle: "Earn Rewards",
                description:
                  "Provide liquidity to earn trading fees and additional rewards while helping to maintain efficient markets",
                color: "bg-blue-500/10",
                icon: Users,
                linkText: "Add Liquidity",
                linkHref: "/liquidity",
                highlights: ["Earn trading fees", "Flexible withdrawals", "Auto-compounding"],
              },
              {
                title: "Token Swaps",
                subtitle: "Best Rates",
                description:
                  "Swap between any supported tokens instantly with optimal routing and guaranteed best execution prices",
                color: "bg-blue-500/10",
                icon: DollarSign,
                linkText: "Swap Tokens",
                linkHref: "/swap",
                highlights: ["Best price routing", "MEV protection", "Gas optimized"],
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group backdrop-blur-xl bg-[#121212] rounded-2xl overflow-hidden relative border border-white/20 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(245,_158,_11,_0.1)] transition-all duration-500"
              >
                {/* Diagonal accent */}
                <div
                  className={`absolute -right-16 -top-16 w-32 h-32  ${feature.color} rounded-full transform rotate-12 opacity-20 group-hover:opacity-30 transition-all duration-500`}
                ></div>

                <div className="p-8 relative h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color}`}>
                      <feature.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-sm font-semibold">
                      {feature.subtitle}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-300 mb-6 flex-grow">{feature.description}</p>

                  <div className="space-y-4">
                    <div className="border-t border-white/10 pt-4">
                      <ul className="space-y-2">
                        {feature.highlights.map((highlight, i) => (
                          <li key={i} className="flex items-center text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href={feature.linkHref}>
                      <Button className="w-full bg-blue-500/10 border border-blue-700/30 hover:bg-blue-500/20 text-blue-300 font-semibold py-5 rounded-lg transition-all duration-300 mt-6">
                        {feature.linkText}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Benefits Section */}
      <section className="py-20 ">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">Advanced Technology</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built with cutting-edge technology for a secure and efficient trading experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Smart Order Routing",
                description:
                  "Advanced algorithms ensure you always get the best execution price across multiple liquidity sources with minimal slippage.",
                icon: Code2,
                stats: ["Best price guarantee", "Multi-source aggregation"],
              },
              {
                title: "MEV Protection",
                description:
                  "Built-in measures to protect traders from MEV attacks, frontrunning, and sandwich attacks, ensuring fair trading for all users.",
                icon: ShieldCheck,
                stats: ["Anti-frontrunning", "Fair execution"],
              },
              {
                title: "Cross-Chain Support",
                description:
                  "Seamlessly trade assets across multiple blockchains with our bridge technology, enabling unified liquidity and broader market access.",
                icon: Terminal,
                stats: ["Multi-chain", "Unified liquidity"],
              },
              {
                title: "Decentralized Architecture",
                description:
                  "Fully non-custodial system where users maintain complete control of their assets at all times, with no central points of failure.",
                icon: Puzzle,
                stats: ["Non-custodial", "Censorship-resistant"],
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-[#121212] to-[#0A0A0A] rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all duration-300 z-20"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon size={24} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                  </div>

                  <p className="text-gray-300 text-sm mb-6 flex-grow">{feature.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {feature.stats.map((stat, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs font-medium">
                        {stat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}