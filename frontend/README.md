


This is a [RainbowKit](https://rainbowkit.com) + [wagmi](https://wagmi.sh) + [Next.js](https://nextjs.org/) project bootstrapped with [`create-rainbowkit`](https://github.com/rainbow-me/rainbowkit/tree/main/packages/create-rainbowkit).

## Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

### Environment Variables

#### DomaLend API Configuration
- `NEXT_PUBLIC_BACKEND_API_URL` - Backend API URL for pool and user domain data

#### Application Features
- `NEXT_PUBLIC_WAITLIST_MODE` - Enable/disable waitlist mode (redirects all pages to waitlist)

#### External Services
- `NEXT_PUBLIC_MAILCHIMP_API_KEY` - Mailchimp API key for newsletter/waitlist
- `NEXT_PUBLIC_MAILCHIMP_AUDIENCE_ID` - Mailchimp audience ID
- `NEXT_PUBLIC_MAILCHIMP_API_SERVER` - Mailchimp API server region

#### Trading & Blockchain
- `NEXT_PUBLIC_DEFAULT_CHAIN` - Default blockchain chain ID
- `NEXT_PUBLIC_USE_SUBGRAPH` - Enable/disable subgraph usage
- `ENABLED_CHAINS` - Comma-separated list of enabled chain IDs

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about this stack, take a look at the following resources:

- [RainbowKit Documentation](https://rainbowkit.com) - Learn how to customize your wallet connection flow.
- [wagmi Documentation](https://wagmi.sh) - Learn how to interact with Ethereum.
- [Next.js Documentation](https://nextjs.org/docs) - Learn how to build a Next.js application.

You can check out [the RainbowKit GitHub repository](https://github.com/rainbow-me/rainbowkit) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
