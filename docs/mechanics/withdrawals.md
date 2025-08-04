# Withdrawals

## Overview

Withdrawing from CoverMax Protocol involves redeeming your risk tokens for the underlying yield-bearing assets. The withdrawal process varies based on the current protocol phase and whether emergency mode is active.

## Withdrawal Rules by Phase

### Phase-Specific Conditions

| Phase | Senior Tokens | Junior Tokens | Requirements |
|-------|---------------|---------------|--------------|
| **Deposit** | ✅ Allowed | ✅ Allowed | Must withdraw equal amounts |
| **Coverage** | ✅ Allowed | ✅ Allowed | Must withdraw equal amounts |
| **Claims** | ✅ Priority | ✅ Allowed* | Senior priority if emergency |
| **Final Claims** | ✅ Allowed | ✅ Allowed | Any combination allowed |

*During Claims phase with emergency mode, only senior tokens can withdraw

## Standard Withdrawal Process

### Step 1: Check Your Balances

```javascript
// Get your risk token balances
const [seniorBalance, juniorBalance] = await riskVault.getUserTokenBalances(
    userAddress
);

console.log(`Senior tokens: ${seniorBalance}`);
console.log(`Junior tokens: ${juniorBalance}`);

// Calculate withdrawal value
const [aUSDCAmount, cUSDTAmount] = await riskVault.calculateWithdrawalAmounts(
    seniorBalance,
    juniorBalance
);

console.log(`Will receive ${aUSDCAmount} aUSDC and ${cUSDTAmount} cUSDT`);
```

### Step 2: Choose Withdrawal Method

#### Option A: Proportional Withdrawal (Default)

```javascript
// Withdraw with proportional asset distribution
const tx = await riskVault.withdraw(
    seniorAmount,           // Amount of senior tokens
    juniorAmount,           // Amount of junior tokens
    ethers.constants.AddressZero  // No asset preference
);

await tx.wait();
console.log("Proportional withdrawal complete!");
```

#### Option B: Single Asset Withdrawal

```javascript
// Withdraw preferring a specific asset
const tx = await riskVault.withdraw(
    seniorAmount,
    juniorAmount,
    AUSDC_ADDRESS   // Prefer to receive aUSDC
);

await tx.wait();
console.log("Single asset withdrawal complete!");
```

### Step 3: Verify Receipt

```javascript
// Check the withdrawal event
const receipt = await tx.wait();
const withdrawEvent = receipt.events.find(
    e => e.event === 'TokensWithdrawn'
);

console.log({
    withdrawer: withdrawEvent.args.withdrawer,
    seniorBurned: withdrawEvent.args.seniorAmount,
    juniorBurned: withdrawEvent.args.juniorAmount,
    aUSDCReceived: withdrawEvent.args.aUSDCAmount,
    cUSDTReceived: withdrawEvent.args.cUSDTAmount
});
```

## Withdrawal Calculations

### Understanding Proportional Distribution

The protocol calculates your share based on total tokens:

```solidity
// Your share calculation
userShare = (yourTokens * totalVaultValue) / totalTokensIssued

// Asset distribution
aUSDCAmount = (userShare * aUSDCBalance) / totalVaultValue
cUSDTAmount = (userShare * cUSDTBalance) / totalVaultValue
```

### Example Calculations

```javascript
// Example: Vault has 60% aUSDC, 40% cUSDT
// You withdraw 1000 tokens total

const totalTokens = 1000;
const vaultValue = 1000000; // $1M total
const yourShare = (totalTokens * vaultValue) / totalTokensIssued;

// You receive:
// - 60% in aUSDC = 600 worth
// - 40% in cUSDT = 400 worth
```

## Emergency Withdrawals

### When Emergency Mode is Active

During emergency mode, special rules apply:

```javascript
// Check emergency status
const status = await riskVault.getProtocolStatus();
if (status.emergency) {
    console.log("Emergency mode active - senior priority enabled");
}
```

### Emergency Withdrawal Process

```javascript
// Only for senior token holders
async function emergencyWithdraw() {
    // 1. Verify you have senior tokens
    const [senior, junior] = await riskVault.getUserTokenBalances(userAddress);
    if (senior.eq(0)) {
        throw new Error("No senior tokens to withdraw");
    }
    
    // 2. Choose preferred asset (the one that didn't lose value)
    const preferredAsset = AUSDC_ADDRESS; // or CUSDT_ADDRESS
    
    // 3. Execute emergency withdrawal
    const tx = await riskVault.emergencyWithdraw(
        senior,         // Amount of senior tokens
        preferredAsset  // Asset you want to receive
    );
    
    await tx.wait();
    console.log("Emergency withdrawal complete!");
}
```

### Emergency Mode Benefits

1. **Senior Priority**: Exclusive access during claims phase
2. **Asset Selection**: Choose which asset to receive
3. **Fast Exit**: Immediate processing
4. **Loss Protection**: Minimize exposure to compromised assets

## Withdrawal Strategies

### Strategy 1: Early Exit

**When**: During Coverage Phase
**Why**: Lock in profits or reduce risk

```javascript
async function earlyExit() {
    // Monitor token prices
    const currentValue = await calculateCurrentValue();
    const depositValue = await getDepositValue();
    const profit = currentValue.sub(depositValue);
    
    // Exit if 10% profit achieved
    if (profit.mul(100).div(depositValue).gte(10)) {
        // Must withdraw equal amounts during coverage
        const [senior, junior] = await getUserBalances();
        const minAmount = senior.lt(junior) ? senior : junior;
        
        await riskVault.withdraw(
            minAmount,
            minAmount,
            ethers.constants.AddressZero
        );
    }
}
```

### Strategy 2: Senior Priority Exit

**When**: Claims Phase
**Why**: Utilize senior token priority

```javascript
async function seniorPriorityExit() {
    // Wait for claims phase
    const phase = await riskVault.currentPhase();
    if (phase !== 2) return;
    
    // Withdraw all senior tokens first
    const [senior, junior] = await getUserBalances();
    
    await riskVault.withdraw(
        senior,
        0,      // No junior tokens
        ethers.constants.AddressZero
    );
    
    // Later, withdraw junior if value remains
    if (phase === 3) { // Final claims
        await riskVault.withdraw(
            0,
            junior,
            ethers.constants.AddressZero
        );
    }
}
```

### Strategy 3: Asset Optimization

**When**: Any allowed phase
**Why**: Maximize specific asset holdings

```javascript
async function optimizeAssetWithdrawal() {
    // Check which asset has better yield
    const aUSDCYield = await getAUSDCYield();
    const cUSDTYield = await getCUSDTYield();
    
    const preferredAsset = aUSDCYield.gt(cUSDTYield) 
        ? AUSDC_ADDRESS 
        : CUSDT_ADDRESS;
    
    // Withdraw preferring higher yield asset
    const [senior, junior] = await getUserBalances();
    
    await riskVault.withdraw(
        senior,
        junior,
        preferredAsset
    );
}
```

## Phase-Specific Examples

### Deposit/Coverage Phase Withdrawal

```javascript
// During these phases, must withdraw equal amounts
async function equalWithdrawal() {
    const [senior, junior] = await getUserBalances();
    
    // Determine maximum equal withdrawal
    const maxEqual = senior.lt(junior) ? senior : junior;
    
    if (maxEqual.eq(0)) {
        throw new Error("Cannot withdraw - need both token types");
    }
    
    // Withdraw equal amounts
    await riskVault.withdraw(
        maxEqual,
        maxEqual,
        ethers.constants.AddressZero
    );
    
    // Remaining tokens stay in vault
    console.log(`Withdrew ${maxEqual} of each token`);
    console.log(`Remaining: ${senior.sub(maxEqual)} senior, ${junior.sub(maxEqual)} junior`);
}
```

### Claims Phase Withdrawal

```javascript
// During claims phase, flexible options
async function claimsPhaseWithdrawal() {
    const status = await riskVault.getProtocolStatus();
    const [senior, junior] = await getUserBalances();
    
    if (status.emergency) {
        // Emergency mode - use senior priority
        if (senior.gt(0)) {
            await riskVault.emergencyWithdraw(
                senior,
                AUSDC_ADDRESS // Choose safe asset
            );
        }
    } else {
        // Normal claims - any combination allowed
        await riskVault.withdraw(
            senior,
            junior,
            ethers.constants.AddressZero
        );
    }
}
```

### Final Claims Withdrawal

```javascript
// Last chance to withdraw everything
async function finalWithdrawal() {
    const [senior, junior] = await getUserBalances();
    
    // Withdraw all remaining tokens
    if (senior.gt(0) || junior.gt(0)) {
        await riskVault.withdraw(
            senior,
            junior,
            ethers.constants.AddressZero
        );
        
        console.log("Final withdrawal complete!");
    }
}
```

## Common Issues & Solutions

### Issue 1: "NoTokensToWithdraw" Error

```javascript
// Solution: Ensure you have tokens
const [senior, junior] = await getUserBalances();
if (senior.eq(0) && junior.eq(0)) {
    console.log("No tokens to withdraw");
    return;
}
```

### Issue 2: "EqualAmountsRequired" Error

```javascript
// Solution: During deposit/coverage, use equal amounts
const minAmount = senior.lt(junior) ? senior : junior;
await riskVault.withdraw(minAmount, minAmount, addressZero);
```

### Issue 3: "EmergencyModeActive" Error

```javascript
// Solution: Use emergency withdraw for senior tokens
if (await isEmergencyMode()) {
    await riskVault.emergencyWithdraw(seniorAmount, preferredAsset);
} else {
    await riskVault.withdraw(seniorAmount, juniorAmount, addressZero);
}
```

### Issue 4: "InsufficientTokenBalance" Error

```javascript
// Solution: Check actual balance before withdrawing
const [actualSenior, actualJunior] = await getUserBalances();
const safeSenior = requestedSenior.gt(actualSenior) ? actualSenior : requestedSenior;
const safeJunior = requestedJunior.gt(actualJunior) ? actualJunior : requestedJunior;
```

## Gas Optimization

### Batch Operations

```javascript
// If managing multiple accounts, batch reads
async function batchCheckBalances(addresses) {
    const multicall = new ethers.Contract(MULTICALL_ADDRESS, MulticallABI, provider);
    
    const calls = addresses.flatMap(addr => [
        {
            target: RISK_VAULT_ADDRESS,
            callData: riskVault.interface.encodeFunctionData(
                'getUserTokenBalances',
                [addr]
            )
        }
    ]);
    
    const results = await multicall.aggregate(calls);
    return results.map(r => 
        riskVault.interface.decodeFunctionResult('getUserTokenBalances', r)
    );
}
```

### Optimal Timing

```javascript
// Withdraw during low gas periods
async function gasOptimizedWithdraw() {
    const gasPrice = await provider.getGasPrice();
    const threshold = ethers.utils.parseUnits("30", "gwei");
    
    if (gasPrice.gt(threshold)) {
        console.log("Gas too high, waiting...");
        return;
    }
    
    // Proceed with withdrawal
    await executeWithdrawal();
}
```

## Post-Withdrawal Actions

### 1. Unwrap Yield Tokens

```javascript
// Convert aUSDC back to USDC if desired
async function unwrapYieldTokens() {
    const aUSDCBalance = await aUSDC.balanceOf(userAddress);
    
    if (aUSDCBalance.gt(0)) {
        // Withdraw from Aave
        await aavePool.withdraw(
            USDC_ADDRESS,
            aUSDCBalance,
            userAddress
        );
    }
}
```

### 2. Reinvest in Next Cycle

```javascript
// Set up for next cycle
async function prepareNextCycle() {
    // Monitor for new deposit phase
    riskVault.on('PhaseTransitioned', async (from, to) => {
        if (to === 0) { // New deposit phase
            // Re-deposit withdrawn assets
            await depositForNextCycle();
        }
    });
}
```

### 3. Track Performance

```javascript
// Calculate overall returns
function calculateReturns(deposits, withdrawals) {
    const totalDeposited = deposits.reduce((sum, d) => sum.add(d.amount), Zero);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum.add(w.amount), Zero);
    
    const profit = totalWithdrawn.sub(totalDeposited);
    const returnRate = profit.mul(10000).div(totalDeposited);
    
    return {
        profit,
        returnRate: returnRate.toNumber() / 100 // Percentage
    };
}
```

---

Continue to [Emergency Mode](emergency-mode.md) to understand the protocol's safety mechanisms and how they protect your funds.