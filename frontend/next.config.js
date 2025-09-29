const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // Temporarily disabled for WebSocket testing
    webpack: (config) => {
        config.resolve.fallback = { fs: false, net: false, tls: false };
        return config;
    },
    publicRuntimeConfig: {
        NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
        NEXT_PUBLIC_DEFAULT_CHAIN: process.env.NEXT_PUBLIC_DEFAULT_CHAIN,
        NEXT_PUBLIC_USE_SUBGRAPH: process.env.NEXT_PUBLIC_USE_SUBGRAPH,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "4509846877306880",
  project: "4509847025221632",
}, {
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});