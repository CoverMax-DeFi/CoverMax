# Risk Tokenization

## Overview

Risk tokenization is the core innovation of CoverMax Protocol, transforming insurance positions into liquid, tradeable assets. This mechanism enables dynamic risk management and efficient capital allocation in decentralized insurance.

## The Tokenization Process

### From Deposit to Token

<figure><img src="../.gitbook/assets/tokenization-flow.png" alt=""><figcaption><p>Risk Tokenization Process</p></figcaption></figure>

```
1. User deposits 1000 aUSDC
   ↓
2. Protocol mints 500 CM-SENIOR + 500 CM-JUNIOR
   ↓
3. Tokens are immediately tradeable on Uniswap
   ↓
4. Token holders can redeem for underlying assets
```

### Token Properties

#### ERC20 Compliance
Both risk tokens are standard ERC20 tokens with:
* 18 decimal precision
* Transfer functionality
* Approval mechanisms
* Balance tracking

#### Minting Rights
```solidity
// Only the RiskVault can mint tokens
function mint(address recipient, uint256 amount) external onlyOwner {
    _mint(recipient, amount);
}
```

#### Burning Mechanism
```solidity
// Only the RiskVault can burn tokens
function burn(address holder, uint256 amount) external onlyOwner {
    _burn(holder, amount);
}
```

## Economic Model

### Value Backing

Risk tokens derive value from:

1. **Underlying Assets**: Yield-bearing tokens in the vault
2. **Yield Accrual**: Continuous interest generation
3. **Time Value**: Remaining coverage period
4. **Risk Assessment**: Market's view on claims

### Price Discovery

Token prices on Uniswap reflect:

```
Token Price = (Underlying Value + Expected Yield - Expected Claims) / Token Supply
```

### Market Dynamics

| Market Condition | Senior Token Price | Junior Token Price |
|-----------------|-------------------|-------------------|
| Low Risk Period | Near par value | Near par value |
| Elevated Risk | Slight discount | Larger discount |
| Post-Claim Event | Minimal impact | Significant impact |
| High Yield Period | Premium to par | Premium to par |

## Risk Transfer Mechanism

### How Trading Transfers Risk

When you trade risk tokens, you're transferring:

1. **Claim Exposure**: Potential losses from insurance events
2. **Yield Rights**: Future interest accrual
3. **Redemption Rights**: Claims on vault assets

### Example Scenarios

#### Scenario 1: Risk Reduction
```
Alice holds 500 Senior + 500 Junior tokens
She's concerned about potential claims
Action: Sells 300 Junior tokens on Uniswap
Result: Reduced exposure to subordinate losses
```

#### Scenario 2: Risk Concentration
```
Bob believes claims are unlikely
He buys 1000 Junior tokens at discount
If no claims: Higher returns due to discount
If claims occur: Larger losses as junior holder
```

## Token Lifecycle

### 1. Creation Phase
- Tokens minted during deposit phase
- 1:1 backing with deposited assets
- Equal Senior/Junior distribution

### 2. Trading Phase
- Active throughout all protocol phases
- Price discovery via Uniswap pools
- Continuous liquidity availability

### 3. Redemption Phase
- Burn tokens to receive underlying assets
- Senior tokens redeem first (priority)
- Proportional distribution of remaining assets

## Advanced Tokenomics

### Supply Dynamics

```solidity
// Total supply equation
Total CM-SENIOR Supply = Total CM-JUNIOR Supply = Total Deposits / 2
```

### Redemption Value Calculation

```solidity
function calculateRedemptionValue(uint256 tokens) view returns (uint256) {
    uint256 totalValue = aUSDCBalance + cUSDTBalance;
    return (tokens * totalValue) / totalTokensIssued;
}
```

### Token Ratios

| Ratio | Meaning | Implications |
|-------|---------|--------------|
| 1:1 Senior/Junior | Balanced risk | Normal market conditions |
| 2:1 Senior/Junior | Risk averse market | Premium for senior tokens |
| 1:2 Senior/Junior | Risk seeking market | Discount on junior tokens |

## Benefits of Tokenization

### For Insurance Providers

1. **Liquidity**: Exit positions anytime via trading
2. **Risk Management**: Adjust exposure dynamically
3. **Price Transparency**: Real-time valuation
4. **Capital Efficiency**: No locked periods

### For the Market

1. **Price Discovery**: Efficient risk pricing
2. **Risk Distribution**: Broader participant base
3. **Market Depth**: Continuous trading volume
4. **Innovation**: New financial products possible

## Technical Implementation

### Token Contract Structure

```solidity
contract RiskToken is ERC20, Ownable {
    // Standardized decimals for cleaner math
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    // Vault-controlled minting
    function mint(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }
    
    // Vault-controlled burning
    function burn(address holder, uint256 amount) external onlyOwner {
        _burn(holder, amount);
    }
}
```

### Integration with Vault

```solidity
// In RiskVault.sol
function _issueTokens(address recipient, uint256 totalAmount) internal {
    uint256 eachTokenAmount = totalAmount / 2;
    IRiskToken(seniorToken).mint(recipient, eachTokenAmount);
    IRiskToken(juniorToken).mint(recipient, eachTokenAmount);
    totalTokensIssued += totalAmount;
}
```

## Future Developments

### Planned Enhancements

1. **Variable Ratios**: Governance-set Senior/Junior splits
2. **Multiple Tiers**: Additional risk levels beyond dual-tier
3. **Synthetic Tokens**: Derivatives based on risk tokens
4. **Cross-Chain**: Bridge tokens to other networks

### Potential Products

1. **Risk Token Indices**: Baskets of different risk levels
2. **Structured Products**: Complex yield strategies
3. **Options Markets**: Calls/puts on risk tokens
4. **Lending Markets**: Borrow against risk tokens

---

Continue to [Dual-Tier System](dual-tier-system.md) to understand the Senior/Junior token mechanics in detail.