"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Copy, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationDialogProps {
  isOpen: boolean
  onClose: () => void
  message: string
  isSuccess: boolean
  txHash?: string
  explorerBaseUrl: string
}

// Helper function to parse and format error messages
function formatErrorMessage(errorMsg: string): string {
  // Check for common error patterns and provide user-friendly messages
  
  // User rejected transaction
  if (errorMsg.includes("User rejected the request") || 
      errorMsg.includes("user rejected") || 
      errorMsg.includes("rejected by user")) {
    return "Transaction was canceled. You rejected the request in your wallet.";
  }
  
  // Insufficient gas
  if (errorMsg.includes("insufficient funds") || 
      errorMsg.includes("gas required exceeds")) {
    return "Insufficient funds for transaction. Please check your balance.";
  }
  
  // RPC errors
  if (errorMsg.includes("RPC") || 
      errorMsg.includes("network error") || 
      errorMsg.includes("connection")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }
  
  // Timeout errors
  if (errorMsg.includes("timeout") || 
      errorMsg.includes("timed out")) {
    return "Transaction request timed out. Please try again.";
  }
  
  // Nonce errors
  if (errorMsg.includes("nonce")) {
    return "Transaction sequence error. Please refresh the page and try again.";
  }
  
  // Slippage errors
  if (errorMsg.includes("slippage")) {
    return "Price changed during transaction. Please try again with updated price.";
  }
  
  // Balance errors specific to our app
  if (errorMsg.includes("Insufficient balance")) {
    // This is already user-friendly, so return it as is
    return errorMsg;
  }
  
  // Unknown/generic error - use a generic message
  return "There was an error processing your transaction. Please try again.";
}

// Component for displaying transaction hash with copy functionality
function TransactionHash({
  txHash,
  onCopy,
  copied,
}: {
  txHash: string
  onCopy: () => void
  copied: boolean
}) {
  const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`

  return (
    <div className="mt-5 p-4 bg-blue-950/50 backdrop-blur-md rounded-xl border border-blue-400/30 relative overflow-hidden group">
      {/* Decorative hexagon pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="hexagons" width="28" height="49" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <path
              d="M14 0l14 24.5L14 49 0 24.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-blue-300"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>

      <div className="flex justify-between items-center relative z-10">
        <span className="text-sm font-medium text-blue-200">Transaction Hash</span>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 text-xs font-medium rounded-full px-3 transition-all duration-300",
            copied ? "bg-blue-500/20 text-blue-200" : "text-blue-300 hover:text-blue-100 hover:bg-blue-500/20",
          )}
          onClick={onCopy}
        >
          {copied ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-blue-300" />
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Copy size={14} />
              Copy Hash
            </span>
          )}
        </Button>
      </div>

      <div className="mt-2 relative">
        <p className="text-sm font-mono text-blue-100 overflow-hidden text-ellipsis tracking-wider" title={txHash}>
          {shortHash}
        </p>
        <div className="absolute left-0 bottom-0 h-[1px] w-full bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
      </div>
    </div>
  )
}

// Component for dialog actions
function DialogActions({ 
  isSuccess, 
  txHash, 
  explorerBaseUrl 
}: { 
  isSuccess: boolean; 
  txHash?: string;
  explorerBaseUrl: string;
}) {
  if (!isSuccess || !txHash) return null

  return (
    <div className="mt-6 flex justify-center">
      <Button
        variant="outline"
        size="lg"
        className="border-blue-400/30 bg-blue-900/30 text-blue-100 hover:bg-blue-800/50 hover:border-blue-400/50 backdrop-blur-sm flex items-center gap-2 px-6 py-5 h-auto rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
        onClick={() => window.open(`${explorerBaseUrl}${txHash}`, "_blank")}
      >
        View on Explorer <ExternalLink size={16} />
      </Button>
    </div>
  )
}

// Decorative elements component
function DecorativeElements({ isSuccess }: { isSuccess: boolean }) {
  return (
    <>
      {/* Circuit-like decorative lines */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[150px] h-[150px]">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="90" cy="10" r="3" className="fill-blue-400/30" />
            <path
              d="M90 10 H60 V40 H30 V70"
              fill="none"
              stroke="rgba(96, 165, 250, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <circle cx="30" cy="70" r="2" className="fill-blue-400/30" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-[120px] h-[120px]">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="10" cy="90" r="3" className="fill-blue-400/30" />
            <path
              d="M10 90 H40 V60 H70 V30"
              fill="none"
              stroke="rgba(96, 165, 250, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <circle cx="70" cy="30" r="2" className="fill-blue-400/30" />
          </svg>
        </div>
      </div>

      {/* Glowing orbs */}
      <div
        className={cn(
          "absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl opacity-60",
          isSuccess ? "bg-blue-500" : "bg-red-500",
        )}
      />
      <div
        className={cn(
          "absolute -left-4 -bottom-4 w-12 h-12 rounded-full blur-xl opacity-40",
          isSuccess ? "bg-blue-400" : "bg-red-400",
        )}
      />
    </>
  )
}

export function NotificationDialog({ 
  isOpen, 
  onClose, 
  message, 
  isSuccess, 
  txHash,
  explorerBaseUrl
}: NotificationDialogProps) {
  const [open, setOpen] = useState(isOpen)
  const [copied, setCopied] = useState(false)
  const [formattedMessage, setFormattedMessage] = useState(message)

  useEffect(() => {
    // Process and format the error message when it changes
    if (!isSuccess) {
      setFormattedMessage(formatErrorMessage(message));
    } else {
      setFormattedMessage(message);
    }
  }, [message, isSuccess]);

  useEffect(() => {
    setOpen(isOpen)
    if (isOpen) {
      // Auto-close successful notifications after 10 seconds
      // But keep error notifications open until user takes action
      if (isSuccess) {
        const timer = setTimeout(() => {
          setOpen(false)
          onClose()
        }, 10000)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, onClose, isSuccess])

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const bgGradient = isSuccess
    ? "bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800"
    : "bg-gradient-to-br from-red-950 via-red-900 to-red-800"

  const iconBg = isSuccess ? "bg-blue-100" : "bg-red-100"
  const iconColor = isSuccess ? "text-blue-600" : "text-red-600"
  const glowColor = isSuccess ? "shadow-blue-500/50" : "shadow-red-500/50"
  const statusIcon = isSuccess ? <CheckCircle size={28} /> : <AlertCircle size={28} />
  const statusTitle = isSuccess ? "Transaction Successful" : "Transaction Failed"
  const textColor = isSuccess ? "text-blue-100" : "text-red-100"

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpenState) => {
        setOpen(newOpenState)
        if (!newOpenState) onClose()
      }}
    >
      <DialogContent
        className="p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-w-[480px] sm:max-w-[520px] z-50 mx-auto"
        style={{ maxHeight: "calc(100vh - 40px)" }}
      >
        <div className={cn("relative", bgGradient)}>
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-3 top-3 z-50 hover:text-white rounded-full h-8 w-8",
              isSuccess ? "text-blue-200 hover:bg-blue-800/50" : "text-red-200 hover:bg-red-800/50"
            )}
            onClick={onClose}
          >
            <X size={16} />
            <span className="sr-only">Close</span>
          </Button>

          <div className="relative p-6 sm:p-8">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <DialogHeader className="flex flex-col items-center text-center mb-5">
                {/* Status icon with animation */}
                <div
                  className={cn(
                    "rounded-full p-3 flex-shrink-0 mb-4 shadow-lg transition-all duration-500",
                    iconBg,
                    iconColor,
                    isSuccess 
                      ? "shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                      : "shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  )}
                >
                  {statusIcon}
                </div>

                <DialogTitle className="text-2xl font-bold text-white tracking-tight">{statusTitle}</DialogTitle>

                <p className={cn("mt-3 text-opacity-90 max-w-sm mx-auto", textColor)}>{formattedMessage}</p>
              </DialogHeader>

              {/* Transaction hash section */}
              {isSuccess && txHash && <TransactionHash txHash={txHash} onCopy={handleCopy} copied={copied} />}

              {/* Action buttons */}
              <DialogActions isSuccess={isSuccess} txHash={txHash} explorerBaseUrl={explorerBaseUrl} />
            </div>
          </div>

          {/* Decorative elements */}
          <DecorativeElements isSuccess={isSuccess} />

          {/* Bottom hexagon border */}
          <div className="absolute bottom-0 left-0 w-full h-2 overflow-hidden">
            <div className="absolute inset-0 flex">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-2 w-4 border-l border-r", 
                    isSuccess ? "border-blue-400/30" : "border-red-400/30"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}