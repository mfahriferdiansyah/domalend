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
import BlurText from "@/blocks/TextAnimations/BlurText/BlurText"
import { BlockchainBackground } from "../landing-page/blockchain-background"
import { RiseFeaturesSection } from "./feature-section"
import { RiseIntegrationsSection } from "./integration-section"
import { ProblemsSection } from "./problem-section"
import { TradingStepsSection } from "./trading-step-section"
import { HeroSection } from "./hero-section"
import { TechnologySection } from "./technology-section"

export function LandingRise() {
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
            {/* {mounted && <BlockchainBackground />} */}

            {/* Hero Section */}
            <HeroSection />

            {/* Problems Section */}
            <ProblemsSection />

            {/* Features Section - New Component */}
            <RiseFeaturesSection />

            {/* Trading Steps Section */}
            <TradingStepsSection />

            {/* Integrations Section */}
            <RiseIntegrationsSection />

            {/* Technology Section */}
            <TechnologySection />

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
                                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg font-medium rounded-xl relative overflow-hidden group">
                                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-full transition-all duration-1000 ease-out"></span>
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