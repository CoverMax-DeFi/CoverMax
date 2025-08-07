import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Client, AccountBalanceQuery, AccountId } from '@hashgraph/sdk';
import {
  Shield,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Clock,
  Target,
  Brain,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Wallet,
  Eye
} from 'lucide-react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import { Phase, ContractName, getContractAddress } from '@/config/contracts';
import { ethers } from 'ethers';

interface PredictionMarketWidgetProps {
  protocolName: string;
  protocolLogo: string;
  timeframe: string;
  minBet: string;
  maxPayout: string;
  supportedAssets: ('aUSDC' | 'cUSDT')[];
  onOddsUpdate?: (odds: { hack: number; safe: number }, seniorPrice: string, juniorPrice: string) => void;
  aiRecommendation?: { betType: 'hack' | 'safe'; confidence: number } | null;
}


const PredictionMarketWidget: React.FC<PredictionMarketWidgetProps> = ({
  protocolName,
  protocolLogo,
  timeframe,
  minBet,
  maxPayout,
  supportedAssets,
  onOddsUpdate,
  aiRecommendation
}) => {
  const {
    isConnected,
    connectWallet,
    seniorTokenAddress,
    juniorTokenAddress,
    depositAsset,
    swapExactTokensForTokens,
    getAmountsOut,
    getTokenBalance,
    refreshData,
    balances,
    vaultInfo,
    getPairReserves,
    currentChain
  } = useWeb3();

  const [selectedBet, setSelectedBet] = useState<'hack' | 'safe' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [assetType, setAssetType] = useState<'aUSDC' | 'cUSDT'>(supportedAssets[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOdds, setCurrentOdds] = useState({ hack: 1.02, safe: 1.25 });
  const [pricesLoading, setPricesLoading] = useState(false);
  const [seniorPrice, setSeniorPrice] = useState('1.00');
  const [juniorPrice, setJuniorPrice] = useState('1.00');
  const lastOddsUpdate = useRef({ hack: 0, safe: 0, senior: '', junior: '' });

  // AI Analysis states
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    recommendation: 'hack' | 'safe';
    confidence: number;
    reasoning: string[];
    expectedValue: number;
    riskLevel: 'low' | 'medium' | 'high';
  } | null>(null);

  // Wallet holdings state (simplified - used internally during AI analysis)
  const [walletAnalysis, setWalletAnalysis] = useState<{
    totalValue: number;
    riskExposure: string;
    recommendation: string;
  } | null>(null);

  // Fetch token prices and pool reserves from Uniswap pair
  useEffect(() => {
    const fetchTokenPrices = async () => {
      if (!seniorTokenAddress || !juniorTokenAddress || !getAmountsOut || !currentChain) return;

      setPricesLoading(true);
      try {
        // Get pool reserves to calculate proper AMM pricing
        const pairAddress = getContractAddress(currentChain, ContractName.SENIOR_JUNIOR_PAIR);
        const reserves = await getPairReserves(pairAddress);
        const seniorReserve = parseFloat(ethers.formatEther(reserves.reserve0));
        const juniorReserve = parseFloat(ethers.formatEther(reserves.reserve1));

        // Calculate prices directly from Uniswap AMM reserves
        // In a Uniswap pair, price = other_reserve / this_reserve
        const seniorPriceInJunior = juniorReserve / seniorReserve;
        const juniorPriceInSenior = seniorReserve / juniorReserve;

        // For USD pricing, we need to establish a base.
        // Let's use getAmountsOut to get actual market prices
        try {
          // Get price of 1 SENIOR in terms of JUNIOR
          const seniorToJuniorPath = [seniorTokenAddress, juniorTokenAddress];
          const seniorPrice1Unit = await getAmountsOut('1', seniorToJuniorPath);

          // Get price of 1 JUNIOR in terms of SENIOR
          const juniorToSeniorPath = [juniorTokenAddress, seniorTokenAddress];
          const juniorPrice1Unit = await getAmountsOut('1', juniorToSeniorPath);

          setSeniorPrice(parseFloat(seniorPrice1Unit).toFixed(2));
          setJuniorPrice(parseFloat(juniorPrice1Unit).toFixed(2));
        } catch (error) {
          console.error('Error getting AMM prices:', error);
          // Fallback to reserve-based calculation
          setSeniorPrice(seniorPriceInJunior.toFixed(2));
          setJuniorPrice(juniorPriceInSenior.toFixed(2));
        }
      } catch (error) {
        console.error('Error fetching token prices:', error);
        // Keep default prices on error (equal weighting)
        setSeniorPrice('1.00');
        setJuniorPrice('1.00');
      } finally {
        setPricesLoading(false);
      }
    };

    fetchTokenPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchTokenPrices, 30000);
    return () => clearInterval(interval);
  }, [seniorTokenAddress, juniorTokenAddress, getAmountsOut, getPairReserves, currentChain]);

  // Update odds based on current market prices from the liquidity pool
  useEffect(() => {
    const seniorPriceNum = parseFloat(seniorPrice);
    const juniorPriceNum = parseFloat(juniorPrice);

    if (seniorPriceNum > 0 && juniorPriceNum > 0) {
      // In a prediction market, odds should reflect fair payout
      // If senior token costs $1.08, hack bet should pay 1/1.08 = 0.926x (less than 1x = losing bet)
      // If junior token costs $0.92, safe bet should pay 1/0.92 = 1.087x (more than 1x = winning bet)

      // The odds are simply the reciprocal of the token price
      const hackOdds = 1.0 / seniorPriceNum; // What you get back per $1 bet on hack
      const safeOdds = 1.0 / juniorPriceNum; // What you get back per $1 bet on safe

      const newOdds = {
        hack: hackOdds, // Allow odds below 1.0 (losing bets)
        safe: safeOdds  // Allow odds below 1.0 (losing bets)
      };
      setCurrentOdds(newOdds);

      // Notify parent component - only if values actually changed
      if (onOddsUpdate && (
        lastOddsUpdate.current.hack !== hackOdds ||
        lastOddsUpdate.current.safe !== safeOdds ||
        lastOddsUpdate.current.senior !== seniorPrice ||
        lastOddsUpdate.current.junior !== juniorPrice
      )) {
        onOddsUpdate(newOdds, seniorPrice, juniorPrice);
        lastOddsUpdate.current = { hack: hackOdds, safe: safeOdds, senior: seniorPrice, junior: juniorPrice };
      }
    } else {
      // Fallback to default odds if prices aren't loaded
      const defaultOdds = {
        hack: 1.02,
        safe: 1.25
      };
      setCurrentOdds(defaultOdds);

      // Only call if values changed
      if (onOddsUpdate && (
        lastOddsUpdate.current.hack !== defaultOdds.hack ||
        lastOddsUpdate.current.safe !== defaultOdds.safe ||
        lastOddsUpdate.current.senior !== seniorPrice ||
        lastOddsUpdate.current.junior !== juniorPrice
      )) {
        onOddsUpdate(defaultOdds, seniorPrice, juniorPrice);
        lastOddsUpdate.current = { hack: defaultOdds.hack, safe: defaultOdds.safe, senior: seniorPrice, junior: juniorPrice };
      }
    }
  }, [seniorPrice, juniorPrice]); // Remove onOddsUpdate from dependencies to prevent infinite loop

  const handleBetSelection = (bet: 'hack' | 'safe') => {
    setSelectedBet(bet);
  };

  // Apply AI recommendation if provided
  useEffect(() => {
    if (aiRecommendation) {
      setSelectedBet(aiRecommendation.betType);
    }
  }, [aiRecommendation]);

  // Initialize Groq AI model
  const initializeAI = () => {
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!groqApiKey) {
      console.warn('GROQ API key not found. Add VITE_GROQ_API_KEY to your .env file');
      return null;
    }

    return new ChatGroq({
      apiKey: groqApiKey,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      maxTokens: 1000
    });
  };

  // Analyze betting opportunity with AI (enhanced with wallet context)
  const analyzeWithAI = async () => {
    setIsAnalyzing(true);

    try {
      const model = initializeAI();
      if (!model) {
        // Fallback to mathematical analysis
        const fallbackAnalysis = generateMathAnalysis();
        setAiAnalysis(fallbackAnalysis);
        setShowAIAnalysis(true);
        return;
      }

      // Get comprehensive wallet analysis first
      const walletAnalysisResult = await analyzeWalletHoldings();

      // Calculate market implied probabilities
      const totalValue = parseFloat(seniorPrice) + parseFloat(juniorPrice);
      const hackProbability = (parseFloat(seniorPrice) / totalValue) * 100;
      const safeProbability = (parseFloat(juniorPrice) / totalValue) * 100;

      const systemPrompt = new SystemMessage(`You are an expert DeFi risk analyst specializing in CoverMax prediction markets.

CRITICAL UNDERSTANDING OF COVERMAX MECHANICS:
- SENIOR TOKENS = Already protected/insured positions (safe from hacks)
- JUNIOR TOKENS = Higher yield but at-risk positions (lose value if hack occurs)

BETTING LOGIC:
- HACK bet = Buying more senior tokens = Seeking more protection
- SAFE bet = Buying more junior tokens = Acting as underwriter for yield

STRATEGIC RECOMMENDATIONS:
- Users with MANY senior tokens are already well-protected → Consider SAFE bets to earn underwriting yield
- Users with MANY junior tokens are already at-risk → Consider HACK bets for protection/rebalancing  
- Conservative portfolios (stablecoins) → HACK bets for protection
- Risk-taking portfolios (meme coins) → SAFE bets to act as underwriters and earn yield
- Consider position concentration - don't over-concentrate in one token type

Respond in JSON format with these exact fields:
{
  "recommendation": "hack" or "safe",
  "confidence": number between 0-100,
  "reasoning": [array of 3-4 key reasons including wallet context],
  "riskLevel": "low", "medium", or "high",
  "expectedValue": number (positive means profitable)
}`);

      // Include comprehensive analysis
      const seniorBalance = Number(balances.seniorTokens) / 1e18;
      const juniorBalance = Number(balances.juniorTokens) / 1e18;
      const hasPosition = seniorBalance > 0 || juniorBalance > 0;

      const userPrompt = new HumanMessage(`Analyze this betting opportunity with full wallet context:

MARKET DATA:
- Protocol: ${protocolName}
- HACK bet odds: ${currentOdds.hack.toFixed(3)}x (${hackProbability.toFixed(1)}% implied probability)
- SAFE bet odds: ${currentOdds.safe.toFixed(3)}x (${safeProbability.toFixed(1)}% implied probability)

CURRENT COVERMAX POSITION:
${hasPosition ? `
- Senior tokens: ${seniorBalance.toFixed(2)} (${seniorBalance > juniorBalance ? 'OVERWEIGHT - Already well-protected' : 'underweight'})
- Junior tokens: ${juniorBalance.toFixed(2)} (${juniorBalance > seniorBalance ? 'OVERWEIGHT - High risk/yield position' : 'underweight'})

POSITION IMPLICATIONS:
- If overweight senior tokens → User already has protection → Consider SAFE bets for yield diversification
- If overweight junior tokens → User has high risk exposure → Consider HACK bets for protection/rebalancing
- Balanced position → Follow general risk profile recommendations
` : '- No current position in this protocol - Fresh start for optimal positioning'}

USER RISK PROFILE:
${walletAnalysisResult ? `
- Risk Level: ${walletAnalysisResult.riskProfile.level} (Score: ${walletAnalysisResult.riskProfile.score}/100)
- Portfolio Analysis: ${walletAnalysisResult.riskProfile.analysis}
- Meme Coin Allocation: ${walletAnalysisResult.riskProfile.memeAllocation}%
- Primary Holdings: ${walletAnalysisResult.riskProfile.primaryHoldings}
- DeFi Exposure: ${walletAnalysisResult.riskProfile.defiExposure}
` : 'Risk profile not available'}

STRATEGIC CONSIDERATIONS:
1. POSITION BALANCING:
   - Heavy senior token holders → Already protected → SAFE bets for yield diversification
   - Heavy junior token holders → High risk exposure → HACK bets for protection
   
2. RISK PROFILE ALIGNMENT:
   - High-risk users (meme coin holders) → SAFE bets to act as underwriters and earn yield
   - Conservative users (stablecoin heavy) → HACK bets for portfolio protection
   
3. AVOID OVER-CONCENTRATION:
   - Don't recommend more senior tokens if already overweight in senior
   - Don't recommend more junior tokens if already overweight in junior
   - Balance protection vs yield generation

Recommend the optimal bet considering: expected value, risk profile, AND existing position balance.`);

      const response = await model.invoke([systemPrompt, userPrompt]);

      // Parse AI response
      try {
        const content = response.content.toString();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setAiAnalysis(parsed);
          setShowAIAnalysis(true);

          // Auto-select the recommended bet
          setSelectedBet(parsed.recommendation);
        }
      } catch (parseError) {
        // Fallback analysis
        const fallbackAnalysis = generateMathAnalysis();
        setAiAnalysis(fallbackAnalysis);
        setShowAIAnalysis(true);
      }

    } catch (error) {
      console.error('AI analysis failed:', error);
      const fallbackAnalysis = generateMathAnalysis();
      setAiAnalysis(fallbackAnalysis);
      setShowAIAnalysis(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze user's wallet holdings with comprehensive risk profiling
  const analyzeWalletHoldings = async () => {
    try {
      // Get comprehensive wallet data (in production, this would query multiple chains)
      const walletData = await getComprehensiveWalletData();

      // Calculate current position values
      const seniorTokenValue = Number(balances.seniorTokens) / 1e18 * parseFloat(seniorPrice);
      const juniorTokenValue = Number(balances.juniorTokens) / 1e18 * parseFloat(juniorPrice);
      const totalPositionValue = seniorTokenValue + juniorTokenValue;

      // Calculate available liquidity
      const aUSDCBalance = Number(balances.aUSDC) / 1e18;
      const cUSDTBalance = Number(balances.cUSDT) / 1e18;
      const totalLiquidity = aUSDCBalance + cUSDTBalance;

      // Determine risk profile from wallet composition
      const riskProfile = assessRiskProfile(walletData);

      // AI-enhanced analysis with full wallet context
      const model = initializeAI();
      if (model) {
        try {
          const prompt = new HumanMessage(`Analyze this wallet for betting recommendations:

CURRENT POSITION:
- Senior tokens: ${(Number(balances.seniorTokens) / 1e18).toFixed(2)} ($${seniorTokenValue.toFixed(2)})
- Junior tokens: ${(Number(balances.juniorTokens) / 1e18).toFixed(2)} ($${juniorTokenValue.toFixed(2)})
- Available liquidity: $${totalLiquidity.toFixed(2)}

WALLET RISK PROFILE:
${riskProfile.analysis}

PORTFOLIO CHARACTERISTICS:
- Risk Level: ${riskProfile.level} (${riskProfile.score}/100)
- Primary Holdings: ${riskProfile.primaryHoldings}
- DeFi Exposure: ${riskProfile.defiExposure}
- Meme Coin Allocation: ${riskProfile.memeAllocation}%

BETTING CONTEXT:
- Protocol: ${protocolName}
- Current HACK odds: ${currentOdds.hack.toFixed(2)}x
- Current SAFE odds: ${currentOdds.safe.toFixed(2)}x

Based on this risk profile, should this user:
1. Bet HACK (seek protection) - suitable for conservative users
2. Bet SAFE (act as underwriter) - suitable for risk-takers who want yield
3. Stay neutral - if position is already optimal

Provide specific reasoning based on their wallet composition and risk tolerance.`);

          const response = await model.invoke([prompt]);
          const aiRecommendation = response.content.toString();

          setWalletAnalysis({
            totalValue: totalPositionValue + totalLiquidity + walletData.totalPortfolioValue,
            riskExposure: riskProfile.level,
            recommendation: aiRecommendation
          });

          return {
            totalValue: totalPositionValue + totalLiquidity + walletData.totalPortfolioValue,
            riskExposure: riskProfile.level,
            recommendation: aiRecommendation,
            riskProfile
          };

        } catch (error) {
          console.error('AI wallet analysis failed:', error);
        }
      }

      // Fallback analysis without AI
      const basicRiskAssessment = getBasicRiskAssessment(riskProfile);
      setWalletAnalysis({
        totalValue: totalPositionValue + totalLiquidity,
        riskExposure: riskProfile.level,
        recommendation: basicRiskAssessment
      });

      return {
        totalValue: totalPositionValue + totalLiquidity,
        riskExposure: riskProfile.level,
        recommendation: basicRiskAssessment,
        riskProfile
      };

    } catch (error) {
      console.error('Wallet analysis failed:', error);
      return null;
    }
  };

  // Get comprehensive wallet data (mock implementation - in production, query multiple chains)
  const getComprehensiveWalletData = async () => {
    // Mock wallet analysis - in production, this would use APIs like Moralis, Alchemy, etc.
    const mockWalletData = {
      totalPortfolioValue: 12000,
      assets: [
        { type: 'stablecoin', value: 3000, percentage: 25 },
        { type: 'bluechip', value: 6000, percentage: 50 }, // ETH, BTC
        { type: 'defi', value: 2000, percentage: 16.7 }, // UNI, AAVE, etc.
        { type: 'meme', value: 1000, percentage: 8.3 }, // DOGE, SHIB, PEPE
      ],
      defiProtocols: ['Aave', 'Uniswap', 'Compound'],
      nftCount: 5,
      transactionHistory: 150,
      avgTransactionSize: 500
    };

    return mockWalletData;
  };

  // Assess risk profile from wallet composition
  const assessRiskProfile = (walletData: any) => {
    const memeAllocation = walletData.assets.find((a: any) => a.type === 'meme')?.percentage || 0;
    const stableCoinAllocation = walletData.assets.find((a: any) => a.type === 'stablecoin')?.percentage || 0;
    const defiAllocation = walletData.assets.find((a: any) => a.type === 'defi')?.percentage || 0;

    let riskScore = 0;
    let level = 'Conservative';
    let analysis = '';

    // Calculate risk score (0-100)
    riskScore += memeAllocation * 2; // Meme coins = high risk
    riskScore += defiAllocation * 1.5; // DeFi = medium-high risk
    riskScore += Math.max(0, 50 - stableCoinAllocation); // Low stables = higher risk
    riskScore += (walletData.avgTransactionSize > 1000) ? 20 : 0; // Large txns = risk taker
    riskScore += (walletData.nftCount > 10) ? 15 : 0; // Many NFTs = speculative

    // Determine risk level
    if (riskScore >= 70) {
      level = 'High Risk / Degen';
      analysis = `Portfolio shows degen trader behavior with ${memeAllocation}% in meme coins. This user seeks high returns and likely comfortable with risk.`;
    } else if (riskScore >= 40) {
      level = 'Moderate Risk';
      analysis = `Balanced portfolio with some speculative positions. Shows calculated risk-taking behavior.`;
    } else {
      level = 'Conservative';
      analysis = `Conservative portfolio heavily weighted towards stablecoins (${stableCoinAllocation}%) and blue chips.`;
    }

    return {
      score: Math.min(riskScore, 100),
      level,
      analysis,
      memeAllocation,
      primaryHoldings: walletData.assets.reduce((max: any, asset: any) =>
        asset.percentage > max.percentage ? asset : max
      ).type,
      defiExposure: `${defiAllocation}% (${walletData.defiProtocols.length} protocols)`,
    };
  };

  // Basic risk assessment without AI
  const getBasicRiskAssessment = (riskProfile: any) => {
    if (riskProfile.level === 'High Risk / Degen') {
      return `High-risk profile detected. Consider SAFE bets to act as underwriter and earn yield from protocol fees. Your risk tolerance suggests you'd prefer earning returns rather than seeking protection.`;
    } else if (riskProfile.level === 'Conservative') {
      return `Conservative profile detected. Consider HACK bets for portfolio protection. Your stable portfolio suggests you value downside protection over speculative gains.`;
    } else {
      return `Moderate risk profile. Consider alternating between HACK and SAFE bets based on current market conditions and odds.`;
    }
  };

  // Generate mathematical analysis as fallback
  const generateMathAnalysis = () => {
    const seniorPriceNum = parseFloat(seniorPrice);
    const juniorPriceNum = parseFloat(juniorPrice);
    const totalValue = seniorPriceNum + juniorPriceNum;
    const hackProb = (seniorPriceNum / totalValue);
    const safeProb = (juniorPriceNum / totalValue);

    const hackEV = hackProb * currentOdds.hack - 1;
    const safeEV = safeProb * currentOdds.safe - 1;

    const recommendation = hackEV > safeEV ? 'hack' : 'safe';
    const confidence = Math.min(95, Math.abs(hackEV - safeEV) * 100 + 50);

    return {
      recommendation: recommendation as 'hack' | 'safe',
      confidence: Math.round(confidence),
      reasoning: [
        `${recommendation === 'hack' ? 'HACK' : 'SAFE'} bet has ${recommendation === 'hack' ? hackEV > 0 ? 'positive' : 'less negative' : safeEV > 0 ? 'positive' : 'less negative'} expected value`,
        `Market implies ${(recommendation === 'hack' ? hackProb : safeProb) * 100}% probability for this outcome`,
        `Potential return of ${recommendation === 'hack' ? currentOdds.hack.toFixed(2) : currentOdds.safe.toFixed(2)}x on investment`
      ],
      expectedValue: parseFloat((recommendation === 'hack' ? hackEV : safeEV).toFixed(3)),
      riskLevel: Math.abs(recommendation === 'hack' ? hackEV : safeEV) > 0.1 ? 'low' : 'medium' as 'low' | 'medium' | 'high'
    };
  };

  const calculatePayout = (amount: string, odds: number) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return '0.00';
    return (numAmount * odds).toFixed(2);
  };

  // Calculate cost per share and number of shares with slippage consideration
  const calculateShareInfo = (betAmount: string, betType: 'hack' | 'safe') => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return {
      costPerShare: '0.00',
      numShares: '0.00',
      totalPayout: '0.00',
      slippageWarning: false,
      effectiveCostPerShare: '0.00'
    };

    // Use real token prices from the liquidity pool
    const seniorPriceNum = parseFloat(seniorPrice);
    const juniorPriceNum = parseFloat(juniorPrice);

    let baseCostPerShare: number;
    if (betType === 'hack') {
      baseCostPerShare = seniorPriceNum > 0 ? seniorPriceNum : 0.98;
    } else {
      baseCostPerShare = juniorPriceNum > 0 ? juniorPriceNum : 0.80;
    }

    // Estimate slippage impact (simplified model)
    // Larger trades have more slippage
    const slippagePercent = Math.min(0.05, (amount / 10000) * 0.02); // Max 5% slippage
    const slippageMultiplier = 1 + slippagePercent;

    // Effective cost includes slippage
    const effectiveCostPerShare = baseCostPerShare * slippageMultiplier;

    // Also account for the 5% slippage tolerance used in actual swaps
    const swapSlippageTolerance = 0.05;
    const finalEffectiveCost = effectiveCostPerShare * (1 + swapSlippageTolerance);

    const numShares = amount / finalEffectiveCost;
    const totalPayout = numShares * 1.0;

    const hasSignificantSlippage = slippagePercent > 0.01; // 1% threshold

    return {
      costPerShare: baseCostPerShare.toFixed(3),
      effectiveCostPerShare: finalEffectiveCost.toFixed(3),
      numShares: numShares.toFixed(2),
      totalPayout: totalPayout.toFixed(2),
      slippageWarning: hasSignificantSlippage,
      slippagePercent: (slippagePercent * 100).toFixed(1)
    };
  };

  const getImpliedProbability = (betType: 'hack' | 'safe') => {
    // Calculate actual probabilities from real-time token pool prices
    const seniorPriceNum = parseFloat(seniorPrice);
    const juniorPriceNum = parseFloat(juniorPrice);
    const totalValue = seniorPriceNum + juniorPriceNum;

    if (betType === 'hack') {
      // Hack bet wins if senior tokens outperform (protocol gets hacked, senior gets paid first)
      // Market probability = senior token weight in pool
      const hackProbability = (seniorPriceNum / totalValue) * 100;
      return Math.round(hackProbability).toString();
    } else {
      // Safe bet wins if junior tokens outperform (protocol stays safe, junior gets higher yields)
      // Market probability = junior token weight in pool
      const safeProbability = (juniorPriceNum / totalValue) * 100;
      return Math.round(safeProbability).toString();
    }
  };

  const calculateConversionAmount = (depositAmount: string, conversionType: 'toSenior' | 'toJunior') => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return '0';

    const amount = parseFloat(depositAmount);

    // Use real-time pool prices
    const seniorPriceNum = parseFloat(seniorPrice);
    const juniorPriceNum = parseFloat(juniorPrice);

    // When depositing, user gets 50/50 split initially
    const halfAmount = amount / 2;

    if (conversionType === 'toSenior') {
      // For hack bet: Get senior tokens from half deposit, then swap junior->senior
      const seniorFromDeposit = halfAmount / seniorPriceNum;
      const juniorTokens = halfAmount / juniorPriceNum;
      const seniorFromSwap = (juniorTokens * juniorPriceNum) / seniorPriceNum;
      const totalSenior = seniorFromDeposit + seniorFromSwap;
      return totalSenior.toFixed(2);
    } else {
      // For safe bet: Get junior tokens from half deposit, then swap senior->junior
      const juniorFromDeposit = halfAmount / juniorPriceNum;
      const seniorTokens = halfAmount / seniorPriceNum;
      const juniorFromSwap = (seniorTokens * seniorPriceNum) / juniorPriceNum;
      const totalJunior = juniorFromDeposit + juniorFromSwap;
      return totalJunior.toFixed(2);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedBet || !betAmount || parseFloat(betAmount) <= 0 || !isConnected) return;

    setIsProcessing(true);

    try {
      // First, deposit to get tokens (50/50 split)
      await depositAsset(assetType, betAmount);

      if (selectedBet === 'hack') {
        // HACK bet = Protocol will get hacked = MAX SAFETY strategy
        // Swap all junior tokens to senior tokens
        const freshJuniorBalance = await getTokenBalance(juniorTokenAddress!);
        const juniorBalance = Number(freshJuniorBalance) / 1e18;

        if (juniorBalance > 0.001) {
          const path = [juniorTokenAddress!, seniorTokenAddress!];
          const balanceString = ethers.formatEther(freshJuniorBalance);

          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18); // 5% slippage tolerance
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      } else {
        // SAFE bet = Protocol won't get hacked = MAX UPSIDE strategy
        // Swap all senior tokens to junior tokens
        const freshSeniorBalance = await getTokenBalance(seniorTokenAddress!);
        const seniorBalance = Number(freshSeniorBalance) / 1e18;

        if (seniorBalance > 0.001) {
          const path = [seniorTokenAddress!, juniorTokenAddress!];
          const balanceString = ethers.formatEther(freshSeniorBalance);

          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18); // 5% slippage tolerance
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      }

      await refreshData(); // Refresh UI with new token balances
      setBetAmount('');
      setSelectedBet(null);

    } catch (error) {
      console.error('Bet failed:', error);
      alert('Bet failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getBetColorClass = (bet: 'hack' | 'safe') => {
    if (bet === 'hack') {
      return selectedBet === 'hack'
        ? 'border-red-500 bg-red-500/20'
        : 'border-slate-600 bg-slate-700/50 hover:border-red-400 hover:bg-red-500/10';
    } else {
      return selectedBet === 'safe'
        ? 'border-green-500 bg-green-500/20'
        : 'border-slate-600 bg-slate-700/50 hover:border-green-400 hover:bg-green-500/10';
    }
  };

  // Format token amounts for display
  const formatTokenAmount = (amount: bigint) => {
    return parseFloat(ethers.formatEther(amount)).toFixed(4);
  };

  if (!isConnected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm max-w-md mx-auto">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <span className="text-2xl">{protocolLogo}</span>
            <div>
              <div className="text-lg">{protocolName} Prediction Market</div>
              <div className="text-sm text-slate-400 font-normal">Connect wallet to start betting</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={connectWallet}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-white">
          <span className="text-2xl">{protocolLogo}</span>
          <div>
            <div className="text-lg">{protocolName} Prediction Market</div>
            <div className="text-sm text-slate-400 font-normal">Real betting with risk tokens</div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deposit Phase Check */}
        {Number(vaultInfo.currentPhase) !== Phase.DEPOSIT && (
          <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Betting is only allowed during the Deposit phase. Current phase: {vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}
            </AlertDescription>
          </Alert>
        )}

        {/* Question */}
        <div className="text-center">
          <h3 className="text-white font-semibold mb-2">
            Will {protocolName} get exploited?
          </h3>
          <p className="text-slate-400 text-sm">
            Real betting with risk tokens • Earn up to {currentOdds.safe.toFixed(2)}x returns
          </p>
        </div>

        {/* AI Analysis Button or Results */}
        {!showAIAnalysis ? (
          <Button
            onClick={analyzeWithAI}
            disabled={isAnalyzing}
            variant="outline"
            className="w-full bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/50 text-purple-300"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Portfolio & Market...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Get AI Recommendation
              </>
            )}
          </Button>
        ) : aiAnalysis && (
          <div className={`p-3 rounded-lg border ${
            aiAnalysis.recommendation === 'hack'
              ? 'bg-red-500/10 border-red-500/50'
              : 'bg-green-500/10 border-green-500/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  AI Recommends: {aiAnalysis.recommendation === 'hack' ? 'HACK' : 'SAFE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Confidence:</span>
                <span className="text-sm font-bold text-white">{aiAnalysis.confidence}%</span>
              </div>
            </div>

            {/* Expected Value */}
            <div className="bg-slate-900/50 rounded p-2 mb-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Expected Value:</span>
                <span className={`font-mono font-bold ${
                  aiAnalysis.expectedValue > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {aiAnalysis.expectedValue > 0 ? '+' : ''}{(aiAnalysis.expectedValue * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Key Reasoning Points */}
            <div className="space-y-1 mb-2">
              {aiAnalysis.reasoning.slice(0, 3).map((reason, index) => (
                <div key={index} className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-300">{reason}</span>
                </div>
              ))}
            </div>

            {/* Portfolio Context Badge */}
            {walletAnalysis && (
              <div className="bg-slate-800/50 rounded p-2 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-3 w-3 text-purple-400" />
                  <span className="text-xs font-semibold text-white">Portfolio Context</span>
                </div>
                <div className="text-xs text-slate-300">
                  Risk Profile: <span className={`font-medium ${
                    walletAnalysis.riskExposure.includes('High Risk') ? 'text-red-400' :
                    walletAnalysis.riskExposure.includes('Conservative') ? 'text-blue-400' :
                    'text-green-400'
                  }`}>{walletAnalysis.riskExposure}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Total Portfolio: ${walletAnalysis.totalValue.toFixed(0)}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAIAnalysis(false)}
              className="w-full text-xs text-slate-400 hover:text-slate-300"
            >
              New Analysis
            </Button>
          </div>
        )}

        {/* Asset Selection */}
        <div>
          <Label className="text-slate-300 mb-2 block">Select Asset</Label>
          <div className={`grid ${supportedAssets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            {supportedAssets.map((asset) => (
              <button
                key={asset}
                onClick={() => setAssetType(asset)}
                className={`p-3 rounded-lg border transition-all ${
                  assetType === asset
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{asset}</div>
                  <div className="text-xs opacity-80">
                    Balance: {formatTokenAmount(balances[asset])}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Betting Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* YES - Gets Hacked (Safety Strategy) */}
          <button
            onClick={() => handleBetSelection('hack')}
            className={`p-4 rounded-lg border-2 transition-all relative ${getBetColorClass('hack')}`}
            disabled={Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
          >
            {aiAnalysis?.recommendation === 'hack' && showAIAnalysis && (
              <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            )}
            <div className="text-center">
              <Shield className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-white font-bold">YES</div>
              <div className="text-xs text-slate-400 mb-1">Gets Hacked</div>
              <div className="text-red-400 font-bold">{currentOdds.hack.toFixed(2)}x</div>
              <div className="text-xs text-slate-500">
                {getImpliedProbability('hack')}% chance
              </div>
            </div>
          </button>

          {/* NO - Stays Safe (Upside Strategy) */}
          <button
            onClick={() => handleBetSelection('safe')}
            className={`p-4 rounded-lg border-2 transition-all relative ${getBetColorClass('safe')}`}
            disabled={Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
          >
            {aiAnalysis?.recommendation === 'safe' && showAIAnalysis && (
              <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            )}
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-white font-bold">NO</div>
              <div className="text-xs text-slate-400 mb-1">Stays Safe</div>
              <div className="text-green-400 font-bold">{currentOdds.safe.toFixed(2)}x</div>
              <div className="text-xs text-slate-500">
                {getImpliedProbability('safe')}% chance
              </div>
            </div>
          </button>
        </div>

        {/* Bet Amount Input */}
        <div className="space-y-2">
          <Label className="text-sm text-slate-300">Bet Amount ({assetType})</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min={minBet}
                max={maxPayout}
                className="pl-10 bg-slate-700 border-slate-600 text-white focus:border-blue-500"
                placeholder={`Min ${minBet}`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount('100')}
              className="text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              Max
            </Button>
          </div>
        </div>

        {/* Enhanced Cost/Payout Breakdown */}
        {selectedBet && betAmount && parseFloat(betAmount) > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              What You Pay, What You Get
            </div>

            {(() => {
              const shareInfo = calculateShareInfo(betAmount, selectedBet);
              return (
                <div className="space-y-2">
                  {/* Cost Breakdown */}
                  <div className="bg-slate-600/30 rounded p-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Cost per share:</span>
                      <span className="text-white font-mono">${shareInfo.costPerShare}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Number of shares:</span>
                      <span className="text-white font-mono">{shareInfo.numShares}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      ${betAmount} ÷ ${shareInfo.costPerShare} = {shareInfo.numShares} shares
                    </div>
                  </div>

                  {/* Payout Breakdown */}
                  <div className="bg-slate-600/30 rounded p-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">If you win:</span>
                      <span className="text-green-400 font-bold">${shareInfo.totalPayout}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Profit/Loss:</span>
                      {(() => {
                        const profit = parseFloat(shareInfo.totalPayout) - parseFloat(betAmount);
                        const isProfit = profit >= 0;
                        return (
                          <span className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}${profit.toFixed(2)}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {shareInfo.numShares} shares × $1.00 each = ${shareInfo.totalPayout}
                    </div>
                  </div>

                  {/* Risk Explanation */}
                  <div className={`text-xs rounded p-2 ${
                    parseFloat(shareInfo.costPerShare) > 1.0
                      ? 'text-red-300 bg-red-900/30'
                      : 'text-slate-400 bg-slate-800/50'
                  }`}>
                    <strong>How it works:</strong> Each share pays $1.00 if your prediction is correct, $0.00 if wrong.
                    You're buying {shareInfo.numShares} shares at ${shareInfo.costPerShare} each.
                    {parseFloat(shareInfo.costPerShare) > 1.0 && (
                      <div className="mt-1 font-semibold">
                        ⚠️ Warning: You're paying more than $1.00 per share that only pays $1.00 - this bet would lose money even if you win!
                      </div>
                    )}
                  </div>

                  {/* Strategy note */}
                  <div className="text-xs text-slate-500 border-t border-slate-600 pt-2">
                    Strategy: {selectedBet === 'hack' ? 'MAX SAFETY (Senior tokens)' : 'MAX UPSIDE (Junior tokens)'}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handlePlaceBet}
          className={`w-full py-3 font-bold ${
            selectedBet === 'hack'
              ? 'bg-red-600 hover:bg-red-700'
              : selectedBet === 'safe'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={!selectedBet || !betAmount || parseFloat(betAmount) <= 0 || isProcessing || Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : selectedBet ? (
            `Place ${selectedBet === 'hack' ? 'HACK' : 'SAFE'} Bet • $${betAmount}`
          ) : (
            'Select Your Prediction'
          )}
        </Button>

        {/* Portfolio Summary */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-white font-semibold">Your Portfolio</span>
          </div>

          {/* Basic Position Info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Senior Tokens:</span>
              <span className="text-blue-400">
                {formatTokenAmount(balances.seniorTokens)}
                {Number(balances.seniorTokens) > 0 && (
                  <span className="text-slate-500 ml-1">
                    (${(Number(balances.seniorTokens) / 1e18 * parseFloat(seniorPrice)).toFixed(2)})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Junior Tokens:</span>
              <span className="text-amber-400">
                {formatTokenAmount(balances.juniorTokens)}
                {Number(balances.juniorTokens) > 0 && (
                  <span className="text-slate-500 ml-1">
                    (${(Number(balances.juniorTokens) / 1e18 * parseFloat(juniorPrice)).toFixed(2)})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Available {assetType}:</span>
              <span className="text-green-400">{formatTokenAmount(balances[assetType])}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-2 text-center">
            AI analyzes your wallet + market conditions for optimal bets
          </div>
        </div>

        {/* Stats Footer */}
        <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Ends in {timeframe}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Fixed odds • Real positions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionMarketWidget;
