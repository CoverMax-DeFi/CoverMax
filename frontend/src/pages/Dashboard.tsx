import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import Navbar from '@/components/Navbar';
import PhaseDisplay from '@/components/PhaseDisplay';
import QuickTrade from '@/components/QuickTrade';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Coins, Shield, AlertCircle, RefreshCw, Activity, ArrowRight, Droplets, BarChart3, TrendingUp, ExternalLink, Zap, Users } from 'lucide-react';
import { Phase, ContractName, getContractAddress, SupportedChainId } from '@/config/contracts';
import { ethers } from 'ethers';

const Dashboard = () => {
  const {
    isConnected,
    balances,
    vaultInfo,
    getAmountsOut,
    seniorTokenAddress,
    juniorTokenAddress,
    getPairReserves,
    currentChain,
    isUnsupportedChain,
  } = useWeb3();

  const [seniorPrice, setSeniorPrice] = useState('0.98');
  const [juniorPrice, setJuniorPrice] = useState('1.05');
  const [pricesLoading, setPricesLoading] = useState(false);
  
  // Pool reserves state
  const [poolReserves, setPoolReserves] = useState({ senior: '0', junior: '0' });

  // Format token amounts for display
  const formatTokenAmount = (amount: bigint) => {
    return ethers.formatEther(amount);
  };

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

    const fetchPoolReserves = async () => {
      if (!getPairReserves || !currentChain) return;
      
      try {
        const pairAddress = getContractAddress(currentChain, ContractName.SENIOR_JUNIOR_PAIR);
        const reserves = await getPairReserves(pairAddress);
        
        // Format reserves from wei to ether
        const seniorReserve = ethers.formatEther(reserves.reserve0);
        const juniorReserve = ethers.formatEther(reserves.reserve1);
        
        // Only update if values have changed significantly (avoid micro-updates)
        const currentSenior = parseFloat(poolReserves.senior);
        const currentJunior = parseFloat(poolReserves.junior);
        const newSenior = parseFloat(seniorReserve);
        const newJunior = parseFloat(juniorReserve);
        
        if (Math.abs(currentSenior - newSenior) > 0.01 || Math.abs(currentJunior - newJunior) > 0.01) {
          setPoolReserves({
            senior: seniorReserve,
            junior: juniorReserve,
          });
        }
      } catch (error) {
        console.error('Error fetching pool reserves:', error);
        // Only reset if we don't have valid data
        if (poolReserves.senior === '0' && poolReserves.junior === '0') {
          setPoolReserves({ senior: '0', junior: '0' });
        }
      }
    };

    fetchTokenPrices();
    fetchPoolReserves();
    const interval = setInterval(() => {
      fetchTokenPrices();
      fetchPoolReserves();
    }, 30000); // Update every 30 seconds to reduce twitching
    
    return () => clearInterval(interval);
  }, [seniorTokenAddress, juniorTokenAddress, getAmountsOut, getPairReserves, currentChain]);

  // Calculate total portfolio value based on risk token holdings and current market prices
  const seniorTokenAmount = parseFloat(formatTokenAmount(balances.seniorTokens));
  const juniorTokenAmount = parseFloat(formatTokenAmount(balances.juniorTokens));
  
  const totalPortfolioValue = 
    (seniorTokenAmount * parseFloat(seniorPrice)) +
    (juniorTokenAmount * parseFloat(juniorPrice));

  // Risk Assessment
  const getRiskProfile = () => {
    const totalTokens = seniorTokenAmount + juniorTokenAmount;
    if (totalTokens === 0) return { level: 'None', color: 'slate', percentage: 0 };
    
    const seniorRatio = seniorTokenAmount / totalTokens;
    if (seniorRatio >= 0.8) return { level: 'Conservative', color: 'blue', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.6) return { level: 'Moderate', color: 'purple', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.4) return { level: 'Balanced', color: 'green', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.2) return { level: 'Growth', color: 'yellow', percentage: seniorRatio * 100 };
    return { level: 'Aggressive', color: 'red', percentage: seniorRatio * 100 };
  };

  const riskProfile = getRiskProfile();
  const protocolTVL = (Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18;
  const userSharePercent = vaultInfo.totalTokensIssued > 0n 
    ? ((seniorTokenAmount + juniorTokenAmount) / (Number(vaultInfo.totalTokensIssued) / 1e18) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <Navbar />

      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Portfolio Dashboard
              </h1>
              <p className="text-slate-300">
                Smart risk management with tradeable insurance tokens
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge 
                variant="outline" 
                className={`border-${riskProfile.color}-500 text-${riskProfile.color}-400`}
              >
                {riskProfile.level} Risk Profile
              </Badge>
              <div className="flex items-center text-slate-400 text-sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${pricesLoading ? 'animate-spin' : ''}`} />
                Real-time data
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Alert className="mb-6 bg-slate-800/50 border-slate-700 text-slate-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to interact with the protocol
            </AlertDescription>
          </Alert>
        )}

        {/* New Unified Dashboard CTA */}
        <Alert className="mb-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/50">
          <Zap className="h-4 w-4 text-blue-400" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="text-blue-300 font-medium">Try our new Unified Dashboard!</span>
              <p className="text-slate-300 text-sm mt-1">Enhanced user experience with smart risk strategies and streamlined interface.</p>
            </div>
            <Link to="/unified">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 ml-4">
                Try Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>


        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">${totalPortfolioValue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {userSharePercent.toFixed(4)}% of protocol
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Senior Tokens</p>
                  <p className="text-2xl font-bold text-blue-400">{seniorTokenAmount.toFixed(2)}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                ${(seniorTokenAmount * parseFloat(seniorPrice)).toFixed(2)} value
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Junior Tokens</p>
                  <p className="text-2xl font-bold text-amber-400">{juniorTokenAmount.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                ${(juniorTokenAmount * parseFloat(juniorPrice)).toFixed(2)} value
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Protocol TVL</p>
                  <p className="text-xl font-bold text-green-400">${protocolTVL.toFixed(0)}</p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Phase: {vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Trade - Hero Section */}
        <div className="mb-8">
          <QuickTrade />
        </div>
        
                {/* Enhanced Portfolio Overview */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Portfolio Analysis
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://app.uniswap.org/#/swap', '_blank')}
              className="border-slate-600 hover:bg-slate-700 text-slate-200 hover:text-white"
            >
              Trade on Uniswap
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          {/* Risk Profile Visualization */}
          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center font-semibold">
                <Activity className="w-5 h-5 mr-2" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Current Risk Level: {riskProfile.level}</span>
                <span className="text-sm text-slate-300 font-medium">
                  {riskProfile.percentage.toFixed(1)}% Senior Allocation
                </span>
              </div>
              <Progress 
                value={riskProfile.percentage} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Conservative (More Senior)</span>
                <span>Aggressive (More Junior)</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-sm text-blue-400 font-medium">Senior Price</p>
                  <p className="text-lg font-bold text-white">${seniorPrice}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-amber-400 font-medium">Junior Price</p>
                  <p className="text-lg font-bold text-white">${juniorPrice}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-purple-400 font-medium">Pool Liquidity</p>
                  <p className="text-lg font-bold text-white">
                    ${((parseFloat(poolReserves.senior)) + (parseFloat(poolReserves.junior))).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center font-semibold">
                <Zap className="w-5 h-5 mr-2" />
                Token Holdings
              </CardTitle>
              <CardDescription className="text-slate-200">Your current risk token positions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">SENIOR</p>
                    <p className="text-slate-300 text-sm">Priority claims</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatTokenAmount(balances.seniorTokens)}</p>
                  <p className="text-slate-300 text-sm">Value: ${(seniorTokenAmount * parseFloat(seniorPrice)).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                    <Coins className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">JUNIOR</p>
                    <p className="text-slate-300 text-sm">Higher upside</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatTokenAmount(balances.juniorTokens)}</p>
                  <p className="text-slate-300 text-sm">Value: ${(juniorTokenAmount * parseFloat(juniorPrice)).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">LP TOKENS</p>
                    <p className="text-slate-300 text-sm">Liquidity provider</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatTokenAmount(balances.lpTokens)}</p>
                  <p className="text-slate-300 text-sm">Pool share</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-white font-semibold">Protocol Status</CardTitle>
              <CardDescription className="text-slate-200">Current protocol information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Current Phase:</span>
                <span className="text-white font-semibold">{vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Emergency Mode:</span>
                <span className={`font-semibold ${vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                  {vaultInfo.emergencyMode ? '🚨 Active' : '✅ Inactive'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Total TVL:</span>
                <span className="text-white font-semibold">${((Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Your Share:</span>
                <span className="text-white font-semibold">
                  {vaultInfo.totalTokensIssued > 0n 
                    ? ((seniorTokenAmount + juniorTokenAmount) / (Number(vaultInfo.totalTokensIssued) / 1e18) * 100).toFixed(2) 
                    : '0.00'}%
                </span>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);