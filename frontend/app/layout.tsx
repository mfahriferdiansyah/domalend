import { WebSocketProvider } from '@/contexts/websocket-context';

export const metadata = {
  title: 'GTX - Great Trading eXperience',
  description: 'Decentralized trading platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get WebSocket URL from environment variable or use a default
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.gtx.exchange/ws';
  
  return (
    <html lang="en">
      <body>
        <WebSocketProvider url={wsUrl}>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  )
}
