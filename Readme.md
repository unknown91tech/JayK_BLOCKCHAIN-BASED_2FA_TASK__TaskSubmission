# Blockchain Two-Factor Authentication System

A decentralized two-factor authentication (2FA) system built on blockchain technology, implementing Time-based One-Time Password (TOTP) functionality similar to Google Authenticator.

## Project Overview

This project implements a blockchain-based two-factor authentication system that provides:

- User registration with unique username and public key
- TOTP (Time-based One-Time Password) generation and validation
- Protection against replay attacks
- OTP expiration mechanism (30-second time window)
- Ability to update OTP seeds

Unlike traditional 2FA systems that rely on centralized servers, this implementation leverages blockchain technology for enhanced security, transparency, and decentralization.

## Architecture

The project consists of two main components:

```
|= blockchain/  - Smart contracts and testing scripts
|  |= contracts/
|  |  |= TOTP.sol
|  |  |= TwoFactorAuth.sol
|  |= scripts/
|  |  |= deploy.js
|  |  |= interact.js
|  |  |= expiration-test.js
|  |= hardhat.config.js
|  |= deployments/
|     |= unknown-deployment.json
|
|= frontend/  - React-based web interface
   |= components/
   |  |= TwoFactorAuth.tsx
   |= pages/
   |  |= index.tsx
   |  |= _app.tsx
   |= styles/
      |= globals.css
```

## Smart Contracts

### TOTP.sol

Core contract that implements the Time-based One-Time Password algorithm:

- Generates 6-digit OTPs based on a seed and current timestamp
- Validates OTPs against a time window (default: 30 seconds)
- Provides utilities for time window management

### TwoFactorAuth.sol

Main contract that handles user management and authentication:

- User registration with username, public key, and OTP seed
- OTP-based authentication
- Protection against replay attacks
- OTP seed management
- Events for important actions (registration, authentication, etc.)

## Frontend Application

A React-based web application that provides a user-friendly interface for interacting with the smart contracts:

- Connect wallet integration (MetaMask compatible)
- User registration interface
- OTP generation and authentication
- OTP seed management
- Visual countdown timer for OTP expiration
- Responsive design

### Key Features

- **Wallet Connection**: Connect with MetaMask or other Web3 wallets
- **User Registration**: Create an account with a unique username
- **OTP Generation**: Generate time-based one-time passwords
- **Authentication**: Verify identity using public key and OTP
- **Seed Management**: Update OTP seed for enhanced security
- **Expiration Visualization**: Visual countdown for OTP validity

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MetaMask or another Ethereum wallet
- Hardhat for local blockchain development

### Blockchain Setup

1. Install dependencies:
   ```bash
   cd blockchain
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PRIVATE_KEY=
   SEPOLIA_URL=
   HOODI_URL=
   ETHERSCAN_API_KEY=
   CONTRACT_ADDRESS=your_twofactorauth_contract_address

   ```

3. Compile smart contracts:
   ```bash
   npx hardhat compile
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Update contract address in `TwoFactorAuth.tsx`:
   ```javascript
   const CONTRACT_ADDRESS = "your_deployed_contract_address";
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Testing

The project includes comprehensive test scripts to verify contract functionality:

### expiration-test.js

Tests the core functionality of the TwoFactorAuth contract:
- User registration and lookup
- Authentication flow
- Replay attack prevention
- Invalid OTP handling

### interact.js

Interactive script for manual testing:
- User registration
- OTP generation and validation
- Replay attack testing
- OTP expiration testing

To run tests:

```bash
npx hardhat run scripts/expiration-test.js --network <network-name>

npx hardhat run scripts/deploy.js --network hoodi
```

## Deployment

The system is deployable to any EVM-compatible blockchain. The project includes a deployment script (`deploy.js`) that:

1. Deploys both TOTP and TwoFactorAuth contracts
2. Saves deployment information to a JSON file
3. Verifies contracts on block explorers (if configured)

To deploy:

```bash
npx hardhat run scripts/deploy.js --network <network-name>

npx hardhat run scripts/deploy.js --network hoodi
```

The most recent deployment was to the Hoodi testnet (Chain ID: 560048) with the following addresses:

HOODI TESTNET:

- TOTP: `0x3465351394c6FCaE1c209D1103f60Ae6F4DcA309`
- TwoFactorAuth: `0x14c252626fB54E5303D5Ddc5B237E9c6C25fa93e`

SEPOLIA TESTNET: 

- TOTP: `0xd2C4393079401583Aa66b72020457b381FE18783`
- TwoFactorAuth: `0x8A6343cda53A66F6FE380E454f928c28E45D4E64`

## Security Considerations

While this system provides a robust implementation of 2FA on blockchain, consider the following:

1. **OTP Seed Security**: The seed used for OTP generation must be kept secure
2. **Public Key Management**: Secure storage of public keys is essential
3. **Gas Costs**: Authentication operations require gas payments
4. **Block Timestamp**: The system relies on block timestamps, which have slight variability
5. **Front-running Protection**: The current implementation has basic protections against replay attacks

