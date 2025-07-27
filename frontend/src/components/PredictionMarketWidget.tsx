import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Zap, DollarSign, Clock, Target, Wallet, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import { Phase } from '@/config/contracts';
import { ethers } from 'ethers';

interface PredictionMarketWidgetProps {
  protocolName: string;
  protocolLogo?: string;
  timeframe?: string;
  minBet?: number;
  maxPayout?: number;
}

const PredictionMarketWidget: React.FC<PredictionMarketWidgetProps> = ({
  protocolName,
  protocolLogo = '🛡️',
  timeframe = '7 days',
  minBet = 10,
  maxPayout = 1000,
}) => {
  const {
    isConnected,
    connectWallet,
    vaultInfo,
    depositAsset,
    getAmountsOut,
    getTokenBalance,
    swapExactTokensForTokens,
    seniorTokenAddress,
    juniorTokenAddress,
    refreshData,
    balances,
    currentChain,
    isUnsupportedChain,
  } = useWeb3();

  const [selectedBet, setSelectedBet] = useState<'hack' | 'safe' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [assetType, setAssetType] = useState<'aUSDC' | 'cUSDT'>('aUSDC');
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time odds from Uniswap pricing
  const [currentOdds, setCurrentOdds] = useState({ hack: 1.15, safe: 6.5 });
  const [pricesLoading, setPricesLoading] = useState(false);

  // Fetch real-time pricing from Uniswap pools
  useEffect(() => {
    const fetchTokenPrices = async () => {
      if (!seniorTokenAddress || !juniorTokenAddress || !getAmountsOut || !isConnected) {
        return;
      }

      setPricesLoading(true);
      try {
        // Get price of 1 JUNIOR in terms of SENIOR (for hack bet - safety strategy)
        const juniorToSeniorPath = [juniorTokenAddress, seniorTokenAddress];
        const juniorToSeniorRate = await getAmountsOut('1', juniorToSeniorPath);

        // Get price of 1 SENIOR in terms of JUNIOR (for safe bet - upside strategy)
        const seniorToJuniorPath = [seniorTokenAddress, juniorTokenAddress];
        const seniorToJuniorRate = await getAmountsOut('1', seniorToJuniorPath);

        // Calculate odds based on token exchange rates
        // Higher exchange rate = better odds for that direction
        const hackOdds = parseFloat(juniorToSeniorRate) || 1.15;
        const safeOdds = parseFloat(seniorToJuniorRate) || 6.5;

        setCurrentOdds({
          hack: Math.max(1.01, hackOdds), // Minimum 1% return
          safe: Math.max(1.01, safeOdds)
        });
      } catch (error) {
        console.error('Error fetching token prices:', error);
        // Keep default odds on error
      } finally {
        setPricesLoading(false);
      }
    };

    fetchTokenPrices();
    const interval = setInterval(fetchTokenPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [seniorTokenAddress, juniorTokenAddress, getAmountsOut, isConnected]);

  const handleBetSelection = (bet: 'hack' | 'safe') => {
    setSelectedBet(bet);
  };

  const calculatePayout = (amount: string, odds: number) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return '0.00';
    return (numAmount * odds).toFixed(2);
  };

  const getImpliedProbability = (odds: number) => {
    return ((1 / odds) * 100).toFixed(1);
  };

  const calculateConversionAmount = (depositAmount: string, conversionType: 'toSenior' | 'toJunior') => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return '0';

    const amount = parseFloat(depositAmount);
    // When depositing, user gets 50/50 split initially, then we swap one side
    const halfAmount = amount / 2;

    if (conversionType === 'toSenior') {
      // For hack bet: half stays as senior, half junior gets swapped to senior
      const seniorFromDeposit = halfAmount;
      const seniorFromSwap = halfAmount * currentOdds.hack;
      return (seniorFromDeposit + seniorFromSwap).toFixed(2);
    } else {
      // For safe bet: half stays as junior, half senior gets swapped to junior
      const juniorFromDeposit = halfAmount;
      const juniorFromSwap = halfAmount * currentOdds.safe;
      return (juniorFromDeposit + juniorFromSwap).toFixed(2);
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
              <div className="text-lg font-bold">Predict {protocolName}</div>
              <div className="text-sm text-slate-400 font-normal">Next {timeframe}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">Connect your wallet to start betting</p>
            <Button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isUnsupportedChain) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm max-w-md mx-auto">
        <CardContent className="p-6">
          <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unsupported network. Please switch to a supported chain to use the prediction market.
            </AlertDescription>
          </Alert>
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
            <div className="text-lg font-bold">Predict {protocolName}</div>
            <div className="text-sm text-slate-400 font-normal">Next {timeframe}</div>
          </div>
          <Badge className="ml-auto bg-purple-600 text-white">
            <Zap className="w-3 h-3 mr-1" />
            {pricesLoading ? 'Updating...' : 'Live'}
          </Badge>
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
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAssetType('aUSDC')}
              className={`p-3 rounded-lg border transition-all ${
                assetType === 'aUSDC'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">aUSDC</div>
                <div className="text-xs opacity-80">Balance: {formatTokenAmount(balances.aUSDC)}</div>
              </div>
            </button>
            <button
              onClick={() => setAssetType('cUSDT')}
              className={`p-3 rounded-lg border transition-all ${
                assetType === 'cUSDT'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">cUSDT</div>
                <div className="text-xs opacity-80">Balance: {formatTokenAmount(balances.cUSDT)}</div>
              </div>
            </button>
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
                {getImpliedProbability(currentOdds.hack)}% chance
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
                {getImpliedProbability(currentOdds.safe)}% chance
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

        {/* Strategy Explanation */}
        {selectedBet && betAmount && parseFloat(betAmount) > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
            <div className="text-sm text-slate-300">
              <strong>Strategy:</strong> {selectedBet === 'hack' ? 'MAX SAFETY' : 'MAX UPSIDE'}
            </div>
            <div className="text-xs text-slate-400">
              ${betAmount} → {calculateConversionAmount(betAmount, selectedBet === 'hack' ? 'toSenior' : 'toJunior')} {selectedBet === 'hack' ? 'Senior' : 'Junior'} tokens
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Potential Payout:</span>
              <span className="text-white font-bold">
                ${calculatePayout(betAmount, selectedBet === 'hack' ? currentOdds.hack : currentOdds.safe)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Profit:</span>
              <span className={`font-bold ${selectedBet === 'hack' ? 'text-red-400' : 'text-green-400'}`}>
                ${(parseFloat(calculatePayout(betAmount, selectedBet === 'hack' ? currentOdds.hack : currentOdds.safe)) - parseFloat(betAmount)).toFixed(2)}
              </span>
            </div>
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
            <span>Live odds from Uniswap</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionMarketWidget;
