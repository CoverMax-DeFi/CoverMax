# Depositing Assets

## Overview

Depositing assets into CoverMax Protocol is your entry point to decentralized insurance. This guide covers everything you need to know about the deposit process, from preparation to receiving your risk tokens.

## Deposit Requirements

### Minimum Amounts

| Requirement | Value | Reason |
|-------------|-------|---------|
| **Minimum Deposit** | 10 tokens | Prevent dust amounts |
| **Even Amounts Only** | Required | For 50/50 token split |
| **Maximum Deposit** | No limit | Subject to gas costs |

### Supported Assets

Currently accepted:
- **aUSDC**: Aave's interest-bearing USDC
- **cUSDT**: Compound's interest-bearing USDT

### Phase Requirement

⚠️ **Important**: Deposits are ONLY accepted during the DEPOSIT phase (first 48 hours of each 7-day cycle)

## Pre-Deposit Checklist

### 1. Verify Current Phase

```javascript
// Check if deposits are open
const currentPhase = await riskVault.currentPhase();
if (currentPhase !== 0) {
    console.log("Deposits closed. Wait for next cycle.");
    return;
}

// Check time remaining
const phaseInfo = await riskVault.getPhaseInfo();
console.log(`Time remaining: ${phaseInfo.timeRemaining} seconds`);
```

### 2. Acquire Yield-Bearing Assets

#### Getting aUSDC

```javascript
// Option 1: Direct deposit to Aave
// 1. Approve USDC for Aave
await usdc.approve(AAVE_POOL_ADDRESS, usdcAmount);

// 2. Deposit to Aave
await aavePool.supply(
    USDC_ADDRESS,
    usdcAmount,
    userAddress,
    0 // referral code
);
// You now have aUSDC

// Option 2: Swap on DEX
// Buy aUSDC directly on Uniswap/Curve
```

#### Getting cUSDT

```javascript
// Option 1: Direct deposit to Compound
// 1. Approve USDT for Compound
await usdt.approve(COMPOUND_CUSDT_ADDRESS, usdtAmount);

// 2. Mint cUSDT
await cUSDT.mint(usdtAmount);

// Option 2: Swap on DEX
// Buy cUSDT directly on Uniswap
```

### 3. Calculate Deposit Amount

```javascript
// Ensure even amount for equal token split
function calculateValidDepositAmount(desiredAmount) {
    // Round down to nearest even number
    const validAmount = Math.floor(desiredAmount / 2) * 2;
    
    // Check minimum
    if (validAmount < 10) {
        return 10; // Minimum valid amount
    }
    
    return validAmount;
}

// Example: User wants to deposit 1001 USDC
const validAmount = calculateValidDepositAmount(1001); // Returns 1000
```

## Deposit Process

### Step 1: Approve Token Spending

```javascript
// Get deposit amount (must be even)
const depositAmount = 1000 * 1e6; // 1000 USDC (6 decimals)

// Approve RiskVault to spend your tokens
const tx1 = await aUSDC.approve(
    RISK_VAULT_ADDRESS,
    depositAmount
);
await tx1.wait();

console.log("Approval successful!");
```

### Step 2: Execute Deposit

```javascript
// Deposit aUSDC
const tx2 = await riskVault.depositAsset(
    AUSDC_ADDRESS,    // Asset address
    depositAmount     // Amount to deposit
);

const receipt = await tx2.wait();
console.log("Deposit successful!");

// Extract event data
const depositEvent = receipt.events.find(
    e => e.event === 'AssetDeposited'
);

console.log({
    depositor: depositEvent.args.depositor,
    asset: depositEvent.args.asset,
    amount: depositEvent.args.amount,
    tokensIssued: depositEvent.args.tokensIssued
});
```

### Step 3: Verify Token Receipt

```javascript
// Check your new risk token balances
const [seniorBalance, juniorBalance] = await riskVault.getUserTokenBalances(
    userAddress
);

console.log(`Received ${seniorBalance} CM-SENIOR tokens`);
console.log(`Received ${juniorBalance} CM-JUNIOR tokens`);

// Verify 50/50 split
assert(seniorBalance.eq(juniorBalance), "Token split should be equal");
assert(seniorBalance.mul(2).eq(depositAmount), "Total should match deposit");
```

## Understanding Token Distribution

### Equal Split Mechanism

For every deposit, you receive:
```
Deposit: 1000 aUSDC
↓
Receive: 500 CM-SENIOR + 500 CM-JUNIOR
```

### Why Equal Distribution?

1. **Fair Start**: Everyone begins with balanced exposure
2. **Market Decides**: Trading determines final risk allocation
3. **Flexibility**: Users can adjust through trading
4. **Simplicity**: Easy to understand and calculate

## Deposit Strategies

### Strategy 1: Large Single Deposit

**Approach**: Deposit maximum amount at once

**Pros**:
- Single transaction (lower gas)
- Immediate full position
- Can start trading all tokens

**Cons**:
- No averaging opportunity
- Full exposure to initial pricing

```javascript
// Example: Large deposit
const largeDeposit = 10000 * 1e6; // 10,000 USDC
await riskVault.depositAsset(AUSDC_ADDRESS, largeDeposit);
// Receive: 5,000 Senior + 5,000 Junior
```

### Strategy 2: Multiple Deposits

**Approach**: Split across multiple transactions

**Pros**:
- Average entry prices
- Test with smaller amounts
- Flexible positioning

**Cons**:
- Higher gas costs
- More complex tracking

```javascript
// Example: Split deposits
const amounts = [1000, 2000, 3000].map(a => a * 1e6);
for (const amount of amounts) {
    await riskVault.depositAsset(AUSDC_ADDRESS, amount);
    // Monitor token prices between deposits
}
```

### Strategy 3: Asset Diversification

**Approach**: Deposit both aUSDC and cUSDT

**Pros**:
- Diversify yield sources
- Hedge protocol risks
- Access different rates

**Cons**:
- Multiple approvals
- Track two positions

```javascript
// Example: Diversified deposits
await riskVault.depositAsset(AUSDC_ADDRESS, 5000 * 1e6);
await riskVault.depositAsset(CUSDT_ADDRESS, 5000 * 1e6);
// Total: 5,000 Senior + 5,000 Junior
```

## Post-Deposit Actions

### Immediate Options

1. **Hold All Tokens**
   - Balanced risk/reward
   - No additional action needed
   - Wait for yields to accrue

2. **Trade on Uniswap**
   - Adjust risk exposure
   - Take immediate profits
   - Provide liquidity

3. **Transfer to Cold Storage**
   - Secure long-term holding
   - Reduce hot wallet risk
   - Still tradeable later

### Tracking Your Position

```javascript
// Monitor your investment value
async function trackPosition(userAddress) {
    // Get token balances
    const [senior, junior] = await riskVault.getUserTokenBalances(userAddress);
    
    // Get underlying value
    const [aUSDCValue, cUSDTValue] = await riskVault.calculateWithdrawalAmounts(
        senior,
        junior
    );
    
    // Get market prices (from Uniswap)
    const seniorPrice = await getSeniorTokenPrice();
    const juniorPrice = await getJuniorTokenPrice();
    
    // Calculate total value
    const marketValue = senior.mul(seniorPrice).add(junior.mul(juniorPrice));
    const underlyingValue = aUSDCValue.add(cUSDTValue);
    
    return {
        tokens: { senior, junior },
        underlying: { aUSDC: aUSDCValue, cUSDT: cUSDTValue },
        marketValue,
        underlyingValue
    };
}
```

## Common Issues & Solutions

### Issue 1: Transaction Fails

**Error**: "InsufficientDepositAmount"
```javascript
// Solution: Ensure amount >= 10
const minDeposit = 10 * 1e6; // 10 tokens minimum
```

**Error**: "UnevenDepositAmount"
```javascript
// Solution: Ensure amount is even
const evenAmount = Math.floor(amount / 2) * 2;
```

**Error**: "InvalidPhaseForDeposit"
```javascript
// Solution: Wait for next deposit phase
const phase = await riskVault.currentPhase();
if (phase !== 0) {
    console.log("Wait for next cycle's deposit phase");
}
```

### Issue 2: Approval Problems

```javascript
// Check current allowance
const allowance = await aUSDC.allowance(userAddress, RISK_VAULT_ADDRESS);

// If insufficient, approve exact amount
if (allowance.lt(depositAmount)) {
    await aUSDC.approve(RISK_VAULT_ADDRESS, depositAmount);
}

// Or approve maximum for convenience
await aUSDC.approve(RISK_VAULT_ADDRESS, ethers.constants.MaxUint256);
```

### Issue 3: Gas Estimation

```javascript
// Estimate gas before transaction
const gasEstimate = await riskVault.estimateGas.depositAsset(
    AUSDC_ADDRESS,
    depositAmount
);

// Add 20% buffer
const gasLimit = gasEstimate.mul(120).div(100);

// Execute with custom gas
await riskVault.depositAsset(
    AUSDC_ADDRESS,
    depositAmount,
    { gasLimit }
);
```

## Best Practices

### Before Depositing

1. **Double-check phase**: Ensure DEPOSIT phase is active
2. **Verify amounts**: Even numbers, minimum 10
3. **Check gas prices**: Avoid high congestion
4. **Test small first**: Try minimum amount initially

### During Deposit

1. **Monitor transaction**: Wait for confirmation
2. **Save receipts**: Store transaction hashes
3. **Verify events**: Check emitted events
4. **Confirm balances**: Ensure tokens received

### After Depositing

1. **Record position**: Note token amounts
2. **Set alerts**: Monitor phase changes
3. **Plan strategy**: Decide hold vs trade
4. **Track performance**: Monitor value changes

## Advanced Topics

### Multi-Signature Deposits

For DAOs or protocols:
```javascript
// 1. Create deposit proposal
const proposal = {
    target: RISK_VAULT_ADDRESS,
    data: riskVault.interface.encodeFunctionData(
        'depositAsset',
        [AUSDC_ADDRESS, amount]
    )
};

// 2. Execute through multisig
await multisig.executeTransaction(proposal);
```

### Programmatic Deposits

For automated strategies:
```javascript
// Monitor phase changes
riskVault.on('PhaseTransitioned', async (from, to) => {
    if (to === 0) { // DEPOSIT phase started
        // Execute pre-planned deposit
        await executeDepositStrategy();
    }
});
```

---

Continue to [Risk Token Trading](risk-token-trading.md) to learn how to trade your newly acquired risk tokens on Uniswap.