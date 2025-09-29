import React, { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import ButtonConnectWallet from '../button-connect-wallet.tsx/button-connect-wallet'
import GradientLoader from '../gradient-loader/gradient-loader'
import { AuthWrapper } from '../auth/auth-wrapper'
import { usePrivyAuth } from '@/hooks/use-privy-auth'

interface WalletWrapperProps {
    children: React.ReactNode
    usePrivyAuth?: boolean
}

const WalletWrapper: React.FC<WalletWrapperProps> = ({ children, usePrivyAuth: enablePrivy = false }) => {
    const { isConnecting, isConnected } = useAccount()
    const { signMessage, status: signStatus } = useSignMessage()
    const privyAuth = usePrivyAuth()
    const [showLoader, setShowLoader] = useState(false)

    useEffect(() => {
        // Show loader when connecting wallet
        if (isConnecting) {
            setShowLoader(true)
            const timer = setTimeout(() => {
                setShowLoader(false)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [isConnecting])

    useEffect(() => {
        // Show loader when signing
        if (signStatus === 'pending') {
            setShowLoader(true)
            const timer = setTimeout(() => {
                setShowLoader(false)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [signStatus])

    // Use Privy authentication if enabled
    if (enablePrivy) {
        if (!privyAuth.ready) {
            return <GradientLoader />
        }
        
        if (!privyAuth.isFullyAuthenticated) {
            return <AuthWrapper requireWallet={true}>{children}</AuthWrapper>
        }
        
        return (
            <>
                {showLoader && <GradientLoader />}
                {children}
            </>
        )
    }

    // Use traditional wallet authentication
    if (!isConnected) {
        return <ButtonConnectWallet />
    }

    return (
        <>
            {showLoader && <GradientLoader />}
            {children}
        </>
    )
}

export default WalletWrapper