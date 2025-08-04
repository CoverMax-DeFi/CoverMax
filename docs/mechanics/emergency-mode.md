# Emergency Mode

## Overview

Emergency Mode is CoverMax Protocol's critical safety mechanism designed to protect senior token holders during adverse events. When activated, it prioritizes senior token redemptions and allows selective asset withdrawal to minimize losses.

## What is Emergency Mode?

Emergency Mode is a protocol state that:

- **Restricts Operations**: Limits certain protocol functions
- **Prioritizes Seniors**: Gives exclusive withdrawal rights to senior token holders
- **Enables Asset Selection**: Allows choosing which asset to withdraw
- **Protects Value**: Minimizes exposure to compromised assets

## Activation Triggers

### Automatic Triggers (Future Implementation)

1. **Protocol Exploits**
   - Aave or Compound hack detection
   - Abnormal withdrawal patterns
   - Oracle manipulation

2. **Asset Failures**
   - Stablecoin depegging (>5%)
   - Yield source compromise
   - Liquidity crisis

3. **Market Conditions**
   - Extreme volatility
   - Systemic DeFi failures
   - Black swan events

### Manual Activation

Currently, only the protocol owner can activate emergency mode:

```javascript
// Owner function to toggle emergency mode
await riskVault.toggleEmergencyMode();
```

## How Emergency Mode Works

### State Changes

When emergency mode is activated:

```javascript
// Before activation
{
    emergencyMode: false,
    withdrawalRules: "Standard",
    seniorPriority: false,
    assetSelection: "Proportional"
}

// After activation
{
    emergencyMode: true,
    withdrawalRules: "Restricted",
    seniorPriority: true,
    assetSelection: "User choice"
}
```

### Operational Changes

| Feature | Normal Mode | Emergency Mode |
|---------|-------------|----------------|
| **Deposits** | Allowed in deposit phase | Blocked |
| **Standard Withdrawals** | Available | Blocked |
| **Emergency Withdrawals** | Not available | Senior only |
| **Trading** | Unrestricted | Continues normally |
| **Asset Selection** | Proportional/All | Specific choice |

## Emergency Withdrawal Process

### Step 1: Verify Emergency Status

```javascript
async function checkEmergencyStatus() {
    const status = await riskVault.getProtocolStatus();
    
    if (status.emergency) {
        console.log("⚠️ EMERGENCY MODE ACTIVE");
        console.log("Senior token holders can perform emergency withdrawals");
        
        // Get your senior token balance
        const [senior, junior] = await riskVault.getUserTokenBalances(userAddress);
        console.log(`Your senior tokens: ${senior}`);
        
        return true;
    }
    
    return false;
}
```

### Step 2: Assess Asset Safety

```javascript
async function assessAssetSafety() {
    // Check both assets for issues
    const aUSDCStatus = await checkAssetHealth(AUSDC_ADDRESS);
    const cUSDTStatus = await checkAssetHealth(CUSDT_ADDRESS);
    
    // Determine which asset is safer
    if (aUSDCStatus.compromised && !cUSDTStatus.compromised) {
        return {
            safeAsset: CUSDT_ADDRESS,
            reason: "aUSDC protocol exploited"
        };
    } else if (!aUSDCStatus.compromised && cUSDTStatus.compromised) {
        return {
            safeAsset: AUSDC_ADDRESS,
            reason: "cUSDT protocol exploited"
        };
    }
    
    // If both safe or both compromised, choose higher value
    return {
        safeAsset: aUSDCStatus.value.gt(cUSDTStatus.value) ? AUSDC_ADDRESS : CUSDT_ADDRESS,
        reason: "Choosing higher value asset"
    };
}
```

### Step 3: Execute Emergency Withdrawal

```javascript
async function executeEmergencyWithdrawal() {
    try {
        // 1. Get senior token balance
        const [seniorBalance, _] = await riskVault.getUserTokenBalances(userAddress);
        
        if (seniorBalance.eq(0)) {
            throw new Error("No senior tokens to withdraw");
        }
        
        // 2. Determine safe asset
        const { safeAsset, reason } = await assessAssetSafety();
        console.log(`Withdrawing to ${safeAsset}: ${reason}`);
        
        // 3. Execute emergency withdrawal
        const tx = await riskVault.emergencyWithdraw(
            seniorBalance,  // All senior tokens
            safeAsset       // Preferred asset
        );
        
        const receipt = await tx.wait();
        
        // 4. Verify withdrawal
        const event = receipt.events.find(e => e.event === 'EmergencyWithdrawal');
        console.log(`Withdrawn ${event.args.amount} of ${safeAsset}`);
        
        return event.args.amount;
        
    } catch (error) {
        console.error("Emergency withdrawal failed:", error);
        throw error;
    }
}
```

## Senior Token Advantages

### During Emergency Mode

1. **Exclusive Access**
   - Only senior tokens can withdraw
   - Junior tokens must wait
   - First claim on remaining assets

2. **Asset Selection**
   - Choose which asset to receive
   - Avoid compromised assets
   - Maximize recovery value

3. **Priority Timing**
   - Immediate withdrawal
   - No waiting period
   - Beat potential rush

### Value Preservation Example

```javascript
// Scenario: Aave exploited, aUSDC loses 30% value
// Vault composition: 50% aUSDC, 50% cUSDT

// Without emergency mode (proportional):
// Receive: 35% in aUSDC (compromised) + 50% in cUSDT = 85% value

// With emergency mode (choose cUSDT):
// Receive: 100% in cUSDT = 100% value (if sufficient balance)

const normalWithdrawal = calculateProportionalValue(); // 85%
const emergencyWithdrawal = calculateSelectedAssetValue(); // 100%
const savedValue = emergencyWithdrawal - normalWithdrawal; // 15% saved
```

## Junior Token Implications

### During Emergency

Junior token holders:
- Cannot use emergency withdraw
- Must wait for emergency to end
- Can still trade tokens on Uniswap
- May face larger losses

### Mitigation Strategies for Junior Holders

```javascript
// Strategy 1: Trade junior for senior before emergency
async function hedgeJuniorPosition() {
    const riskLevel = await assessProtocolRisk();
    
    if (riskLevel > RISK_THRESHOLD) {
        // Swap junior → senior on Uniswap
        await swapJuniorForSenior(juniorAmount);
    }
}

// Strategy 2: Exit via Uniswap during emergency
async function exitJuniorViaMarket() {
    if (await isEmergencyMode()) {
        // Sell junior tokens for stablecoins
        await swapJuniorForUSDC(juniorAmount);
    }
}
```

## Protocol Protection Mechanisms

### 1. Withdrawal Limits

```javascript
// Calculate maximum withdrawal per user
function calculateEmergencyLimit(userSeniorTokens, totalSeniorTokens) {
    const vaultBalance = getVaultBalance(preferredAsset);
    const maxWithdrawal = vaultBalance.mul(userSeniorTokens).div(totalSeniorTokens);
    
    return maxWithdrawal;
}
```

### 2. Anti-Gaming Measures

```javascript
// Prevent emergency mode gaming
function validateEmergencyWithdrawal(user, amount) {
    // Check if user held tokens before emergency
    const holdingPeriod = getTokenHoldingPeriod(user);
    require(holdingPeriod > MINIMUM_HOLDING_PERIOD, "Recent acquisition");
    
    // Verify reasonable amount
    require(amount <= getUserMaxWithdrawal(user), "Exceeds limit");
}
```

## Monitoring Emergency Mode

### Real-Time Monitoring

```javascript
// Set up emergency mode monitoring
function monitorEmergencyMode() {
    // Listen for emergency mode changes
    riskVault.on('EmergencyModeToggled', async (emergencyMode) => {
        if (emergencyMode) {
            console.log("🚨 EMERGENCY MODE ACTIVATED!");
            
            // Immediate actions
            await notifyUser();
            await assessPosition();
            await prepareEmergencyWithdrawal();
        } else {
            console.log("✅ Emergency mode deactivated");
        }
    });
    
    // Periodic status checks
    setInterval(async () => {
        const status = await riskVault.getProtocolStatus();
        updateDashboard(status);
    }, 60000); // Every minute
}
```

### Emergency Preparedness

```javascript
// Prepare for potential emergencies
class EmergencyPreparedness {
    constructor(userAddress) {
        this.userAddress = userAddress;
        this.seniorThreshold = 0.7; // Hold 70% senior
    }
    
    async maintainSeniorRatio() {
        const [senior, junior] = await getUserBalances(this.userAddress);
        const total = senior.add(junior);
        const seniorRatio = senior.mul(100).div(total);
        
        if (seniorRatio.lt(70)) {
            // Rebalance to increase senior holdings
            const needed = total.mul(70).div(100).sub(senior);
            await swapJuniorForSenior(needed);
        }
    }
    
    async setupAlerts() {
        // Configure alerts for:
        // - Protocol exploits
        // - Large withdrawals
        // - Asset depegging
        // - Emergency activation
    }
}
```

## Historical Emergency Examples

### Example 1: Yield Source Exploit

```javascript
// Scenario: Compound exploited, cUSDT compromised
{
    trigger: "Compound hack detected",
    activation: "Block 15234567",
    duration: "6 hours",
    seniorRecovery: "98%",
    juniorRecovery: "72%",
    safeAsset: "aUSDC"
}
```

### Example 2: Stablecoin Depeg

```javascript
// Scenario: USDT depegs to $0.92
{
    trigger: "USDT below $0.95",
    activation: "Block 15345678",
    duration: "2 hours",
    seniorRecovery: "100%",
    juniorRecovery: "92%",
    safeAsset: "aUSDC"
}
```

## Best Practices

### For Senior Token Holders

1. **Stay Informed**: Monitor protocol health constantly
2. **Act Quickly**: Execute withdrawal immediately when emergency activated
3. **Choose Wisely**: Select the uncompromised asset
4. **Verify Success**: Confirm withdrawal completion

### For All Users

1. **Understand Risks**: Know what triggers emergency mode
2. **Plan Ahead**: Have withdrawal strategy ready
3. **Maintain Balance**: Consider holding some senior tokens
4. **Monitor Markets**: Watch for early warning signs

## Emergency Mode FAQ

### Q: How long does emergency mode last?

Emergency mode remains active until manually deactivated by the owner. Duration depends on:
- Severity of the issue
- Time to assess damage
- Safety verification

### Q: Can I deposit during emergency mode?

No, all deposits are blocked during emergency mode to prevent exploitation.

### Q: What happens to junior tokens?

Junior tokens cannot use emergency withdrawal but can:
- Wait for normal operations to resume
- Trade on secondary markets
- Withdraw during final claims phase

### Q: Is emergency mode automatic?

Currently manual (owner-activated), with automatic triggers planned for future versions.

---

Continue to [Lifecycle Management](lifecycle-management.md) to understand how protocol phases and emergency states interact throughout the 7-day cycle.