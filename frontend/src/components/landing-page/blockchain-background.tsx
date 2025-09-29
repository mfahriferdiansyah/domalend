"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export function BlockchainBackground() {
  const [mounted, setMounted] = useState(false)
  const [randomPositions, setRandomPositions] = useState<Array<{
    left: number;
    top: number;
    rotate?: number;
    width?: number;
  }>>([])
  const [binaryStrings, setBinaryStrings] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    
    // Generate random positions for nodes, connections, data blocks, orbs, and circuit paths
    const positions = [
      // Nodes
      ...Array(15).fill(0).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      })),
      // Connections
      ...Array(20).fill(0).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        rotate: Math.random() * 360,
        width: 50 + Math.random() * 100,
      })),
      // Data blocks
      ...Array(10).fill(0).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        rotate: Math.random() * 360,
      })),
      // Orbs
      ...Array(8).fill(0).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      })),
      // Circuit paths
      ...Array(12).fill(0).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        rotate: Math.random() * 360,
        width: 30 + Math.random() * 70,
      })),
    ]
    
    setRandomPositions(positions)
    
    // Generate binary strings for the rain effect
    const binary = Array(20).fill(0).map(() => 
      Array(20).fill(0).map(() => Math.random() > 0.5 ? "1" : "0").join("")
    )
    setBinaryStrings(binary)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
      {/* Fluid background gradient */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-blue-900/40"
          animate={{
            background: [
              "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.5), rgba(79, 70, 229, 0.2), rgba(59, 130, 246, 0.4))",
              "radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.5), rgba(79, 70, 229, 0.2), rgba(59, 130, 246, 0.4))",
              "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.5), rgba(79, 70, 229, 0.2), rgba(59, 130, 246, 0.4))",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

     

      {/* Data blocks with fluid motion */}
      <div className="absolute inset-0">
        {randomPositions.slice(35, 45).map((pos, i) => (
          <motion.div
            key={`block-${i}`}
            className="absolute w-16 h-16 border border-blue-400/30"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: `rotate(${pos.rotate}deg)`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 360],
              x: [0, Math.sin(i * 0.7) * 15, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 8 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 border-t border-b border-blue-400/30" />
              <div className="absolute inset-0 border-l border-r border-blue-400/30 transform rotate-60" />
              <div className="absolute inset-0 border-l border-r border-blue-400/30 transform -rotate-60" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Binary code rain effect with fluid motion */}
      <div className="absolute inset-0 overflow-hidden">
        {binaryStrings.map((binary, i) => (
          <motion.div
            key={`binary-${i}`}
            className="absolute text-blue-400/30 font-mono text-sm whitespace-nowrap"
            style={{
              left: `${Math.random() * 100}%`,
              top: "-20px",
            }}
            animate={{
              y: ["0%", "100%"],
              opacity: [0, 0.6, 0],
              x: [0, Math.sin(i * 0.3) * 10, 0],
            }}
            transition={{
              duration: 10 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {binary}
          </motion.div>
        ))}
      </div>

      

      {/* Circuit paths with fluid motion */}
      <div className="absolute inset-0">
        {randomPositions.slice(53, 65).map((pos, i) => (
          <motion.div
            key={`circuit-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${pos.width}px`,
              transform: `rotate(${pos.rotate}deg)`,
            }}
            animate={{
              opacity: [0, 0.4, 0],
              scaleX: [0, 1, 0],
              x: [0, Math.sin(i * 0.6) * 10, 0],
              y: [0, Math.cos(i * 0.6) * 10, 0],
            }}
            transition={{
              duration: 5 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400/50"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 1, 0.6],
                x: [0, Math.sin(i * 0.4) * 5, 0],
                y: [0, Math.cos(i * 0.4) * 5, 0],
              }}
              transition={{
                duration: 2 + i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Fluid wave effect */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: [0.2, 0.3, 0.2],
              d: [
                "M0,50 C25,30 50,70 75,50 C100,30 125,70 150,50",
                "M0,50 C25,70 50,30 75,50 C100,70 125,30 150,50",
                "M0,50 C25,30 50,70 75,50 C100,30 125,70 150,50"
              ]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            d="M0,50 C25,30 50,70 75,50 C100,30 125,70 150,50"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="0.5"
            fill="none"
          />
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: [0.2, 0.3, 0.2],
              d: [
                "M0,30 C25,50 50,10 75,30 C100,50 125,10 150,30",
                "M0,30 C25,10 50,50 75,30 C100,10 125,50 150,30",
                "M0,30 C25,50 50,10 75,30 C100,50 125,50 150,30"
              ]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            d="M0,30 C25,50 50,10 75,30 C100,50 125,10 150,30"
            stroke="rgba(79, 70, 229, 0.2)"
            strokeWidth="0.5"
            fill="none"
          />
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: [0.2, 0.3, 0.2],
              d: [
                "M0,70 C25,90 50,50 75,70 C100,90 125,50 150,70",
                "M0,70 C25,50 50,90 75,70 C100,50 125,90 150,70",
                "M0,70 C25,90 50,50 75,70 C100,90 125,50 150,70"
              ]
            }}
            transition={{ 
              duration: 14,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            d="M0,70 C25,90 50,50 75,70 C100,90 125,50 150,70"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>

      {/* Data flow particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-blue-400/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              x: [0, Math.sin(i * 0.5) * 20, 0],
              y: [0, Math.cos(i * 0.5) * 20, 0],
            }}
            transition={{
              duration: 3 + i * 0.1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  )
} 