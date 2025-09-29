"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ExternalLink, ArrowRight, ChevronRight, Users, BarChart4, Zap, Globe, Shield, ArrowRightCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRef, useState } from "react"

export function HeroSection() {
    const [priceValue, setPriceValue] = useState(89324.5)
    const [priceChange, setPriceChange] = useState(2.4)
    const chartRef = useRef<SVGPathElement>(null)
    const chartAreaRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLDivElement>(null)

    const stats = [
        { icon: Users, value: "50K+", label: "Active Traders" },
        { icon: BarChart4, value: "$2.5B", label: "Monthly Volume" },
        { icon: Zap, value: "0.01s", label: "Execution Time" },
    ]

    const features = [
        { icon: Zap, text: "Lightning Fast" },
        { icon: Shield, text: "Secure Trading" },
        { icon: Globe, text: "Global Access" },
    ]

    return (
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative z-10 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 md:w-80 md:h-80 bg-blue-500/5 rounded-full blur-3xl"></div>

                {/* Animated grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:30px_30px] md:bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left side - CTA content */}
                    <div className="md:order-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                            className="space-y-4 sm:space-y-6"
                        >
                            <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full border border-blue-500/30 bg-blue-900/20 text-blue-400 text-xs sm:text-sm font-medium">
                                <span className="mr-2 size-2 rounded-full bg-blue-400"></span>
                                Decentralized Trading Platform
                            </div>

                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                Great Trading{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                                    Xperience
                                </span>
                            </h2>

                            <p className="text-base sm:text-lg md:text-xl text-gray-300">
                                A decentralized finance protocol enabling permissionless spot trading with plans to expand into perpetual
                                markets. Trade with confidence on our secure platform.
                            </p>

                            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2">
                                <Link href="/markets" target="_blank" className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium rounded-xl relative overflow-hidden group">
                                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-full transition-all duration-1000 ease-out"></span>
                                        <div className="flex items-center gap-2 relative z-10">
                                            Launch App
                                            <ExternalLink className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                                        </div>
                                    </Button>
                                </Link>

                                {/* <Button
                                    variant="outline"
                                    className="border-blue-900/50 hover:border-blue-500/50 text-white px-6 py-6 text-lg font-medium rounded-xl"
                                >
                                    <div className="flex items-center gap-2">
                                        View Documentation
                                        <ArrowRight size={18} />
                                    </div>
                                </Button> */}
                            </div>

                            {/* Feature badges */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 1.2 }}
                                className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4"
                            >
                                {features.map((feature, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1.5 sm:gap-2 bg-[#0a0a0a] border border-blue-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
                                    >
                                        <feature.icon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                                        <span className="text-xs sm:text-sm text-gray-300">{feature.text}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Right column - Trading dashboard (hidden on mobile) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="relative order-1 md:order-2 -mx-4 sm:mx-0 hidden md:block"
                    >
                        {/* Glow effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-20"></div>

                        {/* Trading dashboard mockup */}
                        <div className="relative rounded-2xl bg-[#0a0a0a] border border-blue-900/30 overflow-hidden shadow-2xl shadow-blue-900/20">
                            {/* Glowing border effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />

                            {/* Header with tabs */}
                            <div className="bg-[#111111] px-6 py-4 border-b border-blue-900/30 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="font-bold text-white">BTC/USD</span>
                                    <span className={`${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        ${priceValue.toFixed(2)}
                                    </span>
                                    <span className={`text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {priceChange >= 0 ? "+" : ""}
                                        {priceChange.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex text-sm">
                                    <div className="px-3 py-1 bg-blue-900/30 text-white rounded-l-md border-y border-l border-blue-800/30">
                                        1H
                                    </div>
                                    <div className="px-3 py-1 bg-blue-900/50 text-white border-y border-blue-800/30">4H</div>
                                    <div className="px-3 py-1 bg-[#0a0a0a] text-gray-300 rounded-r-md border-y border-r border-blue-800/30">
                                        1D
                                    </div>
                                </div>
                            </div>

                            {/* Chart area */}
                            <div className="px-6 py-8 bg-[#0a0a0a]" ref={chartAreaRef}>
                                <div className="h-60 w-full relative">
                                    {/* Price grid lines */}
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="absolute w-full h-px bg-blue-900/30" style={{ top: `${i * 25}%` }}>
                                            <span className="absolute right-0 transform -translate-y-1/2 text-xs text-gray-400">
                                                ${Math.round(89324 - i * 1000)}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Chart line - SVG */}
                                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                        <path
                                            ref={chartRef}
                                            d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30"
                                            fill="none"
                                            stroke="url(#lineGradient)"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M0,120 C40,100 80,140 120,80 C160,20 200,60 240,40 C280,20 320,50 360,30 L360,180 L0,180 Z"
                                            fill="url(#areaGradient)"
                                        />
                                        <defs>
                                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#60a5fa" />
                                            </linearGradient>
                                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>

                                    {/* Price indicator dot */}
                                    <div
                                        ref={indicatorRef}
                                        className="absolute top-[30px] right-[40px] w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0a0a0a] shadow-lg shadow-blue-500/50"
                                    />
                                </div>
                            </div>

                            {/* Trading controls */}
                            <div className="px-6 pb-6 grid grid-cols-2 gap-4 bg-[#0a0a0a]">
                                <button className="py-3 px-5 bg-gradient-to-r from-green-600/80 to-green-500/80 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-500 transition-colors relative overflow-hidden group border border-green-500/30">
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-400/0 via-green-400/30 to-green-400/0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-full transition-all duration-1000 ease-out"></span>
                                    <span className="relative z-10">BUY / LONG</span>
                                </button>
                                <button className="py-3 px-5 bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-500 transition-colors relative overflow-hidden group border border-red-500/30">
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-400/0 via-red-400/30 to-red-400/0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-full transition-all duration-1000 ease-out"></span>
                                    <span className="relative">SELL / SHORT</span>
                                </button>
                            </div>
                        </div>

                        {/* Stats floating card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="absolute -right-4 -bottom-16 p-4 bg-[#0a0a0a] border border-blue-900/30 rounded-xl shadow-md shadow-blue-900/20 w-64"
                        >
                            {/* Glowing border effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />

                            <div className="flex justify-between items-center mb-3 relative z-10">
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
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-400">Liquidity</span>
                                    <span className="text-xs font-medium text-blue-400">$3.5B</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Mobile Trading Preview (visible only on small screens) */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="md:hidden order-1 mb-6 relative"
                    >
                        <div className="bg-[#0a0a0a] border border-blue-900/30 rounded-xl p-4 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="font-bold text-sm text-white">BTC/USD</span>
                                    <span className={`text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        ${priceValue.toFixed(2)}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${priceChange >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    {priceChange >= 0 ? "+" : ""}
                                    {priceChange.toFixed(2)}%
                                </span>
                            </div>
                            
                            {/* Simplified chart representation */}
                            <div className="h-12 w-full mb-4 relative overflow-hidden rounded-md bg-blue-900/10">
                                <div className="absolute bottom-0 left-0 right-0 h-[80%]">
                                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                                        <path d="M0,30 C10,25 20,35 30,20 C40,5 50,15 60,10 C70,5 80,12 90,8 L100,8 L100,40 L0,40 Z" 
                                            fill="url(#mobileGradient)" />
                                        <path d="M0,30 C10,25 20,35 30,20 C40,5 50,15 60,10 C70,5 80,12 90,8" 
                                            stroke="#3b82f6" 
                                            strokeWidth="1.5" 
                                            fill="none" />
                                        <defs>
                                            <linearGradient id="mobileGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                            </div>

                            {/* Mobile trading buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button className="py-2 px-3 bg-gradient-to-r from-green-600/80 to-green-500/80 text-white text-xs font-bold rounded-lg border border-green-500/30">
                                    BUY / LONG
                                </button>
                                <button className="py-2 px-3 bg-gradient-to-r from-red-600/80 to-red-500/80 text-white text-xs font-bold rounded-lg border border-red-500/30">
                                    SELL / SHORT
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Mobile stats section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="md:hidden mt-8 p-4 bg-[#0a0a0a] border border-blue-900/30 rounded-xl shadow-md shadow-blue-900/20"
                >
                    <div className="relative z-10">
                        {/* Glowing border effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />

                        <div className="flex justify-between items-center mb-3 relative z-10">
                            <h4 className="text-sm font-semibold text-white">Market Stats</h4>
                            <ArrowRightCircle size={16} className="text-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">24h Volume</span>
                                <div className="text-xs font-medium text-blue-400">$1.2B</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">Open Interest</span>
                                <div className="text-xs font-medium text-blue-400">$840M</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">Funding Rate</span>
                                <div className="text-xs font-medium text-green-400">+0.01%</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">Liquidity</span>
                                <div className="text-xs font-medium text-blue-400">$3.5B</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}