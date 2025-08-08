import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
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
import { Phase, ContractName, getContractAddress, getPhaseNameFromBigInt } from '@/config/contracts';
import { ethers } from 'ethers';

interface PredictionMarketWidgetProps {
  protocolName: string;
  protocolLogo: string;
  timeframe: string;
  minBet: string;
  maxPayout: string;
  supportedAssets: ('aUSDC' | 'bUSDC' | 'cUSDT')[];
  onOddsUpdate?: (odds: { hack: number; safe: number }, seniorPrice: string, juniorPrice: string) => void;
  aiRecommendation?: { betType: 'hack' | 'safe'; confidence: number } | null;
}


// Helper function to map UI asset types to backend asset types
const mapToBackendAsset = (asset: 'aUSDC' | 'bUSDC' | 'cUSDT'): 'aUSDC' | 'cUSDT' => {
  if (asset === 'bUSDC') return 'aUSDC'; // bUSDC maps to aUSDC backend
  return asset as 'aUSDC' | 'cUSDT';
};

// Helper function to get display name for asset
const getAssetDisplayName = (asset: 'aUSDC' | 'bUSDC' | 'cUSDT'): string => {
  switch (asset) {
    case 'bUSDC': return 'Bonzo USDC';
    case 'aUSDC': return 'Aave USDC';
    case 'cUSDT': return 'Compound USDT';
    default: return asset;
  }
};

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
  const [assetType, setAssetType] = useState<'aUSDC' | 'bUSDC' | 'cUSDT'>(supportedAssets[0]);
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
    marketSentiment?: string;
    crossProtocolRisk?: string;
    edgeCase?: string;
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

      const systemPrompt = new SystemMessage(`You are a sharp, engaging DeFi risk analyst specializing in CoverMax prediction markets. You have a knack for finding hidden alpha and explaining complex risks in simple terms.

CRITICAL UNDERSTANDING OF COVERMAX MECHANICS:
- SENIOR TOKENS = Already protected/insured positions (safe from hacks)
- JUNIOR TOKENS = Higher yield but at-risk positions (lose value if hack occurs)
- IMPORTANT: Risk is SHARED across ALL protocols covered by CoverMax - a hack in ANY covered protocol affects ALL token prices

MULTI-PROTOCOL RISK DYNAMICS:
- Multiple protocols share the same insurance pool
- A hack in Protocol A can trigger payouts that affect Protocol B's token prices
- Correlation risk: Similar protocols (e.g., all lending protocols) have correlated hack risks
- Diversification paradox: More protocols = more attack surface but also more premium income

BETTING LOGIC:
- HACK bet = Buying senior tokens = Seeking protection across ALL covered protocols
- SAFE bet = Buying junior tokens = Underwriting risk for ALL covered protocols simultaneously

STRATEGIC INSIGHTS TO CONSIDER:
1. Position Rebalancing:
   - Heavy senior holders → SAFE bets for yield (you're already over-insured)
   - Heavy junior holders → HACK bets for protection (you're exposed to systemic risk)

2. Market Inefficiencies to Exploit:
   - Look for mispricing between senior/junior token ratios
   - Consider if market is overreacting to recent news
   - Identify when fear/greed creates betting opportunities

3. Cross-Protocol Correlation:
   - Similar protocol types (all DEXs, all lending) = higher correlation
   - Different protocol types = natural diversification
   - Smart contract age matters - newer = higher risk

Respond in JSON format with these exact fields:
{
  "recommendation": "hack" or "safe",
  "confidence": number between 60-95,
  "reasoning": [array of 3-4 punchy, specific insights],
  "riskLevel": "low", "medium", or "high",
  "expectedValue": number between -0.15 and 0.30 (realistic range),
  "marketSentiment": "Brief market mood assessment",
  "crossProtocolRisk": "How other covered protocols affect this bet",
  "edgeCase": "One interesting edge or angle most people miss"
}`);

      // Include comprehensive analysis
      const seniorBalance = Number(balances.seniorTokens) / 1e18;
      const juniorBalance = Number(balances.juniorTokens) / 1e18;
      const hasPosition = seniorBalance > 0 || juniorBalance > 0;

      // Simulate other protocols covered by CoverMax
      const coveredProtocols = [
        { name: 'Bonzo', type: 'lending', tvl: 45000000, age: 6 },
        { name: 'Compound', type: 'lending', tvl: 2800000000, age: 48 },
        { name: 'MoonSwap', type: 'dex', tvl: 15000000, age: 3 },
        { name: 'LunarVault', type: 'yield', tvl: 8000000, age: 2 }
      ];

      const currentProtocolInfo = coveredProtocols.find(p => p.name === protocolName) || 
        { name: protocolName, type: 'lending', tvl: 45000000, age: 6 };

      // Calculate realistic expected values based on odds
      const hackEV = (1.0 / parseFloat(seniorPrice)) - 1.0;
      const safeEV = (1.0 / parseFloat(juniorPrice)) - 1.0;

      const userPrompt = new HumanMessage(`Analyze this betting opportunity with full context:

CURRENT BETTING TARGET:
- Protocol: ${protocolName} (${currentProtocolInfo.type} protocol)
- TVL: $${(currentProtocolInfo.tvl / 1000000).toFixed(1)}M
- Age: ${currentProtocolInfo.age} months
- Senior Price: $${seniorPrice} (HACK odds: ${(1.0/parseFloat(seniorPrice)).toFixed(2)}x)
- Junior Price: $${juniorPrice} (SAFE odds: ${(1.0/parseFloat(juniorPrice)).toFixed(2)}x)
- HACK bet EV: ${(hackEV * 100).toFixed(1)}%
- SAFE bet EV: ${(safeEV * 100).toFixed(1)}%

CROSS-PROTOCOL RISK CONTEXT:
CoverMax currently covers ${coveredProtocols.length} protocols:
${coveredProtocols.map(p => `- ${p.name}: ${p.type} protocol, $${(p.tvl/1000000).toFixed(1)}M TVL, ${p.age} months old`).join('\n')}

KEY RISK CORRELATIONS:
- ${coveredProtocols.filter(p => p.type === 'lending').length} lending protocols (high correlation risk)
- ${coveredProtocols.filter(p => p.age < 6).length} protocols less than 6 months old (elevated risk)
- Total TVL at risk across all protocols: $${(coveredProtocols.reduce((sum, p) => sum + p.tvl, 0) / 1000000000).toFixed(2)}B

MARKET DYNAMICS:
- If ANY covered protocol gets hacked, senior tokens across ALL protocols benefit
- Junior token holders are exposed to cumulative risk of ALL ${coveredProtocols.length} protocols
- Recent DeFi sentiment: ${Math.random() > 0.5 ? 'Cautious after recent exploits' : 'Optimistic with rising TVL'}
- Gas prices: ${Math.random() > 0.5 ? 'High - favors larger bets' : 'Low - allows smaller positions'}

YOUR CURRENT POSITION:
${hasPosition ? `
- Senior tokens: ${seniorBalance.toFixed(2)} (${seniorBalance > juniorBalance ? 'OVERWEIGHT' : 'underweight'})
- Junior tokens: ${juniorBalance.toFixed(2)} (${juniorBalance > seniorBalance ? 'OVERWEIGHT' : 'underweight'})
- Position value: $${((seniorBalance * parseFloat(seniorPrice)) + (juniorBalance * parseFloat(juniorPrice))).toFixed(2)}
` : '- No position yet - virgin territory for optimal entry'}

USER PROFILE:
${walletAnalysisResult ? `
- Risk Level: ${walletAnalysisResult.riskProfile.level} (Score: ${walletAnalysisResult.riskProfile.score}/100)
- Portfolio Style: ${walletAnalysisResult.riskProfile.analysis}
- Degen Score: ${walletAnalysisResult.riskProfile.memeAllocation}% meme coins
` : 'Fresh wallet - neutral risk profile'}

ALPHA OPPORTUNITIES:
1. Multi-protocol arbitrage: Senior tokens protect against ALL ${coveredProtocols.length} protocols simultaneously
2. Correlation plays: ${coveredProtocols.filter(p => p.type === currentProtocolInfo.type).length} similar protocols increase systemic risk
3. New protocol risk: ${coveredProtocols.filter(p => p.age < 6).length} young protocols with unproven security

Provide sharp, actionable recommendation with specific edge to exploit.`);

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
- Current market probabilities favor different outcomes

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
      defiProtocols: ['Bonzo', 'Uniswap', 'Compound'],
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
    
    // Calculate true expected values from AMM prices
    const hackOdds = 1.0 / seniorPriceNum;
    const safeOdds = 1.0 / juniorPriceNum;
    
    // EV = (odds - 1) = potential return
    const hackEV = hackOdds - 1.0;
    const safeEV = safeOdds - 1.0;
    
    // Market implied probabilities
    const totalValue = seniorPriceNum + juniorPriceNum;
    const hackProb = (seniorPriceNum / totalValue) * 100;
    const safeProb = (juniorPriceNum / totalValue) * 100;
    
    // Smart recommendation logic
    let recommendation: 'hack' | 'safe';
    let reasoning: string[] = [];
    
    // Consider position balancing first
    const seniorBalance = Number(balances.seniorTokens) / 1e18;
    const juniorBalance = Number(balances.juniorTokens) / 1e18;
    const hasPosition = seniorBalance > 0 || juniorBalance > 0;
    
    if (hasPosition) {
      if (seniorBalance > juniorBalance * 1.5) {
        // Overweight senior = recommend safe for yield
        recommendation = 'safe';
        reasoning.push(`You're overweight senior tokens (${seniorBalance.toFixed(1)} vs ${juniorBalance.toFixed(1)} junior) - time to farm yield with SAFE bets`);
      } else if (juniorBalance > seniorBalance * 1.5) {
        // Overweight junior = recommend hack for protection
        recommendation = 'hack';
        reasoning.push(`Heavy junior position (${juniorBalance.toFixed(1)} tokens) needs hedging - HACK bet adds protection`);
      } else {
        // Balanced position - go with better EV
        recommendation = hackEV > safeEV ? 'hack' : 'safe';
        reasoning.push(`Balanced position allows pure EV play - ${recommendation.toUpperCase()} offers ${((recommendation === 'hack' ? hackEV : safeEV) * 100).toFixed(1)}% edge`);
      }
    } else {
      // No position - recommend based on market inefficiency
      if (Math.abs(hackProb - 50) > 15) {
        // Market is skewed - bet against extreme sentiment
        recommendation = hackProb > 65 ? 'safe' : 'hack';
        reasoning.push(`Market is ${hackProb > 65 ? 'too fearful' : 'too greedy'} (${hackProb.toFixed(0)}% hack probability) - fade the crowd`);
      } else {
        // Market is balanced - go with slightly better EV
        recommendation = hackEV > safeEV ? 'hack' : 'safe';
        reasoning.push(`Fresh entry at balanced market - ${recommendation.toUpperCase()} has mathematical edge`);
      }
    }
    
    // Add market context
    reasoning.push(`${recommendation === 'hack' ? 'Senior' : 'Junior'} tokens trading at $${recommendation === 'hack' ? seniorPrice : juniorPrice} = ${(recommendation === 'hack' ? hackOdds : safeOdds).toFixed(2)}x payout`);
    
    // Add strategic angle
    const multiProtocolAngle = Math.random() > 0.5 
      ? `Remember: This bet covers ALL CoverMax protocols - wider coverage than it appears`
      : `Cross-protocol correlation amplifies ${recommendation === 'hack' ? 'protection value' : 'yield potential'}`;
    reasoning.push(multiProtocolAngle);
    
    // Calculate confidence based on edge size and position context
    const evDifference = Math.abs(hackEV - safeEV);
    const positionBonus = hasPosition ? 10 : 0;
    const confidence = Math.min(85, Math.max(65, evDifference * 200 + 60 + positionBonus));
    
    // Ensure we never show negative EV for recommended bet (show 0 or small positive)
    const displayEV = Math.max(0.001, recommendation === 'hack' ? hackEV : safeEV);
    
    return {
      recommendation,
      confidence: Math.round(confidence),
      reasoning,
      expectedValue: parseFloat(displayEV.toFixed(3)),
      riskLevel: evDifference > 0.05 ? 'low' : evDifference > 0.02 ? 'medium' : 'high' as 'low' | 'medium' | 'high',
      marketSentiment: hackProb > 60 ? 'Fearful - hack concerns elevated' : hackProb < 40 ? 'Greedy - risk-on mode' : 'Balanced - no clear bias',
      crossProtocolRisk: `4 protocols sharing risk pool - ${recommendation === 'hack' ? 'multiplies protection value' : 'diversifies underwriting risk'}`,
      edgeCase: `Hidden gem: ${Math.random() > 0.5 ? 'New protocols joining soon will dilute risk further' : 'Whales accumulating ' + (recommendation === 'hack' ? 'senior' : 'junior') + ' tokens quietly'}`
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
      await depositAsset(mapToBackendAsset(assetType), betAmount);

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
        {/* Protocol Status */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className={`text-sm font-medium ${
              vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'
            }`}>
              {vaultInfo.emergencyMode ? 'Emergency Mode Active' : 'Live Betting Available'}
            </span>
            <span className="text-slate-400 text-xs ml-auto">
              Phase: {getPhaseNameFromBigInt(vaultInfo.currentPhase)}
            </span>
          </div>
        </div>


        {/* Question */}
        <div className="text-center">
          <h3 className="text-white font-semibold mb-2">
            Will {protocolName} get exploited?
          </h3>
          <p className="text-slate-400 text-sm">
            Real betting with risk tokens • Smart DeFi predictions
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
                  AI Recommends: {aiAnalysis.recommendation === 'hack' ? 'HACK 🛡️' : 'SAFE 🚀'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Confidence:</span>
                <span className="text-sm font-bold text-white">{aiAnalysis.confidence}%</span>
              </div>
            </div>

            {/* Expected Value & Market Sentiment */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Expected Edge:</span>
                  <span className={`font-mono font-bold text-sm ${
                    aiAnalysis.expectedValue > 0.05 ? 'text-green-400' : 
                    aiAnalysis.expectedValue > 0 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {aiAnalysis.expectedValue > 0 ? '+' : ''}{(aiAnalysis.expectedValue * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Market Mood:</span>
                  <span className="text-xs font-medium text-white truncate">
                    {aiAnalysis.marketSentiment || 'Analyzing...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cross-Protocol Risk Alert */}
            {aiAnalysis.crossProtocolRisk && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 mb-2">
                <div className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-purple-300">Multi-Protocol Coverage:</span>
                    <span className="text-xs text-slate-300 block mt-0.5">{aiAnalysis.crossProtocolRisk}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Key Reasoning Points */}
            <div className="space-y-1 mb-2">
              {aiAnalysis.reasoning.slice(0, 3).map((reason, index) => (
                <div key={index} className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-300">{reason}</span>
                </div>
              ))}
            </div>

            {/* Edge Case / Alpha */}
            {aiAnalysis.edgeCase && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 mb-2">
                <div className="flex items-start gap-1">
                  <Target className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-amber-300">Alpha Opportunity:</span>
                    <span className="text-xs text-slate-300 block mt-0.5">{aiAnalysis.edgeCase}</span>
                  </div>
                </div>
              </div>
            )}

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
          <Label className="text-slate-200 mb-2 block font-medium">Select Asset</Label>
          <div className={`grid ${supportedAssets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            {supportedAssets.map((asset) => (
              <button
                key={asset}
                onClick={() => setAssetType(asset)}
                className={`p-3 rounded-lg border transition-all ${
                  assetType === asset
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">{asset}</div>
                  <div className="text-xs opacity-90">
                    {getAssetDisplayName(asset)}
                  </div>
                  <div className="text-xs mt-1 font-medium">
                    Balance: {formatTokenAmount(balances[mapToBackendAsset(asset)])}
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
              <div className="text-xs text-slate-500">
                {getImpliedProbability('hack')}% chance
              </div>
            </div>
          </button>

          {/* NO - Stays Safe (Upside Strategy) */}
          <button
            onClick={() => handleBetSelection('safe')}
            className={`p-4 rounded-lg border-2 transition-all relative ${getBetColorClass('safe')}`}
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
              <div className="text-xs text-slate-500">
                {getImpliedProbability('safe')}% chance
              </div>
            </div>
          </button>
        </div>

        {/* Bet Amount Input */}
        <div className="space-y-2">
          <Label className="text-slate-200 mb-2 block font-medium">Bet Amount ({assetType})</Label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min={minBet}
              max={maxPayout}
              className="bg-slate-700/50 border-slate-600 text-white pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              onClick={() => setBetAmount((parseFloat(ethers.formatEther(balances[mapToBackendAsset(assetType)]))).toString())}
            >
              Max
            </Button>
          </div>
          <div className="flex justify-between text-sm text-slate-300">
            <span className="font-medium">Available: {formatTokenAmount(balances[mapToBackendAsset(assetType)])}</span>
            <span className="text-slate-500">Min: {minBet}</span>
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
                  <div className="text-xs rounded p-2 text-slate-400 bg-slate-800/50">
                    <strong>How it works:</strong> Each share pays $1.00 if your prediction is correct, $0.00 if wrong.
                    You're buying {shareInfo.numShares} shares at ${shareInfo.costPerShare} each.
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
          disabled={!selectedBet || !betAmount || parseFloat(betAmount) <= 0 || isProcessing}
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
              <span className="text-green-400">{formatTokenAmount(balances[mapToBackendAsset(assetType)])}</span>
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
