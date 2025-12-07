# Candlestick Chart with Trading Simulator

A Next.js application featuring an interactive candlestick chart with trading simulation, replay functionality, and localStorage persistence.

## Features

- 📊 Interactive candlestick charts with lightweight-charts
- 📈 RSI (Relative Strength Index) indicator
- 💰 Buy/sell trading simulation
- ⏯️ Replay functionality for historical data
- 💾 localStorage persistence (saves/restore sessions)
- 📱 Responsive design with Tailwind CSS
- 🚀 Static export ready for deployment

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Get Data**: Use Yahoo Finance API URL to fetch stock data
2. **Parse**: Paste JSON response and click "Parse & Display"
3. **Trade**: Use buy/sell buttons to simulate trading
4. **Replay**: Use replay controls to step through historical data
5. **Persist**: All data is automatically saved to localStorage

## Static Export

This application supports static export for deployment to any static hosting service:

```bash
# Build static files
npm run export

# Serve locally for testing
npm run serve
```

The static files will be generated in the `out/` directory.

## Deploy

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Branch Structure

- `main`: Primary development branch (contains latest features)
- `candlenew`: Secondary branch for testing/experimental features

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
