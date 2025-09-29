"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Loader2, ArrowRight, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type SwapProgressDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceChain: string
  destinationChain: string
  sourceToken: string
  destinationToken: string
  amount: string
  txHash?: string
}

type SwapStep = {
  id: number
  title: string
  description: string
  status: "pending" | "processing" | "completed" | "failed"
}

export function SwapProgressDialog({
  open,
  onOpenChange,
  sourceChain,
  destinationChain,
  sourceToken,
  destinationToken,
  amount,
  txHash = "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
}: SwapProgressDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const isSameChain = sourceChain === destinationChain

  // Define steps for cross-chain swap
  const [steps, setSteps] = useState<SwapStep[]>([
    {
      id: 1,
      title: "Initiating Transaction",
      description: `Sending ${amount} ${sourceToken} from ${sourceChain}`,
      status: "pending",
    },
    {
      id: 2,
      title: "Confirming Source Chain Transaction",
      description: "Waiting for block confirmations",
      status: "pending",
    },
    {
      id: 3,
      title: "Bridging Assets",
      description: `Transferring from ${sourceChain} to ${destinationChain}`,
      status: "pending",
    },
    {
      id: 4,
      title: "Finalizing on Destination Chain",
      description: `Receiving ${destinationToken} on ${destinationChain}`,
      status: "pending",
    },
  ])

  // Simulate progress for demo purposes
  useEffect(() => {
    if (!open) return

    // If same chain, immediately show success
    if (isSameChain) {
      setIsComplete(true)
      return
    }

    // Reset state when dialog opens
    setCurrentStep(0)
    setProgress(0)
    setIsComplete(false)

    // Update steps status to pending
    setSteps(steps.map((step) => ({ ...step, status: "pending" })))

    // Simulate progress through each step
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timer)
          setIsComplete(true)
          return prev
        }

        // Update current step status to completed
        setSteps((prevSteps) =>
          prevSteps.map((step) =>
            step.id === prev + 1
              ? { ...step, status: "completed" }
              : step.id === prev + 2
                ? { ...step, status: "processing" }
                : step,
          ),
        )

        return prev + 1
      })

      setProgress((prev) => {
        const newProgress = prev + 100 / steps.length
        return newProgress > 100 ? 100 : newProgress
      })
    }, 2000) // Each step takes 2 seconds in this demo

    return () => clearInterval(timer)
  }, [open, isSameChain, steps.length])

  // Format transaction hash for display
  const formatTxHash = (hash: string) => {
    if (!hash) return ""
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{isComplete ? "Swap Completed" : "Swap in Progress"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {isSameChain || isComplete ? (
            // Success state
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-medium">Swap Successful</h3>
              <p className="text-center text-muted-foreground">
                {`Successfully swapped ${amount} ${sourceToken} to ${destinationToken}`}
              </p>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Transaction:</span>
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-primary"
                >
                  {formatTxHash(txHash)}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            // Progress state for cross-chain swaps
            <>
              <div className="w-full space-y-4">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{sourceChain.substring(0, 1)}</span>
                    </div>
                    <span>{sourceChain}</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{destinationChain.substring(0, 1)}</span>
                    </div>
                    <span>{destinationChain}</span>
                  </div>
                </div>

                <Progress value={progress} className="h-2" />

                <div className="space-y-3">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : step.status === "processing" ? (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        ) : (
                          <div
                            className={`h-5 w-5 rounded-full border-2 ${
                              step.status === "failed" ? "border-red-500" : "border-muted-foreground/30"
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            step.status === "completed"
                              ? "text-green-500"
                              : step.status === "processing"
                                ? "text-primary"
                                : step.status === "failed"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                <p>Please do not close this window until the swap is complete</p>
                <p>
                  Transaction: <span className="font-mono">{formatTxHash(txHash)}</span>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center">
          {isComplete && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

