"use client"

import { type AvatarComponent, ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "../ui/button"
import Image from "next/image"
import Jazzicon, { jsNumberForAddress } from "react-jazzicon"
import { Wallet } from "lucide-react"

const ChainIcon = ({
  iconUrl,
  name,
  background,
  size = 20,
}: {
  iconUrl?: string
  name?: string
  background?: string
  size?: number
}) => (
  <div
    style={{
      background,
      width: size,
      height: size,
      borderRadius: 999,
      overflow: "hidden",
      marginRight: 4,
    }}
  >
    {iconUrl && (
      <Image
        alt={`${name ?? "Chain"} icon`}
        src={iconUrl || "/placeholder.svg"}
        style={{ width: size, height: size }}
        width={size}
        height={size}
      />
    )}
  </div>
)

export const CustomAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  return ensImage ? (
    <Image
      src={ensImage || "/placeholder.svg"}
      width={size}
      height={size}
      style={{ borderRadius: size }}
      alt="ENS image"
    />
  ) : (
    <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
  )
}

type BaseColorConfig = {
  shadowColor?: string
  textColor?: string
}

type GradientColorConfig = BaseColorConfig & {
  fromColor: string
  toColor: string
  hoverFromColor: string
  hoverToColor: string
  mode: "gradient"
}

type SolidColorConfig = BaseColorConfig & {
  backgroundColor: string
  hoverBackgroundColor: string
  mode: "solid"
}

type ColorConfig = GradientColorConfig | SolidColorConfig

const defaultGradientColors: GradientColorConfig = {
  fromColor: "from-blue-600",
  toColor: "to-blue-700",
  hoverFromColor: "hover:from-blue-500",
  hoverToColor: "hover:to-blue-600",
  shadowColor: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  textColor: "text-white",
  mode: "gradient",
}

const defaultSolidColors: SolidColorConfig = {
  backgroundColor: "bg-blue-500",
  hoverBackgroundColor: "hover:bg-blue-600",
  shadowColor: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  textColor: "text-white",
  mode: "solid",
}

export const ButtonConnectWallet = ({
  colors = defaultGradientColors,
  className,
}: {
  colors?: ColorConfig
  className?: string
}) => {
  return <ConnectButtonWalletComponents colors={colors} className={className} />
}

export const ConnectButtonWalletComponents = ({
  colors = defaultGradientColors,
  className,
}: {
  colors?: ColorConfig
  className?: string
}) => {
  const getButtonClassName = (colorConfig: ColorConfig) => {
    const { shadowColor, textColor } = colorConfig
    const commonClasses = `${textColor} ${shadowColor} hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all rounded-lg text-sm sm:text-xs font-bold`

    if (colorConfig.mode === "gradient") {
      const { fromColor, toColor, hoverFromColor, hoverToColor } = colorConfig
      return `bg-gradient-to-r ${fromColor} ${toColor} ${hoverFromColor} ${hoverToColor} ${commonClasses} ${className || ""}`
    } else {
      const { backgroundColor, hoverBackgroundColor } = colorConfig
      return `${backgroundColor} ${hoverBackgroundColor} ${commonClasses} ${className || ""}`
    }
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        if (!mounted) {
          return (
            <div
              aria-hidden="true"
              style={{
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )
        }

        const connected = account && chain

        if (!connected) {
          return (
            <Button onClick={openConnectModal} className={getButtonClassName(colors)}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )
        }

        if (chain?.unsupported) {
          return (
            <Button onClick={openChainModal} variant="destructive" className="text-sm sm:text-xs font-bold rounded-lg">
              Wrong network
            </Button>
          )
        }

        return (
          <div className="w-fit flex-col sm:flex-row flex gap-2 z-50">
            <Button
              onClick={openChainModal}
              variant="outline"
              className="text-sm sm:text-xs font-bold rounded-xl max-w-40 bg-[#1A1A1A] border-white/20 hover:border-blue-500/40 hover:bg-[#121212] text-white hover:text-white transition-all"
            >
              {chain.hasIcon && (
                <ChainIcon iconUrl={chain.iconUrl} name={chain.name} background={chain.iconBackground} />
              )}
              <span className="max-w-24 truncate text-white">{chain.name}</span>
            </Button>

            <Button
              onClick={openAccountModal}
              variant="outline"
              className="text-sm sm:text-xs font-bold rounded-xl bg-[#1A1A1A] border-white/20 hover:border-blue-500/40 hover:bg-[#121212] text-white hover:text-white transition-all"
            >
              {CustomAvatar && <CustomAvatar address={account.address} ensImage={account.ensAvatar} size={18} />}
              <span className="mx-2 text-white">{account.displayName}</span>
              <span className="text-white">{account.displayBalance ? ` (${account.displayBalance})` : ""}</span>
            </Button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export default ButtonConnectWallet
