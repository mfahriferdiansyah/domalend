'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// WebSocket connection states
export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  RECONNECTING = 'reconnecting'
}

// WebSocket context interface
interface WebSocketContextType {
  socket: WebSocket | null;
  connectionState: WebSocketConnectionState;
  lastMessage: any;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  isReconnected: boolean;
  resetReconnectedFlag: () => void;
}

// Default context values
const defaultContextValue: WebSocketContextType = {
  socket: null,
  connectionState: WebSocketConnectionState.CLOSED,
  lastMessage: null,
  sendMessage: () => {},
  reconnect: () => {},
  isReconnected: false,
  resetReconnectedFlag: () => {}
};

// Create context
const WebSocketContext = createContext<WebSocketContextType>(defaultContextValue);

// Props for the WebSocket provider
interface WebSocketProviderProps {
  url: string;
  children: ReactNode;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
  reconnectInterval = 5000,
  maxReconnectAttempts = 10
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    WebSocketConnectionState.CLOSED
  );
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnected, setIsReconnected] = useState(false);

  // Function to create a new WebSocket connection
  const createWebSocket = useCallback(() => {
    try {
      const newSocket = new WebSocket(url);
      
      newSocket.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionState(WebSocketConnectionState.OPEN);
        setReconnectAttempts(0);
        
        // If this was a reconnection, set the reconnected flag
        if (connectionState === WebSocketConnectionState.RECONNECTING) {
          setIsReconnected(true);
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setLastMessage(parsedData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setLastMessage(event.data);
        }
      };

      newSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionState(WebSocketConnectionState.CLOSED);
        
        // Attempt to reconnect if not manually closed
        if (connectionState !== WebSocketConnectionState.CLOSING) {
          handleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setSocket(newSocket);
      setConnectionState(WebSocketConnectionState.CONNECTING);
      
      return newSocket;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionState(WebSocketConnectionState.CLOSED);
      return null;
    }
  }, [url, connectionState]);

  // Function to handle reconnection
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      setConnectionState(WebSocketConnectionState.RECONNECTING);
      setReconnectAttempts((prev) => prev + 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
        createWebSocket();
      }, reconnectInterval);
    } else {
      console.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
      setConnectionState(WebSocketConnectionState.CLOSED);
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, createWebSocket]);

  // Function to manually reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    setReconnectAttempts(0);
    createWebSocket();
  }, [socket, createWebSocket]);

  // Function to send a message
  const sendMessage = useCallback(
    (message: any) => {
      if (socket && connectionState === WebSocketConnectionState.OPEN) {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(messageString);
      } else {
        console.error('Cannot send message, WebSocket is not connected');
      }
    },
    [socket, connectionState]
  );

  // Reset the reconnected flag
  const resetReconnectedFlag = useCallback(() => {
    setIsReconnected(false);
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = createWebSocket();
    
    // Cleanup function
    return () => {
      if (newSocket) {
        setConnectionState(WebSocketConnectionState.CLOSING);
        newSocket.close();
      }
    };
  }, [createWebSocket]);

  // Context value
  const value: WebSocketContextType = {
    socket,
    connectionState,
    lastMessage,
    sendMessage,
    reconnect,
    isReconnected,
    resetReconnectedFlag
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};
