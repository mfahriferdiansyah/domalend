"use client";

import { Zap } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

// Feature Card Component
const FeatureCard = ({ title, description, children, className = "" }: FeatureCardProps) => {
  return (
    <div className={`bg-[#0a0a0a] border border-blue-900/30 rounded-lg p-6 shadow-lg h-full hover:border-blue-400/50 transition-all duration-500 relative overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
      <div className="relative z-10 h-full flex flex-col">
        <div className="mb-6">{children}</div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-400 text-sm flex-grow">{description}</p>
      </div>
    </div>
  );
};

interface KeyProps {
  className?: string;
  children: React.ReactNode;
}

// Key Component
const Key = ({ className = "", children }: KeyProps) => {
  return (
    <div className={`bg-[#111] rounded-lg px-4 py-2 border border-gray-800 ${className}`}>
      <span className="text-white font-medium">{children}</span>
    </div>
  );
};

const features = [
    "Spot Trading",
    "Order Books",
    "Smart Contracts",
    "Multi-Chain",
    "No KYC",
    "Low Fees",
];

const parentVariants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.7,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

export function RiseFeaturesSection() {
    return (
        <section className="py-20 relative z-10">
            <div className="max-w-screen-xl mx-auto px-4">
                <h2 className="text-4xl md:text-5xl font-bold text-center mt-6 max-w-5xl m-auto">
                    Where power meets{" "}
                    <span className="text-blue-400">simplicity</span>
                </h2>
                <motion.div
                    variants={parentVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-3 gap-8">
                        <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            <FeatureCard
                                title="Real-time trading"
                                description="Execute trades instantly with our high-performance matching engine"
                                className="md:col-span-2 lg:col-span-1"
                            >
                                <div className="aspect-video flex items-center justify-center">
                                    <div className="relative w-48 h-48">
                                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400/20 rounded-full animate-pulse"></div>
                                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-400/30 rounded-full"></div>
                                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                            <Zap size={50} className="text-blue-400" />
                                        </div>
                                    </div>
                                </div>
                            </FeatureCard>
                        </motion.div>

                        <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            <FeatureCard
                                title="Market analytics"
                                description="Advanced charting and data analysis for informed trading decisions"
                                className="md:col-span-2 lg:col-span-1 group transition duration-500"
                            >
                                <div className="aspect-video flex items-center justify-center">
                                    <div className="w-full relative h-32 flex items-end">
                                        <div className="absolute top-0 left-0 w-full flex justify-between">
                                            <span className="text-xs text-gray-400">$90,000</span>
                                            <span className="text-xs text-green-400">+2.4%</span>
                                        </div>
                                        
                                        {/* Chart bars */}
                                        {[40, 60, 45, 80, 30, 65, 70, 20, 50, 90, 40, 30].map((height, i) => (
                                            <div 
                                                key={i} 
                                                className="w-full mx-0.5 group-hover:bg-blue-400/80 bg-blue-500/80 transition-all duration-300"
                                                style={{ height: `${height}%` }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </FeatureCard>
                        </motion.div>

                        <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            <FeatureCard
                                title="Advanced order types"
                                description="Full control with limit, market, stop-loss, and trailing orders"
                                className="group md:col-span-2 md:col-start-2 lg:col-span-1 lg:col-start-auto"
                            >
                                <div className="aspect-video flex justify-center items-center gap-4">
                                    <Key className="w-28 outline outline-2 outline-transparent group-hover:outline-blue-400 transition-all duration-500 outline-offset-2 group-hover:translate-y-1">
                                        market
                                    </Key>
                                    <Key className="outline outline-2 outline-transparent group-hover:outline-blue-400 transition-all duration-500 outline-offset-2 group-hover:translate-y-1 delay-150">
                                        limit
                                    </Key>
                                    <Key className="outline outline-2 outline-transparent group-hover:outline-blue-400 transition-all duration-500 outline-offset-2 group-hover:translate-y-1 delay-300">
                                        stop
                                    </Key>
                                </div>
                            </FeatureCard>
                        </motion.div>
                    </div>
                </motion.div>

                <div className="my-12 flex items-center justify-center flex-wrap gap-3 max-w-3xl m-auto">
                    {features.map((feature) => (
                        <div
                            className="bg-[#0a0a0a] border border-blue-900/30 inline-flex px-3 md:px-5 md:py-2 py-1.5 rounded-2xl gap-3 items-center hover:scale-105 transition duration-500 group"
                            key={feature}
                        >
                            <span className="bg-blue-400 text-neutral-900 size-5 rounded-full inline-flex items-center justify-center text-xl group-hover:rotate-45 transition duration-500">
                                &#10038;
                            </span>
                            <span className="font-medium md:text-lg text-white">
                                {feature}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}