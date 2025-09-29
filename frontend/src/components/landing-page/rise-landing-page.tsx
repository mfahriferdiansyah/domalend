"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight,
  BarChart2,
  LineChart,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Terminal,
  Puzzle,
  Layers,
  Users,
  TrendingUp,
  ArrowRightCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { BlockchainBackground } from "./blockchain-background"
import BlurText from "@/blocks/TextAnimations/BlurText/BlurText"

export function RiseLandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const tradingSteps = [
    {
      title: "Create Account",
      description: "Connect your wallet and access all features instantly with no KYC required",
      icon: Wallet,
      step: 1,
    },
    {
      title: "Start Trading",
      description: "Access spot markets with deep liquidity and competitive fees",
      icon: LineChart,
      step: 2,
    },
    {
      title: "Manage Positions",
      description: "Monitor your portfolio and manage risk with advanced trading tools",
      icon: BarChart2,
      step: 3,
    },
  ]

  const features = [
    {
      title: "Spot Trading",
      description: "Fully decentralized order book-based exchange with no gatekeepers",
      icon: ArrowUpRight,
      id: 1,
    },
    {
      title: "Permissionless Markets",
      description: "Anyone can list a new market without requiring approval",
      icon: Users,
      id: 2,
    },
    {
      title: "Fair Pricing",
      description: "Transparent price discovery without reliance on external oracles",
      icon: LineChart,
      id: 3,
    },
    {
      title: "Capital Efficiency",
      description: "Optimized liquidity utilization compared to traditional AMMs",
      icon: Layers,
      id: 4,
    },
  ]

  const problems = [
    {
      title: "Inefficient Capital Utilization",
      description: "AMMs require deep liquidity to minimize slippage, leading to inefficient capital allocation",
    },
    {
      title: "High Impermanent Loss",
      description: "Liquidity providers often suffer from impermanent loss due to volatile price movements",
    },
    {
      title: "Price Manipulation",
      description: "AMMs are vulnerable to front-running and sandwich attacks, harming traders",
    },
    {
      title: "Restricted Market Listings",
      description: "Centralized exchanges limit listings, making it difficult for emerging assets to gain liquidity",
    },
  ]

  return (
    <main className="text-white min-h-screen overflow-hidden bg-black">
      {mounted && <BlockchainBackground />}

      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-1">
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-800 to-blue-900 text-blue-100 font-semibold rounded-full z-60 relative overflow-hidden mb-5">
                Decentralized Trading Platform
              </div>
              <BlurText
                text="Great Trading"
                delay={150}
                animateBy="words"
                direction="top"
                className="text-5xl md:text-6xl font-bold"
              />
              <BlurText
                text="Xperience"
                delay={150}
                animateBy="words"
                direction="top"
                className="text-5xl md:text-6xl font-bold text-blue-600/80"
              />
              <p className="text-xl text-gray-300 pt-5">
                A decentralized finance protocol enabling permissionless spot trading with plans to expand into
                perpetual markets.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/markets" target="_blank">
                  <Button className="bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:bg-gradient-to-r hover:from-blue-900 hover:to-blue-900 px-6 py-6 text-lg font-medium rounded-xl border border-gray-300/40 relative overflow-hidden group">
                    <div className="flex items-center gap-2 relative z-10">
                      Launch App
                      <ExternalLink size={20} />
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              {/* Trading dashboard mockup */}
              <div className="relative rounded-2xl bg-[#0a0a0a] border border-blue-900/30 overflow-hidden shadow-2xl shadow-blue-900/20">
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />

                {/* Header with tabs */}
                <div className="bg-[#111111] px-6 py-4 border-b border-blue-900/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-bold text-white">BTC/USD</span>
                    <span className="text-green-400">$89,324.50</span>
                    <span className="text-green-400 text-sm">+2.4%</span>
                  </div>
                  <div className="flex text-sm">
                    <div className="px-3 py-1 bg-blue-900/30 text-white rounded-l-md border border-blue-800/30">1H</div>
                    <div className="px-3 py-1 bg-[#0a0a0a] text-gray-300 rounded-r-md border border-blue-800/30">1D</div>
                  </div>
                </div>

                {/* Chart area */}
                <div className="px-6 py-8 bg-[#0a0a0a]">
                  <div className="h-60 w-full relative">
                    {/* Price grid lines */}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full h-px bg-blue-900/30"
                        style={{ top: `${i * 25}%` }}
                      >
                        <span className="absolute right-0 transform -translate-y-1/2 text-xs text-gray-400">
                          ${Math.round(89324 - i * 1000)}
                        </span>
                      </div>
                    ))}

                    {/* Chart line - static SVG */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <path
                        d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                      />
                      <path
                        d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30 L360,180 L0,180 Z"
                        fill="url(#gradient)"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Price indicator dot */}
                    <div className="absolute top-[30px] right-[40px] w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0a0a0a] shadow-lg shadow-blue-500/50" />
                  </div>
                </div>

                {/* Trading controls */}
                <div className="px-6 pb-6 grid grid-cols-2 gap-4 bg-[#0a0a0a]">
                  <button className="py-3 px-5 bg-green-600/80 text-white font-bold rounded-lg hover:bg-green-600 transition-colors relative overflow-hidden group border border-green-500/30">
                    <span className="relative z-10">BUY / LONG</span>
                  </button>
                  <button className="py-3 px-5 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-600 transition-colors relative overflow-hidden group border border-red-500/30">
                    <span className="relative">SELL / SHORT</span>
                  </button>
                </div>
              </div>

              {/* Stats floating card */}
              <div className="absolute -right-4 -bottom-16 p-4 bg-[#0a0a0a] border border-blue-900/30 rounded-xl shadow-md shadow-blue-900/20 w-60">
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />

                <div className="flex justify-between items-center mb-3 relative z-15">
                  <h4 className="text-sm font-semibold text-white">Market Stats</h4>
                  <ArrowRightCircle size={16} className="text-blue-500" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">24h Volume</span>
                    <span className="text-xs font-medium text-blue-400">$1.2B</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Open Interest</span>
                    <span className="text-xs font-medium text-blue-400">$840M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Funding Rate</span>
                    <span className="text-xs font-medium text-green-400">+0.01%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Common <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Issues</span> in Trading
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Many trading platforms have problems that make trading difficult
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="bg-[#0a0a0a] border border-blue-900/30 rounded-lg p-6 shadow-lg shadow-blue-900/10 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-3">{problem.title}</h3>
                  <p className="text-gray-400">{problem.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Why Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Platform</span> is Different
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We&apos;ve built a trading platform that addresses common trading problems
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {features.map((feature, index) => (
              <div key={index} className="relative">
                <Card className="bg-[#0a0a0a] border border-blue-900/30 h-full transition-all duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-800/30 flex items-center justify-center relative z-10">
                        <feature.icon className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3 mt-4 text-white">{feature.title}</h3>
                    <p className="text-gray-400 text-sm flex-grow">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Steps Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Start Trading in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Three Steps</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">A simple process to begin trading on our platform</p>
          </div>

          <div className="relative">
            <div className="grid md:grid-cols-2 gap-8 relative">
              {tradingSteps.map((step, index) => (
                <div
                  key={index}
                  className={`relative ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:col-start-2'}`}
                >
                  <Card className="bg-[#0a0a0a] border border-blue-900/30 h-full transition-all duration-300">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className={`flex ${index % 2 === 0 ? 'justify-between' : 'flex-row-reverse justify-between'} items-start mb-4`}>
                        <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-800/30 flex items-center justify-center relative z-10">
                          <step.icon className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/30 border border-blue-800/30 ${index % 2 === 0 ? 'ml-4' : 'mr-4'}`}>
                          <span className="text-sm font-mono text-blue-400">{step.step}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 mt-4 text-white">{step.title}</h3>
                      <p className="text-gray-400 text-sm flex-grow">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Built with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Reliable Technology</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our platform uses proven technology for better performance and security
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Smart Order Matching",
                description: "Our advanced system ensures you get the best prices for your trades with minimal slippage",
                icon: Code2,
              },
              {
                title: "Secure Trading",
                description:
                  "Built with industry-leading security measures to protect your assets and ensure safe trading",
                icon: ShieldCheck,
              },
              {
                title: "Fast Execution",
                description: "Lightning-fast trade execution with real-time market data and instant order processing",
                icon: Terminal,
              },
              {
                title: "Open Architecture",
                description: "Fully permissionless system allowing anyone to create markets and provide liquidity",
                icon: Puzzle,
              },
            ].map((tech, index) => (
              <div
                key={index}
                className="bg-[#0a0a0a] border border-blue-900/30 rounded-lg p-6 hover:border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-900/10 relative overflow-hidden group"
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-800/30 flex items-center justify-center">
                    <tech.icon className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{tech.title}</h3>
                </div>
                <p className="text-gray-400 pl-16 relative z-10">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-blue-900/30 rounded-xl p-12 shadow-md shadow-blue-900/20 relative overflow-hidden">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to <span className="text-transparent bg-clip-text bg-gray-200">Start Trading</span>?
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Join our platform today and see how easy trading can be. Start small and grow at your own pace.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/markets" target="_blank">
                  <Button className="bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:bg-gradient-to-r hover:from-blue-900 hover:to-blue-900 px-8 py-6 text-lg font-medium rounded-xl border border-blue-800/30 relative overflow-hidden group">
                    <div className="flex items-center gap-2 relative z-10">
                      Launch App
                      <ExternalLink size={20} />
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
