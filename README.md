# StarknetWalletTest

A React Native mobile application for testing connections to Argent Mobile using WalletConnect v2.

## Features

- Connect to Argent Mobile via WalletConnect v2
- Only Mainnet
- Deep linking to supported wallet apps
- Simple ETH transfer functionality for testing transactions

## Prerequisites

- Node.js (v18 or higher recommended)
- pnpm
- Expo CLI
- iOS/Android development environment

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/0xEniotna/demo-walletconnect-rn-mobile
   cd demo-walletconnect-rn-mobile
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure your WalletConnect project ID:
   - Open `App.tsx`
   - Replace `'your wallet connect project id'` with your actual WalletConnect project ID

## Running the App

```bash
# Start the Expo development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

## More doc:

- https://docs.argent.xyz/argent-wallets/argent-mobile/argent-mobile-for-your-mobile-native-app
- https://docs.reown.com/advanced/multichain/polkadot/dapp-integration-guide
- https://docs.reown.com/advanced/multichain/rpc-reference/starknet-rpc
