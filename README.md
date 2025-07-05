# CoverVault 🛡️

*A decentralized insurance protocol powered by tradeable risk tokens*

## Overview

CoverVault is a revolutionary insurance protocol that transforms traditional insurance through **tradeable risk tokens** for **yield-bearing collateral**. Users deposit yield-bearing assets (like aUSDC or cUSDT) and receive dual-tier risk tokens that can be traded on Uniswap. The more risk tokens sold in the market, the more insurance coverage is provided to the community.

## 🧠 How It Works

### The Insurance Mechanism

1. **Deposit Phase** (2 days): Users deposit yield-bearing assets (aUSDC, cUSDT) into insurance pools
2. **Token Issuance**: For each deposit, users receive equal amounts of:
   - **Senior Risk Tokens** (CV-SENIOR) - Lower risk, priority claims
   - **Junior Risk Tokens** (CV-JUNIOR) - Higher risk, subordinate claims
3. **Trading Phase**: Risk tokens can be traded on Uniswap like any ERC20 token
4. **Coverage Phase** (3 days): Active insurance period where claims can be submitted
5. **Redemption Phase**: Token holders can redeem remaining tokens for underlying assets

### The Risk-Insurance Relationship

The core innovation is that **selling risk tokens = providing insurance coverage**:

- When you **hold** risk tokens: You bear the risk of insurance claims
- When you **sell** risk tokens: You transfer that risk to the buyer
- When you **buy** risk tokens: You're taking on insurance risk for potential yield

### Example Scenarios

#### Risk Tier Trading (Advanced Strategy)
```
1. Alice deposits 1000 aUSDC → receives 500 CV-SENIOR + 500 CV-JUNIOR tokens
2. Bob deposits 1000 cUSDT → receives 500 CV-SENIOR + 500 CV-JUNIOR tokens
3. Bob wants more downside protection, so he trades on CV-SENIOR/CV-JUNIOR pool:
   - Sells 200 CV-JUNIOR tokens → receives 190 CV-SENIOR tokens (5% lost in value)
4. Bob now holds 690 CV-SENIOR + 300 CV-JUNIOR tokens (990 total)
   - Result: Bob forfeited 10 tokens of potential upside for senior claim priority
5. Alice see a opportunity to buy cheap CV-JUNIOR tokens that are redeemable to the same underlying token, so she buys the them. She now holds 310 CV-SENIOR + 700 CV-JUNIOR tokens (1010 total)
6. If one of the underlying yield protocols get exploited: Bob's 690 senior tokens get paid before any junior tokens. He can withdraw up to 990 yield tokens.
7. if there was no exploit: Alice's 310 senior tokens get paid before any junior tokens. She can withdraw up to 1010 yield tokens.
```

## 🏗️ Protocol Architecture

### Core Contracts

- **[`RiskVault.sol`](contracts/RiskVault.sol)**: Main protocol contract managing deposits, claims, and tokenization
- **[`RiskToken.sol`](contracts/RiskToken.sol)**: ERC20 implementation for risk tokens with mint/burn functionality
- **[`IRiskToken.sol`](contracts/IRiskToken.sol)**: Interface for risk token operations

### Supported Assets

- **aUSDC**: Aave interest-bearing USDC
- **cUSDT**: Compound interest-bearing USDT
- *Extensible to other yield-bearing assets*

### Risk Token Tiers

| Token Type | Risk Level | Claim Priority | Use Case |
|------------|------------|----------------|----------|
| CV-SENIOR  | Lower      | First claims   | Conservative insurance providers |
| CV-JUNIOR  | Higher     | Subordinate    | Risk-seeking yield farmers |

## 🔄 Protocol Lifecycle

### Phase 1: Deposit Period (2 days)
- Users deposit yield-bearing assets
- Dual-tier risk tokens are minted 1:1 with deposits
- Tokens can be traded immediately on Uniswap

### Phase 2: Coverage Period (5 days)
- Active insurance coverage for deposited assets
- Claims can be submitted and processed
- Risk tokens continue trading on secondary markets

### Phase 3: Senior Claims (1 day)
- Priority redemption period for senior token holders
- Senior tokens have first claim on remaining assets

### Phase 4: Final Claims (1 day)
- All remaining tokens can be redeemed
- Protocol cycle completes and can restart

## 💰 Economic Model

### For Insurance Providers
- **Deposit** yield-bearing assets to earn insurance premiums
- **Hold tokens** to bear risk and earn yield from claims that don't materialize
- **Sell tokens** to reduce risk exposure and lock in profits

### For Risk Traders
- **Buy risk tokens** on Uniswap to speculate on insurance outcomes
- **Sell risk tokens** to exit positions or reduce exposure
- **Arbitrage** between risk levels and market pricing

### For Insurance Seekers
- **Submit claims** backed by evidence when covered events occur
- **Receive payouts** from the insurance pool when claims are approved
- **Benefit** from community-funded insurance coverage

## 🦄 Uniswap Integration

### Why Uniswap?
Risk tokens are standard ERC20 tokens that can be traded on any DEX. Uniswap provides:
- **Liquidity**: Deep markets for risk token trading
- **Price Discovery**: Market-driven risk pricing
- **Accessibility**: Anyone can buy/sell insurance risk
- **Composability**: Risk tokens can be used in other DeFi protocols

### Trading Strategy Examples

#### 1. Risk Tier Arbitrage (CV-SENIOR ↔ CV-JUNIOR Pool)
```solidity
// Strategy: Trade down risk by converting junior to senior tokens
// Bob wants more downside protection, less upside exposure
uniswapRouter.swapExactTokensForTokens(
    200 * 1e18, // Sell 200 CV-JUNIOR tokens
    190 * 1e18, // Expect ~190 CV-SENIOR tokens (forfeit some upside)
    [juniorToken, seniorToken],
    msg.sender,
    deadline
);

// Result: Bob now has more senior tokens (priority claims)
// but less junior tokens (subordinate claims)
```

#### 2. Complete Risk Exit (Risk Token → Stablecoin)
```solidity
// Strategy: Exit insurance position entirely
// Sell risk tokens for stablecoins to eliminate exposure
uniswapRouter.swapExactTokensForTokens(
    250 * 1e18, // Sell 250 CV-SENIOR tokens
    minAmountOut,
    [seniorToken, USDC],
    msg.sender,
    deadline
);
```

#### 3. Risk Speculation (Stablecoin → Risk Token)
```solidity
// Strategy: Buy underpriced risk for potential yield
// Charlie thinks insurance claims are unlikely
uniswapRouter.swapExactTokensForTokens(
    1000 * 1e6, // Spend 1000 USDC
    minTokensOut,
    [USDC, juniorToken],
    msg.sender,
    deadline
);
```

## 🔧 Technical Implementation

### Smart Contract Features

- **Reentrancy Protection**: All external functions protected against reentrancy attacks
- **Phase-Based Logic**: Automated lifecycle management with time-based phases
- **Proportional Redemption**: Fair distribution of assets based on token holdings
- **Emergency Pause**: Owner can pause protocol in emergencies
- **Claim Processing**: Structured insurance claim submission and approval system

### Security Considerations

- **Audited OpenZeppelin contracts** for standard functionality
- **Custom errors** for gas-efficient error handling
- **Precision math** using 27-decimal precision for accurate calculations
- **Access controls** with owner-only administrative functions

## 📊 Key Metrics

### Protocol Health
- **Total Value Locked (TVL)**: Combined value of all deposited assets
- **Insurance Coverage Ratio**: Amount of active insurance coverage
- **Token Distribution**: Spread of risk across token holders
- **Claim Success Rate**: Percentage of approved vs submitted claims

### Market Dynamics
- **Risk Token Price**: Market valuation of insurance risk
- **Liquidity Depth**: Available trading volume on Uniswap
- **Volatility**: Price stability of risk tokens
- **Arbitrage Opportunities**: Price differences between risk tiers

## 🚀 Getting Started

### For Developers

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat ignition deploy ignition/modules/RiskToken.ts --network localhost

# Deploy to Flow testnet
npx hardhat ignition deploy ignition/modules/RiskToken.ts --network flow-testnet
```

### For Users

1. **Deposit Assets**: Call `depositAsset(asset, amount)` with aUSDC or cUSDT
2. **Receive Risk Tokens**: Get equal amounts of CM-SENIOR and CM-JUNIOR tokens3. **Trade on 3. **Uniswap**: Buy/sell risk tokens to manage your exposure
4. **Monitor Phases**: Track current phase using `getProtocolStatus()`
5. **Withdraw During Claims**: Use `withdrawSeniorTokens()` during Claims phase
6. **Final Withdrawal**: Call `withdrawAll()` during Final Claims phase

## 📈 Use Cases

### 1. DeFi Risk Management
- **Protect** yield farming positions against smart contract risks
- **Hedge** lending positions against liquidation events
- **Insure** staking rewards against slashing conditions

### 2. Institutional Insurance
- **Corporate** treasury protection for crypto holdings
- **Protocol** insurance for DAOs and DeFi projects
- **Custodial** services for institutional crypto exposure

### 3. Speculation and Trading
- **Trade** risk like any other asset class
- **Arbitrage** between different risk levels and time periods
- **Provide liquidity** to insurance markets for yield

## 🔮 Future Enhancements

- **Multi-Asset Support**: Expand to more yield-bearing assets
- **Dynamic Pricing**: Implement automated risk pricing mechanisms
- **Cross-Chain**: Deploy on multiple blockchains for broader access
- **Governance**: Introduce community governance for protocol parameters

## 📄 Contract Addresses

### Flow Testnet
- **RiskVault**: Successfully deployed (see deployment artifacts)
- **CM-SENIOR Token**: Auto-deployed by RiskVault
- **CM-JUNIOR Token**: Auto-deployed by RiskVault

### Development
- **aUSDC Mock**: Available for testing
- **cUSDT Mock**: Available for testing
- **Uniswap V2 Contracts**: Included for potential trading integration

## 🤝 Contributing

Contributions welcome! This project includes:
- **Hardhat development environment**
- **TypeScript support**
- **Comprehensive test suite**
- **Deployment scripts**

## 📜 License

MIT License

---

*CoverVault: Phase-based risk management with dual-tier tokens*
