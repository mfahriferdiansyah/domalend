import Header from "@/components/header/header";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { ThemeProvider } from "next-themes";
import type { AppProps } from "next/app";
import "../styles/globals.css";
import Head from "next/head";
import { ReactNode, useEffect, useState } from "react";
import { NextPage } from "next/types";
import { Toaster } from "@/components/ui/toaster";
import { useRouter } from "next/router";
import Providers from "@/providers/privy-provider";
import { ClientOnly } from "@/components/client-only";

// Doma Testnet chain ID
const DOMA_TESTNET_CHAIN_ID = 97476;

// Add type to support getLayout
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactNode) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Add handle to open and close right panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Function to toggle the panel's open/close state
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Effect to handle body scroll when panel is open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPanelOpen]);

  return (
    <>
      <Header onTogglePanel={togglePanel} />
      {children}
      <Toaster />
    </>
  );
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  // Get getLayout from component, fallback to Main Layout
  const getLayout = Component.getLayout || ((page: ReactNode) => (
    <ClientOnly fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <Providers>
        <RainbowKitProvider
          initialChain={DOMA_TESTNET_CHAIN_ID}
          theme={darkTheme({
            accentColor: "#3b82f6",
            accentColorForeground: "white",
          })}
        >
          <Head>
            <title>DomaLend - AI-Powered Domain Lending Platform</title>
            <meta name="description" content="Unlock liquidity from your domain NFTs with AI-powered lending on Doma Protocol" />
            <link rel="icon" type="image/png" href="/favicon.ico" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          </Head>
          <ThemeProvider
            disableTransitionOnChange
            attribute="class"
            defaultTheme="light"
            value={{ light: "light", dark: "dark" }}
          >
            <AppLayout>
              {page}
            </AppLayout>
          </ThemeProvider>
        </RainbowKitProvider>
      </Providers>
    </ClientOnly>
  ));

  return getLayout(<Component {...pageProps} />);
}

export default MyApp;