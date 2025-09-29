"use client"

import React, { useState, useEffect, useRef } from "react"
import { ShieldCheck } from "lucide-react"
interface Integration {
  name: string;
  description: string;
  icon?: string;
}

interface IntegrationColumnProps {
  integrations: Integration[];
  className?: string;
  reverse?: boolean;
}

// IntegrationColumn component with vertical layout and larger icon
const IntegrationColumn = React.memo(({ integrations, className = "", reverse = false }: IntegrationColumnProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (columnRef.current) {
      observer.observe(columnRef.current);
    }

    return () => {
      if (columnRef.current) {
        observer.unobserve(columnRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={columnRef}
      className={`flex flex-col gap-8 ${isVisible ? 'animate-scroll' : ''} ${reverse ? 'animate-scroll-reverse' : ''} ${className}`}
      style={{ 
        animationDuration: '20s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
        animationFillMode: 'forwards'
      }}
    >
      {integrations.map((integration, index) => (
        <div
          key={`${integration.name}-${index}`}
          className="bg-[#0a0a0a] border border-blue-900/30 rounded-lg p-6 shadow-lg shadow-blue-900/10 hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="flex items-center justify-center mb-4">
              {integration.icon ? (
                <img 
                  src={integration.icon} 
                  alt={integration.name} 
                  className="h-20 w-20 rounded-xl"
                  loading="lazy"
                />
              ) : (
                <ShieldCheck className="h-10 w-10 text-blue-500" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{integration.name}</h3>
            <p className="text-gray-400">{integration.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

IntegrationColumn.displayName = 'IntegrationColumn';

export function RiseIntegrationsSection() {
  // Mock integrations data
  const integrations = [
    {
      icon: "/images/metamask.png",
      name: "Metamask",
      description: "Connect your Metamask wallet for secure and easy transactions"
    },
    // {
    //   icon: "/images/coinbase.png",
    //   name: "Coinbase",
    //   description: "Integration with Coinbase for seamless funds transfer and trading"
    // },
    {
      icon: "/images/rise.jpg",
      name: "Rise Chain",
      description: 'The fastest blockchain, secured by Ethereum.',
    },
    {
      icon: "/images/tradingview.png",
      name: "TradingView",
      description: "Powerful charting capabilities powered by TradingView"
    },
    {
      icon: "/images/espresso.png",
      name: "Espresso Network",
      description: 'A confirmation layer built to support cross-chain composability.',
    },
    // {
    //   icon: "/images/binance.png",
    //   name: "Binance",
    //   description: "Access Binance liquidity pools through our platform"
    // },
    {
      icon: "/images/chainlink.png",
      name: "Chainlink",
      description: "Price oracle integration through Chainlink network"
    },
  ]

  return (
    <section className="py-20 relative z-10 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Seamless</span> Ecosystem
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our platform integrates with your favorite tools and services for a complete trading experience
          </p>
        </div>

        <div className="grid lg:grid-cols-2 items-center lg:gap-16">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              Play well with <span className="text-blue-500">others</span>
            </h3>
            <p className="text-gray-300 mb-6">
              Rise connects seamlessly with your favorite trading tools and platforms. 
              It&apos;s easy to plug into any workflow and collaborate across your preferred services.
            </p>
            <ul className="space-y-4">
              {integrations.slice(0, 3).map((integration, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-900/30 border border-blue-800/30 flex items-center justify-center mr-3 mt-1">
                    <span className="text-xs text-blue-500">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{integration.name}</h4>
                    <p className="text-sm text-gray-400">{integration.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="grid md:grid-cols-2 gap-4 lg:h-[600px] h-[400px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
              <IntegrationColumn integrations={integrations} />
              <IntegrationColumn
                integrations={integrations.slice().reverse()}
                className="hidden md:flex"
                reverse
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        
        @keyframes scrollReverse {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        
        .animate-scroll-reverse {
          animation: scrollReverse 20s linear infinite;
        }
      `}</style>
    </section>
  )
}