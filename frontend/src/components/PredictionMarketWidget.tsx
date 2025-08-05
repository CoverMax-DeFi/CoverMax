import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Clock,
  Target
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
}


const PredictionMarketWidget: React.FC<PredictionMarketWidgetProps> = ({
  protocolName,
  protocolLogo,
  timeframe,
  minBet,
  maxPayout,
  supportedAssets
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

      setCurrentOdds({
        hack: hackOdds, // Allow odds below 1.0 (losing bets)
        safe: safeOdds  // Allow odds below 1.0 (losing bets)
      });
    } else {
      // Fallback to default odds if prices aren't loaded
      setCurrentOdds({
        hack: 1.02,
        safe: 1.25
      });
    }
  }, [seniorPrice, juniorPrice]);

  const handleBetSelection = (bet: 'hack' | 'safe') => {
    setSelectedBet(bet);
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
            className={`p-4 rounded-lg border-2 transition-all ${getBetColorClass('hack')}`}
            disabled={Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
          >
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
            className={`p-4 rounded-lg border-2 transition-all ${getBetColorClass('safe')}`}
            disabled={Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
          >
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

        {/* Your Positions */}
        {(Number(balances.seniorTokens) > 0 || Number(balances.juniorTokens) > 0) && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-sm text-slate-300 mb-2 font-semibold">Your Positions:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Senior Tokens (Safe):</span>
                <span className="text-blue-400">{formatTokenAmount(balances.seniorTokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Junior Tokens (Risk):</span>
                <span className="text-amber-400">{formatTokenAmount(balances.juniorTokens)}</span>
              </div>
            </div>
          </div>
        )}

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
