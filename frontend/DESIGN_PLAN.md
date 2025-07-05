# CoverVault Frontend Design Plan
*A trading platform for risk tokens*

## 🎯 Core Vision
**CoverVault should feel like Robinhood for risk tokens, not traditional insurance**

### Mental Model
- **User thinks**: "I'm trading risk positions like stocks"
- **Not**: "I'm buying insurance policies"
- **Language**: Trading terminology, not insurance jargon
- **Feel**: Clean, modern, confident - like a fintech trading app

---

## 📱 App Structure & Navigation

### Primary Navigation
```
┌─────────────────────────────────────────────────────────┐
│ 🏠 CoverVault                    [Try Demo] [Dashboard] │
└─────────────────────────────────────────────────────────┘
```

### Page Hierarchy
```
🏠 Homepage (/)
├─ 📊 Dashboard (/dashboard)
├─ 🧪 Demo (/demo) 
├─ 📈 Markets (/markets)
├─ 💼 Portfolio (/portfolio)
├─ 🔄 Trade (/trade)
└─ ⚙️ Admin (/admin)
```

---

## 📄 Page-by-Page Breakdown

### 🏠 **Homepage (/) - "Risk Token Exchange"**

**Purpose**: Convert visitors into users with clear value prop

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│                    HERO SECTION                         │
│                                                         │
│        "Turn Insurance Risk Into Tradeable Tokens"     │
│         Deposit → Get Tokens → Trade on Uniswap        │
│                                                         │
│     [Start Trading]           [Try Demo]               │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ TVL: $2.4M  │ │SENIOR: $0.98│ │JUNIOR: $1.05│      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  HOW IT WORKS                           │
│                                                         │
│   1. Deposit      →    2. Get Tokens    →    3. Trade   │
│   Put in USDC          Senior + Junior       On Uniswap │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   TOKEN TYPES                           │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │ 🛡️  SENIOR TOKENS   │  │ 🚀  JUNIOR TOKENS      │   │
│  │ "Safety First"      │  │ "High Upside"          │   │
│  │ Lower risk         │  │ Higher potential        │   │
│  │ First to withdraw  │  │ Last to withdraw        │   │
│  └─────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     CTA SECTION                         │
│               "Ready to Trade Risk?"                    │
│                 [Launch Platform]                       │
└─────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Clear value proposition in hero
- Live market stats (TVL, token prices)
- Simple 3-step explanation
- Token comparison cards
- Single CTA to dashboard

---

### 📊 **Dashboard (/) - "Trading Command Center"**

**Purpose**: Main hub for all trading activities

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Risk Trading Dashboard              Phase: Coverage  │
└─────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐
│PORTFOLIO    │ │SENIOR PRICE │ │JUNIOR PRICE │ │TODAY    │
│$10,247      │ │$0.98 📈+2.1%│ │$1.05 📉-0.5%│ │+$127    │
│+$127 (1.2%) │ │Vol: 50K     │ │Vol: 30K     │ │+1.2%    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────┘

┌─────────────────────────────────────────────────────────┐
│                 QUICK ACTIONS                           │
│                                                         │
│ [Buy Risk Tokens] [Sell Tokens] [Rebalance Portfolio]  │
│ [Deposit Assets]  [Withdraw]    [Add Liquidity]        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────┐ ┌─────────────────────────────────┐
│  YOUR POSITIONS     │ │       MARKET OVERVIEW           │
│                     │ │                                 │
│ 🛡️ SENIOR: 500     │ │ ┌─ Price Chart (24h) ─────────┐ │
│ Value: $490         │ │ │    /\      SENIOR           │ │
│ P&L: +$12          │ │ │   /  \    /                 │ │
│                     │ │ │  /    \  /                  │ │
│ 🚀 JUNIOR: 300     │ │ │ /      \/     JUNIOR        │ │
│ Value: $315         │ │ │/              ___/          │ │
│ P&L: +$8           │ │ └─────────────────────────────┘ │
│                     │ │                                 │
│ 💧 LIQUIDITY: $200 │ │ Recent Trades:                  │
│ Fees earned: $5     │ │ • 100 SENIOR → JUNIOR          │
│                     │ │ • 50 JUNIOR → USDC             │
└─────────────────────┘ └─────────────────────────────────┘
```

**Key Features**:
- Portfolio overview at top
- Live token prices with charts
- Quick action buttons
- Detailed position breakdown
- Market activity feed

---

### 🔄 **Trade (/trade) - "Risk Token Exchange"**

**Purpose**: Dedicated trading interface

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Trade Risk Tokens                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────┐ ┌─────────────────────────────────┐
│   QUICK TRADE       │ │          ADVANCED TRADE         │
│                     │ │                                 │
│ I want to:          │ │ From: [USDC ▼] Amount: [____]   │
│ ○ Get more safety   │ │                                 │
│ ● Increase upside   │ │ To:   [JUNIOR ▼]               │
│ ○ Exit position     │ │                                 │
│                     │ │ You'll receive: ~95 JUNIOR      │
│ Amount: $1,000      │ │ Exchange rate: 1 USDC = 0.95 J  │
│                     │ │ Protocol fee: 0.3%              │
│ You'll get:         │ │ Uniswap fee: 0.3%              │
│ ~950 JUNIOR tokens  │ │                                 │
│                     │ │ [Preview Trade] [Execute]       │
│ [Execute Trade]     │ │                                 │
└─────────────────────┘ └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  TRADING PAIRS                          │
│                                                         │
│ SENIOR/USDC    $0.98  📈+2.1%   [Trade]               │
│ JUNIOR/USDC    $1.05  📉-0.5%   [Trade]               │
│ SENIOR/JUNIOR  0.93   📊+0.8%   [Trade]               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  ORDER HISTORY                          │
│ ┌─ Time ─┐ ┌─ Pair ──────┐ ┌─ Amount ─┐ ┌─ Status ─┐   │
│ │ 14:32  │ │ USDC→JUNIOR │ │ 500      │ │ Complete │   │
│ │ 12:15  │ │ SENIOR→USDC │ │ 200      │ │ Complete │   │
│ │ 09:45  │ │ USDC→SENIOR │ │ 1,000    │ │ Complete │   │
│ └────────┘ └─────────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Quick trade for common actions
- Advanced trade for custom swaps
- Real-time pricing and fees
- Trading pair market overview
- Order history

---

### 💼 **Portfolio (/portfolio) - "Risk Portfolio Manager"**

**Purpose**: Detailed view of holdings and performance

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ 💼 Your Risk Portfolio                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   PORTFOLIO SUMMARY                     │
│                                                         │
│ Total Value: $10,247        Today: +$127 (+1.2%)       │
│ Cost Basis: $10,000         All Time: +$247 (+2.4%)    │
│                                                         │
│ ┌─ Risk Allocation ──────────────────────────────────┐  │
│ │     🛡️ 48% SENIOR          🚀 52% JUNIOR         │  │
│ │     Low Risk               High Risk              │  │
│ │     $4,919                 $5,328                 │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    DETAILED HOLDINGS                    │
│                                                         │
│ ┌─ Asset ────┐ ┌─ Amount ─┐ ┌─ Value ──┐ ┌─ P&L ─────┐ │
│ │ CV-SENIOR  │ │ 500      │ │ $4,919   │ │ +$119     │ │
│ │ CV-JUNIOR  │ │ 300      │ │ $5,328   │ │ +$128     │ │
│ │ LP Tokens  │ │ 50       │ │ $200     │ │ +$15      │ │
│ └────────────┘ └──────────┘ └──────────┘ └───────────┘ │
│                                                         │
│ [Rebalance Portfolio] [Withdraw All] [Add More]        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  PERFORMANCE CHART                      │
│                                                         │
│ Portfolio Value (30 Days)                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 11K │                                    ██          │ │
│ │     │                               ██████           │ │
│ │ 10K │                          ██████                │ │
│ │     │                     ██████                     │ │
│ │  9K │ ████████████████████                           │ │
│ │     └─────────────────────────────────────────────── │ │
│ │     1   5    10   15   20   25   30 (days)           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [7D] [30D] [90D] [1Y] [All]                            │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Portfolio summary with P&L
- Risk allocation visualization
- Detailed holdings table
- Performance charts over time
- Portfolio management actions

---

### 📈 **Markets (/markets) - "Risk Token Exchange"**

**Purpose**: Market overview and token analysis

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ 📈 Risk Token Markets                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   MARKET OVERVIEW                       │
│                                                         │
│ Total Market Cap: $2,437,000     24h Volume: $145,000  │
│ Active Traders: 234               Protocol TVL: $2.4M   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     TOKEN PRICES                        │
│                                                         │
│ ┌─ Token ──────┐ ┌─ Price ──┐ ┌─ 24h ────┐ ┌─ Volume ─┐ │
│ │ 🛡️ CV-SENIOR │ │ $0.98    │ │ +2.1%    │ │ $50,230  │ │
│ │ 🚀 CV-JUNIOR │ │ $1.05    │ │ -0.5%    │ │ $30,140  │ │
│ │ 💧 LP-TOKENS │ │ $1.00    │ │ +0.1%    │ │ $15,890  │ │
│ └──────────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                         │
│ [View Details] for each token →                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  PROTOCOL PHASES                        │
│                                                         │
│ Current Phase: COVERAGE (Day 2 of 3)                   │
│ Time Remaining: 1d 14h 23m                             │
│                                                         │
│ ┌─ DEPOSIT ─┐ ┌─ COVERAGE ─┐ ┌─ CLAIMS ─┐ ┌─ FINAL ──┐  │
│ │ Complete  │ │ Active    │ │ Pending  │ │ Pending  │  │
│ │ 2 days    │ │ 3 days    │ │ 1 day    │ │ 1 day    │  │
│ └───────────┘ └───────────┘ └──────────┘ └──────────┘  │
│                                                         │
│ Next: Claims phase begins in 1d 14h 23m                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  RECENT ACTIVITY                        │
│                                                         │
│ 🔄 Alice swapped 100 SENIOR → JUNIOR (5 min ago)       │
│ 💰 Bob deposited 1,000 USDC (12 min ago)               │
│ 🔄 Carol swapped 50 JUNIOR → USDC (18 min ago)         │
│ 💧 Dave added liquidity: 500 USDC (25 min ago)         │
│ 🔄 Eve swapped 200 USDC → SENIOR (32 min ago)          │
│                                                         │
│ [View All Activity]                                     │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Market statistics and metrics
- Token price table with performance
- Protocol phase tracker
- Live activity feed
- Market sentiment indicators

---

### 🧪 **Demo (/demo) - "Risk Token Simulator"**

**Purpose**: Safe environment to learn and experiment

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Demo Mode - Practice Trading Risk Tokens            │
│                                                         │
│ ⚠️  This is a simulation using fake money              │
│ 💰 Demo Balance: $10,000 USDC                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    TRY IT OUT                           │
│                                                         │
│ Step 1: Deposit demo USDC to get risk tokens           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Amount: [____] USDC   [Deposit] → Get SENIOR+JUNIOR │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Step 2: Trade between token types                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Trade: [SENIOR ▼] → [JUNIOR ▼]  Amount: [____]     │ │
│ │                                          [Trade]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Step 3: Test emergency scenarios                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Scenario: [50% Loss ▼]    [Simulate Emergency]     │ │
│ │ See how your portfolio performs in crisis           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   YOUR DEMO PORTFOLIO                   │
│                                                         │
│ 🛡️ SENIOR: 0 tokens      🚀 JUNIOR: 0 tokens          │
│ 💰 USDC: $10,000          📊 Total: $10,000            │
│                                                         │
│ [Reset Demo] [Ready for Real Trading? → Dashboard]     │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Fake money for safe learning
- Guided tutorial steps
- Emergency scenario simulator
- Easy transition to real trading
- Reset functionality

---

### ⚙️ **Admin (/admin) - "Protocol Control Panel"**

**Purpose**: Protocol management for admins

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Admin Dashboard                                      │
│                                                         │
│ ⚠️  Admin functions - Use with caution                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 PROTOCOL STATUS                         │
│                                                         │
│ Phase: COVERAGE (2/3 days)    Emergency: ❌ Inactive   │
│ TVL: $2.4M                    Active Users: 234        │
│ Senior Tokens: 1.2M           Junior Tokens: 1.2M      │
│                                                         │
│ [Force Phase Transition] [Toggle Emergency Mode]       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   ADMIN ACTIONS                         │
│                                                         │
│ Protocol Management:                                    │
│ • [Start New Cycle]                                     │
│ • [Update Parameters]                                   │
│                                                         │
│ Emergency Functions:                                    │
│ • [Activate Emergency Mode]                             │
│ • [Process Claims]                                      │
│ • [Distribute Assets]                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 **Design System**

### **Color Palette**
```
Primary Colors:
├─ SENIOR tokens: #3B82F6 (Blue - Safety, Trust)
├─ JUNIOR tokens: #F59E0B (Amber - Energy, Risk)
├─ Success: #10B981 (Green)
├─ Warning: #EF4444 (Red)
└─ Background: #0F172A (Dark Slate)

Accent Colors:
├─ Gradients: Blue → Purple
├─ Text: #F8FAFC (Light)
├─ Muted: #64748B (Gray)
└─ Borders: #334155 (Slate)
```

### **Typography**
```
Headlines: Inter Bold (Trading confidence)
Numbers: JetBrains Mono (Monospace for prices)
Body: Inter Regular (Clean readability)
```

### **Components**
- **Price Cards**: Clean cards with price, change, volume
- **Trading Buttons**: Large, clear CTAs with gradients
- **Charts**: Simple line charts with token colors
- **Portfolio Cards**: Clean grid layout with P&L colors

---

## 🎯 **Key Success Metrics**

### **User Experience Goals**
1. **Time to First Trade**: < 3 minutes from landing
2. **Clarity**: Users understand "risk tokens" immediately
3. **Confidence**: Trading feels safe and professional
4. **Engagement**: Users return to adjust positions

### **Business Metrics**
1. **TVL Growth**: Total value locked in protocol
2. **Trading Volume**: Daily token swap volume
3. **User Retention**: Weekly active traders
4. **Protocol Utilization**: % of tokens being actively traded

---

## 🚀 **Implementation Priority**

### **Phase 1: MVP** ✅
- [ ] Clean Homepage with clear value prop
- [ ] Basic Dashboard with portfolio view
- [ ] Simple trading interface
- [ ] Token price displays

### **Phase 2: Enhanced Trading**
- [ ] Advanced trading interface
- [ ] Portfolio analytics and charts
- [ ] Market overview page
- [ ] Demo mode

### **Phase 3: Polish**
- [ ] Enhanced visualizations
- [ ] Mobile optimization
- [ ] Advanced portfolio features
- [ ] Social trading features

---

This design transforms CoverVault from an insurance protocol into a **risk token trading platform** that feels familiar and exciting to DeFi users! 🎯