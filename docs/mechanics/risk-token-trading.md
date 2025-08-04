# Risk Token Trading

## Overview

Risk token trading is the heart of CoverMax Protocol's innovation. By making insurance positions tradeable on Uniswap, the protocol creates a liquid market for risk transfer and price discovery.

## Trading Fundamentals

### What Makes Risk Tokens Tradeable

1. **ERC20 Standard**: Full compatibility with DEXs
2. **Instant Liquidity**: Trade anytime during cycle
3. **Price Discovery**: Market determines risk value
4. **Composability**: Use in other DeFi protocols

### Available Trading Pairs

| Pair | Purpose | Liquidity |
|------|---------|-----------|
| CM-SENIOR/USDC | Exit to stablecoin | High |
| CM-JUNIOR/USDC | Exit to stablecoin | High |
| CM-SENIOR/CM-JUNIOR | Risk tier arbitrage | Medium |
| CM-SENIOR/aUSDC | Asset-specific exit | Low |
| CM-JUNIOR/cUSDT | Asset-specific exit | Low |

## Understanding Token Pricing

### Price Factors

Risk token prices are influenced by:

1. **Underlying Asset Value**
   ```
   Base Value = (Vault Assets / Total Tokens)
   ```

2. **Time Remaining**
   ```
   Time Premium = Coverage Days × Daily Yield Rate
   ```

3. **Risk Perception**
   ```
   Risk Discount = Market Assessment of Claim Probability
   ```

4. **Supply/Demand**
   ```
   Market Premium = Trading Volume × Liquidity Depth
   ```

### Price Relationships

During normal conditions:
```
Senior Price ≈ Base Value + Safety Premium
Junior Price ≈ Base Value - Risk Discount
Senior + Junior ≈ 2 × Base Value
```

## Trading on Uniswap

### Basic Trading Flow

```javascript
// 1. Approve token for Uniswap Router
await cmSenior.approve(UNISWAP_ROUTER, amount);

// 2. Define trade parameters
const params = {
    tokenIn: CM_SENIOR_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 3000, // 0.3% fee tier
    recipient: userAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
    amountIn: amount,
    amountOutMinimum: calculateMinimumOut(amount, slippage),
    sqrtPriceLimitX96: 0
};

// 3. Execute swap
const tx = await uniswapRouter.exactInputSingle(params);
await tx.wait();
```

### Advanced Trading Examples

#### Example 1: Risk Reduction Trade

```javascript
// Scenario: User wants to reduce risk exposure
// Strategy: Sell junior tokens, keep senior tokens

async function reduceRiskExposure(juniorAmount, maxSlippage) {
    // Get quote for junior → USDC swap
    const quoter = new ethers.Contract(QUOTER_ADDRESS, QuoterABI, provider);
    const quote = await quoter.quoteExactInputSingle({
        tokenIn: CM_JUNIOR_ADDRESS,
        tokenOut: USDC_ADDRESS,
        amountIn: juniorAmount,
        fee: 3000,
        sqrtPriceLimitX96: 0
    });
    
    // Calculate minimum output with slippage
    const minOutput = quote.mul(100 - maxSlippage).div(100);
    
    // Execute swap
    await uniswapRouter.exactInputSingle({
        tokenIn: CM_JUNIOR_ADDRESS,
        tokenOut: USDC_ADDRESS,
        fee: 3000,
        recipient: userAddress,
        deadline: deadline,
        amountIn: juniorAmount,
        amountOutMinimum: minOutput,
        sqrtPriceLimitX96: 0
    });
}
```

#### Example 2: Tier Arbitrage

```javascript
// Scenario: Junior tokens trading at excessive discount
// Strategy: Swap senior → junior to capture discount

async function arbitrageTiers(seniorAmount) {
    // Check current ratio
    const seniorPrice = await getSeniorPrice();
    const juniorPrice = await getJuniorPrice();
    const ratio = seniorPrice.div(juniorPrice);
    
    // If ratio > 1.1 (10% spread), arbitrage opportunity
    if (ratio.gt(ethers.utils.parseEther("1.1"))) {
        // Swap senior for junior
        await uniswapRouter.exactInputSingle({
            tokenIn: CM_SENIOR_ADDRESS,
            tokenOut: CM_JUNIOR_ADDRESS,
            fee: 3000,
            recipient: userAddress,
            deadline: deadline,
            amountIn: seniorAmount,
            amountOutMinimum: seniorAmount.mul(ratio).mul(95).div(100), // 5% slippage
            sqrtPriceLimitX96: 0
        });
    }
}
```

## Trading Strategies

### Strategy 1: Phase-Based Trading

```javascript
// Trade based on protocol phases
async function phaseBasedStrategy() {
    const phase = await riskVault.currentPhase();
    
    switch(phase) {
        case 0: // DEPOSIT
            // Accumulate positions at initial prices
            await buyRiskTokens();
            break;
            
        case 1: // COVERAGE
            // Monitor risk events, adjust positions
            if (await detectElevatedRisk()) {
                await sellJuniorTokens();
            }
            break;
            
        case 2: // CLAIMS
            // Exit junior positions, hold senior
            await exitJuniorPositions();
            break;
            
        case 3: // FINAL_CLAIMS
            // Complete exit or prepare for next cycle
            await finalizePositions();
            break;
    }
}
```

### Strategy 2: Risk Event Trading

```javascript
// React to risk events in real-time
async function riskEventTrading() {
    // Monitor for specific events
    monitorProtocol.on('ExploitDetected', async (protocol) => {
        if (protocol === 'AAVE' || protocol === 'COMPOUND') {
            // Immediately sell risk tokens
            await emergencySell();
        }
    });
    
    // Set up price alerts
    if (juniorPrice < threshold) {
        // Buy opportunity - risk overpriced
        await buyJuniorTokens();
    }
}
```

### Strategy 3: Liquidity Provision

```javascript
// Provide liquidity and earn fees
async function provideLiquidity() {
    // 1. Calculate optimal amounts
    const optimalRatio = await calculateOptimalRatio();
    
    // 2. Approve both tokens
    await cmSenior.approve(POSITION_MANAGER, seniorAmount);
    await cmJunior.approve(POSITION_MANAGER, juniorAmount);
    
    // 3. Mint liquidity position
    const params = {
        token0: CM_SENIOR_ADDRESS,
        token1: CM_JUNIOR_ADDRESS,
        fee: 3000,
        tickLower: -887220,
        tickUpper: 887220,
        amount0Desired: seniorAmount,
        amount1Desired: juniorAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: userAddress,
        deadline: deadline
    };
    
    await positionManager.mint(params);
}
```

## Market Making

### Automated Market Making

```javascript
class RiskTokenMarketMaker {
    constructor(config) {
        this.spreadBasisPoints = config.spread; // e.g., 50 = 0.5%
        this.rebalanceThreshold = config.threshold; // e.g., 5%
        this.maxPositionSize = config.maxSize;
    }
    
    async maintainQuotes() {
        while (true) {
            // Get current prices
            const midPrice = await this.getMidPrice();
            
            // Calculate bid/ask
            const bidPrice = midPrice.mul(10000 - this.spreadBasisPoints).div(10000);
            const askPrice = midPrice.mul(10000 + this.spreadBasisPoints).div(10000);
            
            // Place limit orders
            await this.placeBidOrder(bidPrice);
            await this.placeAskOrder(askPrice);
            
            // Check inventory
            await this.rebalanceIfNeeded();
            
            // Wait before next update
            await sleep(30000); // 30 seconds
        }
    }
    
    async rebalanceIfNeeded() {
        const [senior, junior] = await this.getInventory();
        const ratio = senior.div(junior);
        
        if (ratio.gt(ethers.utils.parseEther("1.05"))) {
            // Too many senior tokens, sell some
            await this.sellSeniorTokens(this.getRebalanceAmount());
        } else if (ratio.lt(ethers.utils.parseEther("0.95"))) {
            // Too many junior tokens, sell some
            await this.sellJuniorTokens(this.getRebalanceAmount());
        }
    }
}
```

## Risk Management

### Position Sizing

```javascript
function calculatePositionSize(totalCapital, riskTolerance) {
    // Never risk more than X% on junior tokens
    const maxJuniorExposure = totalCapital.mul(riskTolerance).div(100);
    
    // Keep remainder in senior or stables
    const seniorAllocation = totalCapital.sub(maxJuniorExposure);
    
    return {
        junior: maxJuniorExposure,
        senior: seniorAllocation
    };
}
```

### Stop Loss Implementation

```javascript
async function implementStopLoss(token, triggerPrice, amount) {
    // Monitor price
    const checkPrice = async () => {
        const currentPrice = await getTokenPrice(token);
        
        if (currentPrice.lte(triggerPrice)) {
            // Execute stop loss
            await emergencySell(token, amount);
            return true;
        }
        return false;
    };
    
    // Check every minute
    while (!(await checkPrice())) {
        await sleep(60000);
    }
}
```

## Advanced Trading Tools

### Price Impact Calculator

```javascript
async function calculatePriceImpact(tokenIn, tokenOut, amountIn) {
    // Get current reserves
    const pool = await getUniswapPool(tokenIn, tokenOut);
    const [reserve0, reserve1] = await pool.getReserves();
    
    // Calculate price impact
    const impact = amountIn.mul(10000).div(
        tokenIn < tokenOut ? reserve0 : reserve1
    );
    
    return impact; // in basis points
}
```

### Arbitrage Scanner

```javascript
async function scanArbitrageOpportunities() {
    const opportunities = [];
    
    // Check senior/junior spread
    const seniorPrice = await getPriceInUSDC(CM_SENIOR_ADDRESS);
    const juniorPrice = await getPriceInUSDC(CM_JUNIOR_ADDRESS);
    const totalPrice = seniorPrice.add(juniorPrice);
    const fairValue = await calculateFairValue();
    
    if (totalPrice.lt(fairValue.mul(98).div(100))) {
        opportunities.push({
            type: 'BUY_BOTH',
            profit: fairValue.sub(totalPrice),
            action: 'Buy equal amounts of senior and junior'
        });
    }
    
    // Check individual token mispricings
    const ratio = seniorPrice.mul(1e18).div(juniorPrice);
    if (ratio.gt(ethers.utils.parseEther("1.2"))) {
        opportunities.push({
            type: 'TIER_ARB',
            profit: calculateArbProfit(ratio),
            action: 'Sell senior, buy junior'
        });
    }
    
    return opportunities;
}
```

## Trading Best Practices

### Do's

1. **Use Limit Orders**: Avoid market orders for large trades
2. **Check Liquidity**: Ensure sufficient depth before trading
3. **Monitor Gas**: Factor in transaction costs
4. **Set Deadlines**: Use reasonable transaction deadlines
5. **Track Slippage**: Monitor actual vs expected prices

### Don'ts

1. **Don't Overtrade**: Each trade incurs costs
2. **Don't Ignore Phase**: Some strategies work better in specific phases
3. **Don't Market Buy**: Large orders cause significant slippage
4. **Don't Forget Approvals**: Always approve tokens first
5. **Don't Trade Blindly**: Understand the risks

## Integration Examples

### Web3 Frontend Integration

```javascript
// React component for trading
function TradingInterface() {
    const [amount, setAmount] = useState('');
    const [slippage, setSlippage] = useState(0.5);
    
    const executeTrade = async () => {
        try {
            // Get signer
            const signer = await provider.getSigner();
            const router = new ethers.Contract(
                UNISWAP_ROUTER,
                RouterABI,
                signer
            );
            
            // Approve token
            const token = new ethers.Contract(
                CM_SENIOR_ADDRESS,
                ERC20_ABI,
                signer
            );
            await token.approve(UNISWAP_ROUTER, amount);
            
            // Execute swap
            await router.exactInputSingle({
                tokenIn: CM_SENIOR_ADDRESS,
                tokenOut: USDC_ADDRESS,
                fee: 3000,
                recipient: await signer.getAddress(),
                deadline: Math.floor(Date.now() / 1000) + 60 * 20,
                amountIn: amount,
                amountOutMinimum: calculateMinOut(amount, slippage),
                sqrtPriceLimitX96: 0
            });
            
            alert('Trade successful!');
        } catch (error) {
            alert(`Trade failed: ${error.message}`);
        }
    };
    
    return (
        <div>
            <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount to trade"
            />
            <button onClick={executeTrade}>Execute Trade</button>
        </div>
    );
}
```

---

Continue to [Withdrawals](withdrawals.md) to learn about redeeming your risk tokens for underlying assets.