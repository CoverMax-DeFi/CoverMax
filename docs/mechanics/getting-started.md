# Getting Started

## Introduction

Welcome to CoverMax Protocol! This guide will walk you through everything you need to start providing insurance, trading risk tokens, and earning yields.

## Prerequisites

### What You'll Need

1. **Web3 Wallet**
   - MetaMask, Rainbow, or any Web3 wallet
   - Connected to supported network
   - Some ETH for gas fees

2. **Yield-Bearing Assets**
   - aUSDC (Aave USDC)
   - cUSDT (Compound USDT)
   - Minimum 10 tokens

3. **Basic Understanding**
   - DeFi concepts
   - Token trading
   - Risk management

## Quick Start Guide

### Step 1: Acquire Yield-Bearing Assets

First, you need aUSDC or cUSDT tokens:

#### Option A: Deposit into Aave
```
1. Visit app.aave.com
2. Connect wallet
3. Deposit USDC
4. Receive aUSDC automatically
```

#### Option B: Deposit into Compound
```
1. Visit app.compound.finance
2. Connect wallet
3. Supply USDT
4. Receive cUSDT tokens
```

#### Option C: Buy on Uniswap
```
1. Visit app.uniswap.org
2. Swap USDC → aUSDC
3. Or swap USDT → cUSDT
```

### Step 2: Check Protocol Phase

Before depositing, verify the current phase:

```javascript
// Check current phase (0=DEPOSIT, 1=COVERAGE, 2=CLAIMS, 3=FINAL_CLAIMS)
const phase = await riskVault.currentPhase();

// Get time remaining in current phase
const phaseInfo = await riskVault.getPhaseInfo();
const timeRemaining = phaseInfo.timeRemaining;
```

**Important**: You can only deposit during the DEPOSIT phase (first 2 days of cycle)

### Step 3: Approve Token Spending

Allow the RiskVault to use your tokens:

```javascript
// For aUSDC
await aUSDC.approve(RISK_VAULT_ADDRESS, depositAmount);

// For cUSDT
await cUSDT.approve(RISK_VAULT_ADDRESS, depositAmount);
```

### Step 4: Deposit Assets

Deposit your yield-bearing tokens:

```javascript
// Deposit aUSDC
await riskVault.depositAsset(
    aUSDC_ADDRESS,  // Asset address
    1000e6          // Amount (1000 USDC with 6 decimals)
);

// You'll receive:
// - 500 CM-SENIOR tokens
// - 500 CM-JUNIOR tokens
```

### Step 5: Manage Your Position

After depositing, you have several options:

#### Option 1: Hold Both Tokens
- Maintain balanced exposure
- Earn full yields
- Standard risk/reward profile

#### Option 2: Trade on Uniswap
- Adjust risk exposure
- Take profits
- Rebalance positions

#### Option 3: Provide Liquidity
- Add to Uniswap pools
- Earn trading fees
- Support market depth

## Detailed Workflows

### For Conservative Users

1. **Deposit During Phase 1**
   ```javascript
   await riskVault.depositAsset(aUSDC_ADDRESS, amount);
   ```

2. **Sell Junior Tokens**
   ```javascript
   // On Uniswap
   // Swap CM-JUNIOR → CM-SENIOR
   // Or CM-JUNIOR → USDC
   ```

3. **Hold Senior Tokens**
   - Lower risk exposure
   - Priority redemption rights
   - Stable returns

4. **Redeem in Phase 3**
   ```javascript
   await riskVault.withdraw(
       seniorAmount,  // Your senior tokens
       0,            // No junior tokens
       aUSDC_ADDRESS // Preferred asset
   );
   ```

### For Yield Seekers

1. **Deposit Maximum Amount**
   ```javascript
   const maxDeposit = await getMaxDepositAmount();
   await riskVault.depositAsset(cUSDT_ADDRESS, maxDeposit);
   ```

2. **Buy Additional Junior Tokens**
   ```javascript
   // On Uniswap
   // Swap USDC → CM-JUNIOR
   // At potential discount
   ```

3. **Hold Through Coverage**
   - Higher risk exposure
   - Maximum yield potential
   - Speculate on no claims

4. **Exit Strategically**
   - Monitor claim events
   - Trade if risk increases
   - Redeem in final phase

### For Active Traders

1. **Initial Position**
   ```javascript
   // Deposit for base position
   await riskVault.depositAsset(aUSDC_ADDRESS, 5000e6);
   ```

2. **Monitor Markets**
   ```javascript
   // Track token prices
   const seniorPrice = await getSeniorTokenPrice();
   const juniorPrice = await getJuniorTokenPrice();
   const ratio = seniorPrice / juniorPrice;
   ```

3. **Execute Trades**
   - Arbitrage tier ratios
   - Trade on news/events
   - Provide liquidity

4. **Dynamic Management**
   - Adjust continuously
   - Take profits
   - Manage risk

## Common Operations

### Check Your Balances

```javascript
// Get your risk token balances
const [seniorBalance, juniorBalance] = await riskVault.getUserTokenBalances(userAddress);

// Get underlying value
const [aUSDCValue, cUSDTValue] = await riskVault.calculateWithdrawalAmounts(
    seniorBalance,
    juniorBalance
);
```

### Calculate Redemption Value

```javascript
// For proportional withdrawal
const amounts = await riskVault.calculateWithdrawalAmounts(
    seniorTokens,
    juniorTokens
);

// For single asset withdrawal
const singleAssetAmount = await riskVault.calculateSingleAssetWithdrawal(
    seniorTokens,
    juniorTokens,
    preferredAsset
);
```

### Monitor Protocol Status

```javascript
// Get protocol status
const status = await riskVault.getProtocolStatus();
console.log({
    emergencyMode: status.emergency,
    totalTokensIssued: status.totalTokens,
    currentPhase: status.phase,
    phaseEndTime: status.phaseEndTime
});

// Get vault balances
const [aUSDCVault, cUSDTVault] = await riskVault.getVaultBalances();
```

## Best Practices

### Before Depositing

1. **Verify Phase**: Only deposit during DEPOSIT phase
2. **Check Yields**: Compare current APYs
3. **Assess Risk**: Understand potential scenarios
4. **Plan Strategy**: Decide holding vs trading

### During Coverage

1. **Monitor Events**: Watch for claim triggers
2. **Track Prices**: Follow token valuations
3. **Stay Informed**: Join community channels
4. **React Quickly**: Adjust positions as needed

### When Withdrawing

1. **Time It Right**: Consider phase advantages
2. **Choose Assets**: Select preferred redemption
3. **Calculate Fees**: Account for gas costs
4. **Plan Next Cycle**: Prepare for re-entry

## Safety Tips

### Security

- Never share private keys
- Verify contract addresses
- Use hardware wallets for large amounts
- Double-check transactions

### Risk Management

- Don't invest more than you can afford to lose
- Understand junior token risks
- Diversify across cycles
- Keep some dry powder

### Smart Contract Interaction

- Always verify addresses
- Check approval amounts
- Monitor gas prices
- Use appropriate slippage

## Troubleshooting

### Common Issues

1. **"InvalidPhaseForDeposit" Error**
   - Solution: Wait for next DEPOSIT phase
   - Current phase is not accepting deposits

2. **"InsufficientDepositAmount" Error**
   - Solution: Deposit at least 10 tokens
   - Amount is below minimum threshold

3. **"UnevenDepositAmount" Error**
   - Solution: Deposit even amounts only
   - Protocol requires even numbers for 50/50 split

4. **"TransferOperationFailed" Error**
   - Solution: Check token approval
   - Ensure sufficient balance

### Getting Help

- **Documentation**: Read all guides thoroughly
- **Community**: Join Discord/Telegram
- **Support**: Contact team for issues
- **FAQ**: Check common questions

## Next Steps

Now that you understand the basics:

1. **[Depositing Assets](depositing-assets.md)**: Detailed deposit guide
2. **[Risk Token Trading](risk-token-trading.md)**: Trading strategies
3. **[Withdrawals](withdrawals.md)**: Redemption process
4. **[Emergency Mode](emergency-mode.md)**: Safety mechanisms

---

Ready to start? Make sure you're in the DEPOSIT phase and have your yield-bearing assets ready!