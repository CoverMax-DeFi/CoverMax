import React, { useEffect, useState } from 'react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Shield, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Zap, 
  Activity, 
  Clock, 
  AlertCircle, 
  Info, 
  RefreshCw,
  Droplets,
  BarChart3,
  Target,
  Users,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  Settings,
  TrendingDown
} from 'lucide-react';
import { Phase, ContractName, getContractAddress } from '@/config/contracts';
import { ethers } from 'ethers';

const UnifiedDashboard = () => {
  const {
    isConnected,
    balances,
    vaultInfo,
    depositAsset,
    withdraw,
    swapExactTokensForTokens,
    getAmountsOut,
    seniorTokenAddress,
    juniorTokenAddress,
    addLiquidity,
    refreshData,
    getPairReserves,
    getTokenBalance,
    currentChain,
  } = useWeb3();

  // State Management
  const [activeStrategy, setActiveStrategy] = useState<'safety' | 'upside' | 'balanced' | 'custom'>('balanced');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');
  const [isExecuting, setIsExecuting] = useState(false);
  const [seniorPrice, setSeniorPrice] = useState('1.00');
  const [juniorPrice, setJuniorPrice] = useState('1.00');
  const [poolReserves, setPoolReserves] = useState({ senior: '0', junior: '0' });
  const [activeTab, setActiveTab] = useState('overview');
  const [targetSeniorPercent, setTargetSeniorPercent] = useState(50);
  const [isRebalancePreview, setIsRebalancePreview] = useState(false);

  // Format utilities
  const formatTokenAmount = (amount: bigint) => ethers.formatEther(amount);
  const formatNumber = (num: number, decimals = 2) => num.toFixed(decimals);

  // Calculated values
  const seniorBalance = Number(formatTokenAmount(balances.seniorTokens));
  const juniorBalance = Number(formatTokenAmount(balances.juniorTokens));
  const aUSDCBalance = Number(formatTokenAmount(balances.aUSDC));
  const cUSDTBalance = Number(formatTokenAmount(balances.cUSDT));
  const lpBalance = Number(formatTokenAmount(balances.lpTokens));
  
  const totalPortfolioValue = 
    (seniorBalance * parseFloat(seniorPrice)) + 
    (juniorBalance * parseFloat(juniorPrice));
  
  const protocolTVL = (Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18;
  const userSharePercent = vaultInfo.totalTokensIssued > 0n 
    ? ((seniorBalance + juniorBalance) / (Number(vaultInfo.totalTokensIssued) / 1e18) * 100)
    : 0;

  // Risk Assessment
  const getRiskProfile = () => {
    const totalTokens = seniorBalance + juniorBalance;
    if (totalTokens === 0) return { level: 'None', color: 'slate', percentage: 0 };
    
    const seniorRatio = seniorBalance / totalTokens;
    if (seniorRatio >= 0.8) return { level: 'Conservative', color: 'blue', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.6) return { level: 'Moderate', color: 'purple', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.4) return { level: 'Balanced', color: 'green', percentage: seniorRatio * 100 };
    if (seniorRatio >= 0.2) return { level: 'Growth', color: 'yellow', percentage: seniorRatio * 100 };
    return { level: 'Aggressive', color: 'red', percentage: seniorRatio * 100 };
  };

  const riskProfile = getRiskProfile();

  // Initialize target percent to current allocation
  useEffect(() => {
    setTargetSeniorPercent(Math.round(riskProfile.percentage));
  }, [riskProfile.percentage]);

  // Fetch prices and reserves
  useEffect(() => {
    const fetchPrices = async () => {
      if (!seniorTokenAddress || !juniorTokenAddress || !getAmountsOut || !currentChain) return;
      
      try {
        const pairAddress = getContractAddress(currentChain, ContractName.SENIOR_JUNIOR_PAIR);
        const reserves = await getPairReserves(pairAddress);
        
        setPoolReserves({
          senior: ethers.formatEther(reserves.reserve0),
          junior: ethers.formatEther(reserves.reserve1),
        });

        // Get real prices from AMM
        const seniorToJuniorPath = [seniorTokenAddress, juniorTokenAddress];
        const juniorToSeniorPath = [juniorTokenAddress, seniorTokenAddress];
        
        const seniorRate = await getAmountsOut('1', seniorToJuniorPath);
        const juniorRate = await getAmountsOut('1', juniorToSeniorPath);
        
        setSeniorPrice(parseFloat(juniorRate).toFixed(2));
        setJuniorPrice(parseFloat(seniorRate).toFixed(2));
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [seniorTokenAddress, juniorTokenAddress, getAmountsOut, getPairReserves, currentChain]);

  // Strategy execution
  const executeStrategy = async (strategy: 'safety' | 'upside' | 'balanced') => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsExecuting(true);
    try {
      // First deposit to get tokens
      await depositAsset(selectedAsset, amount);
      
      if (strategy === 'safety') {
        // Convert all junior to senior
        const freshJuniorBalance = await getTokenBalance(juniorTokenAddress!);
        if (Number(freshJuniorBalance) > 0) {
          const path = [juniorTokenAddress!, seniorTokenAddress!];
          const balanceString = ethers.formatEther(freshJuniorBalance);
          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18);
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      } else if (strategy === 'upside') {
        // Convert all senior to junior
        const freshSeniorBalance = await getTokenBalance(seniorTokenAddress!);
        if (Number(freshSeniorBalance) > 0) {
          const path = [seniorTokenAddress!, juniorTokenAddress!];
          const balanceString = ethers.formatEther(freshSeniorBalance);
          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18);
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      }
      // For balanced, keep 50/50 split from deposit
      
      setAmount('');
      await refreshData();
    } catch (error) {
      console.error('Strategy execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navbar />
        <div className="container mx-auto px-6 py-20">
          <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-slate-400 mb-6">
                Connect to start earning yield with risk management
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <Navbar />
      
      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Portfolio Dashboard</h1>
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
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 font-medium">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">${formatNumber(totalPortfolioValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-2 text-xs text-slate-400 font-medium">
                {formatNumber(userSharePercent, 4)}% of protocol
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 font-medium">Senior Tokens</p>
                  <p className="text-2xl font-bold text-blue-400">{formatNumber(seniorBalance)}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-2 text-xs text-slate-400 font-medium">
                ${formatNumber(seniorBalance * parseFloat(seniorPrice))} value
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 font-medium">Junior Tokens</p>
                  <p className="text-2xl font-bold text-amber-400">{formatNumber(juniorBalance)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400" />
              </div>
              <div className="mt-2 text-xs text-slate-400 font-medium">
                ${formatNumber(juniorBalance * parseFloat(juniorPrice))} value
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 font-medium">Protocol Phase</p>
                  <p className="text-lg font-bold text-white">
                    {vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
              <div className="mt-2 text-xs text-slate-400 font-medium">
                TVL: ${formatNumber(protocolTVL, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/80 border border-slate-600">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Overview</TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Deposit & Trade</TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Manage Positions</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Advanced</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Breakdown */}
              <Card className="lg:col-span-2 bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Portfolio Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Profile Visualization */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-200 font-medium">Risk Distribution</span>
                      <span className="text-sm text-slate-300 font-medium">
                        {formatNumber(riskProfile.percentage)}% Senior
                      </span>
                    </div>
                    <Progress 
                      value={riskProfile.percentage} 
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                  </div>

                  {/* Token Holdings */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-blue-400" />
                        <div>
                          <p className="text-white font-semibold">Senior Tokens</p>
                          <p className="text-xs text-slate-300">Priority claims • Lower risk</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatNumber(seniorBalance)}</p>
                        <p className="text-xs text-slate-300">${seniorPrice} each</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-amber-400" />
                        <div>
                          <p className="text-white font-semibold">Junior Tokens</p>
                          <p className="text-xs text-slate-300">Higher upside • Higher risk</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatNumber(juniorBalance)}</p>
                        <p className="text-xs text-slate-300">${juniorPrice} each</p>
                      </div>
                    </div>

                    {lpBalance > 0 && (
                      <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <div className="flex items-center space-x-3">
                          <Droplets className="w-6 h-6 text-purple-400" />
                          <div>
                            <p className="text-white font-semibold">LP Tokens</p>
                            <p className="text-xs text-slate-300">Liquidity provider rewards</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatNumber(lpBalance)}</p>
                          <p className="text-xs text-slate-300">Pool share</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <Zap className="w-5 h-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-between bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => setActiveTab('deposit')}
                  >
                    Deposit & Get Tokens
                    <Plus className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-between border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                    onClick={() => setActiveTab('manage')}
                  >
                    Manage Positions
                    <Settings className="w-4 h-4" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-between border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                    onClick={() => window.open('https://app.uniswap.org/#/swap', '_blank')}
                  >
                    Trade on Uniswap
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  {/* Protocol Status */}
                  <div className="pt-4 border-t border-slate-600">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">Protocol Status:</span>
                        <span className="text-white font-semibold">{Phase[vaultInfo.currentPhase] || 'Loading...'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">Emergency Mode:</span>
                        <span className={`font-semibold ${vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                          {vaultInfo.emergencyMode ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Overview */}
            <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white flex items-center font-semibold">
                  <Activity className="w-5 h-5 mr-2" />
                  Market Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-1 font-medium">Senior Price</p>
                    <p className="text-xl font-bold text-blue-400">${seniorPrice}</p>
                    <div className="flex items-center justify-center mt-1">
                      <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                      <span className="text-xs text-green-400 font-medium">Stable</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-1 font-medium">Junior Price</p>
                    <p className="text-xl font-bold text-amber-400">${juniorPrice}</p>
                    <div className="flex items-center justify-center mt-1">
                      <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                      <span className="text-xs text-green-400 font-medium">Volatile</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-1 font-medium">Pool Liquidity</p>
                    <p className="text-xl font-bold text-purple-400">
                      ${formatNumber((parseFloat(poolReserves.senior) + parseFloat(poolReserves.junior)), 0)}
                    </p>
                    <div className="flex items-center justify-center mt-1">
                      <Droplets className="w-3 h-3 text-purple-400 mr-1" />
                      <span className="text-xs text-purple-400 font-medium">Deep</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-1 font-medium">Protocol TVL</p>
                    <p className="text-xl font-bold text-green-400">${formatNumber(protocolTVL, 0)}</p>
                    <div className="flex items-center justify-center mt-1">
                      <Users className="w-3 h-3 text-green-400 mr-1" />
                      <span className="text-xs text-green-400 font-medium">Growing</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposit & Trade Tab */}
          <TabsContent value="deposit" className="space-y-6">
            <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white flex items-center font-semibold">
                  <Target className="w-5 h-5 mr-2" />
                  Smart Deposit Strategies
                </CardTitle>
                <CardDescription className="text-slate-200">
                  Choose your risk strategy and we'll optimize your token allocation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Strategy Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${
                      activeStrategy === 'safety' 
                        ? 'ring-2 ring-blue-500 bg-blue-900/30 border-blue-500' 
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70'
                    }`}
                    onClick={() => setActiveStrategy('safety')}
                  >
                    <CardContent className="p-4 text-center">
                      <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-1">Max Safety</h3>
                      <p className="text-xs text-slate-300 mb-2">All funds → Senior tokens</p>
                      <Badge variant="outline" className="border-blue-500 text-blue-300 font-medium">
                        Priority Claims
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all ${
                      activeStrategy === 'balanced' 
                        ? 'ring-2 ring-purple-500 bg-purple-900/30 border-purple-500' 
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70'
                    }`}
                    onClick={() => setActiveStrategy('balanced')}
                  >
                    <CardContent className="p-4 text-center">
                      <Activity className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-1">Balanced</h3>
                      <p className="text-xs text-slate-300 mb-2">50% Senior / 50% Junior</p>
                      <Badge variant="outline" className="border-purple-500 text-purple-300 font-medium">
                        Moderate Risk
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all ${
                      activeStrategy === 'upside' 
                        ? 'ring-2 ring-amber-500 bg-amber-900/30 border-amber-500' 
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70'
                    }`}
                    onClick={() => setActiveStrategy('upside')}
                  >
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-1">Max Upside</h3>
                      <p className="text-xs text-slate-300 mb-2">All funds → Junior tokens</p>
                      <Badge variant="outline" className="border-amber-500 text-amber-300 font-medium">
                        Higher Returns
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Deposit Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-200 mb-3 block font-medium">Select Asset</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedAsset('aUSDC')}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedAsset === 'aUSDC'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300' 
                            : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-semibold">aUSDC</div>
                          <div className="text-sm opacity-90">Aave USDC</div>
                          <div className="text-xs mt-1 font-medium">Balance: {formatNumber(aUSDCBalance, 4)}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedAsset('cUSDT')}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedAsset === 'cUSDT'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-semibold">cUSDT</div>
                          <div className="text-sm opacity-90">Compound USDT</div>
                          <div className="text-xs mt-1 font-medium">Balance: {formatNumber(cUSDTBalance, 4)}</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-200 mb-3 block font-medium">Deposit Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white text-lg py-6"
                    />
                    <div className="flex justify-between mt-2 text-sm text-slate-300">
                      <span className="font-medium">Available: {formatNumber(selectedAsset === 'aUSDC' ? aUSDCBalance : cUSDTBalance, 4)}</span>
                      <button 
                        onClick={() => setAmount((selectedAsset === 'aUSDC' ? aUSDCBalance : cUSDTBalance).toString())}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                </div>

                {/* Strategy Preview */}
                {amount && parseFloat(amount) > 0 && (
                  <Alert className="bg-slate-700/60 border-slate-500">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold text-white">Strategy Preview:</div>
                        <div className="text-sm space-y-1 text-slate-200">
                          {activeStrategy === 'safety' && (
                            <div>Depositing ${amount} will get you ~${amount} in Senior tokens (priority claims)</div>
                          )}
                          {activeStrategy === 'balanced' && (
                            <div>Depositing ${amount} will get you ~${formatNumber(parseFloat(amount) / 2)} Senior + ~${formatNumber(parseFloat(amount) / 2)} Junior tokens</div>
                          )}
                          {activeStrategy === 'upside' && (
                            <div>Depositing ${amount} will get you ~${amount} in Junior tokens (higher upside potential)</div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Execute Button */}
                <Button 
                  onClick={() => executeStrategy(activeStrategy)}
                  disabled={!amount || parseFloat(amount) <= 0 || isExecuting}
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isExecuting ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Executing Strategy...
                    </div>
                  ) : (
                    `Execute ${activeStrategy.charAt(0).toUpperCase() + activeStrategy.slice(1)} Strategy`
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Positions Tab */}
          <TabsContent value="manage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rebalance Portfolio */}
              <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <Activity className="w-5 h-5 mr-2" />
                    Rebalance Portfolio
                  </CardTitle>
                  <CardDescription className="text-slate-200">
                    Adjust your risk exposure by trading between Senior and Junior tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current vs Target Visualization */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">Current Allocation</span>
                        <span className="text-white font-semibold">{formatNumber(riskProfile.percentage)}% Senior / {formatNumber(100 - riskProfile.percentage)}% Junior</span>
                      </div>
                      <Progress value={riskProfile.percentage} className="h-3" />
                    </div>

                    {isRebalancePreview && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300 font-medium">Target Allocation</span>
                          <span className="text-white font-semibold">{targetSeniorPercent}% Senior / {100 - targetSeniorPercent}% Junior</span>
                        </div>
                        <Progress value={targetSeniorPercent} className="h-3 bg-slate-700">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${targetSeniorPercent}%` }} />
                        </Progress>
                      </div>
                    )}
                  </div>

                  {/* Slider Control */}
                  <div className="space-y-3">
                    <Label className="text-slate-200 font-medium">Set Target Allocation</Label>
                    <div className="px-2">
                      <Slider
                        value={[targetSeniorPercent]}
                        onValueChange={(value) => {
                          setTargetSeniorPercent(value[0]);
                          setIsRebalancePreview(true);
                        }}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 font-medium px-2">
                      <span>0% Senior<br />Max Risk</span>
                      <span className="text-center">50% Senior<br />Balanced</span>
                      <span className="text-right">100% Senior<br />Max Safety</span>
                    </div>
                  </div>

                  {/* Trade Preview */}
                  {isRebalancePreview && Math.abs(targetSeniorPercent - riskProfile.percentage) > 0 && (
                    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 space-y-2">
                      <div className="text-sm font-medium text-white">Rebalance Preview</div>
                      {targetSeniorPercent > riskProfile.percentage ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center text-blue-300">
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            <span>Swap ~{formatNumber((juniorBalance * (targetSeniorPercent - riskProfile.percentage) / 100))} Junior → Senior</span>
                          </div>
                          <div className="text-slate-400 text-xs pl-6">
                            Estimated output: ~{formatNumber((juniorBalance * (targetSeniorPercent - riskProfile.percentage) / 100) * parseFloat(juniorPrice))} Senior tokens
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center text-amber-300">
                            <ArrowDownRight className="w-4 h-4 mr-2" />
                            <span>Swap ~{formatNumber((seniorBalance * (riskProfile.percentage - targetSeniorPercent) / 100))} Senior → Junior</span>
                          </div>
                          <div className="text-slate-400 text-xs pl-6">
                            Estimated output: ~{formatNumber((seniorBalance * (riskProfile.percentage - targetSeniorPercent) / 100) / parseFloat(juniorPrice))} Junior tokens
                          </div>
                        </div>
                      )}
                      <div className="flex items-center text-xs text-slate-400 pt-1">
                        <Zap className="w-3 h-3 mr-1" />
                        Estimated gas: ~0.15 GLMR
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isRebalancePreview && Math.abs(targetSeniorPercent - riskProfile.percentage) > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700"
                        onClick={() => {
                          setTargetSeniorPercent(Math.round(riskProfile.percentage));
                          setIsRebalancePreview(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Execute Rebalance
                      </Button>
                    </div>
                  ) : (
                    <Alert className="bg-blue-900/30 border-blue-500">
                      <Info className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-200">
                        Use the slider above to set your target allocation. Trades will be executed on Uniswap V2.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Withdraw Funds */}
              <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <Minus className="w-5 h-5 mr-2" />
                    Withdraw Funds
                  </CardTitle>
                  <CardDescription className="text-slate-200">
                    Convert tokens back to underlying assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-slate-200 font-medium">Withdrawal Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    <div className="text-sm text-slate-300 font-medium">
                      Max withdrawable: ${formatNumber(totalPortfolioValue)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-medium">Preferred Asset</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700">aUSDC</Button>
                      <Button variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700">cUSDT</Button>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white">
                    Calculate Withdrawal
                  </Button>

                  <Alert className="bg-yellow-900/30 border-yellow-500">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-200">
                      Current phase: {Phase[vaultInfo.currentPhase] || 'Loading...'}. Phase affects withdrawal rules.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liquidity Management */}
              <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <Droplets className="w-5 h-5 mr-2" />
                    Liquidity Management
                  </CardTitle>
                  <CardDescription className="text-slate-200">
                    Provide liquidity to earn trading fees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-sm text-slate-300 mb-1 font-medium">Current LP Position</p>
                    <p className="text-xl font-bold text-purple-400">{formatNumber(lpBalance)} LP</p>
                    <p className="text-xs text-slate-400 font-medium">Pool share</p>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    Add Optimal Liquidity
                  </Button>

                  {lpBalance > 0 && (
                    <Button variant="outline" className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700">
                      Remove Liquidity
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Protocol Analytics */}
              <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center font-semibold">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Protocol Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-300 font-medium">Total TVL</p>
                      <p className="text-lg font-bold text-green-400">${formatNumber(protocolTVL, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 font-medium">Your Share</p>
                      <p className="text-lg font-bold text-blue-400">{formatNumber(userSharePercent, 4)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 font-medium">Pool Ratio</p>
                      <p className="text-lg font-bold text-purple-400">
                        {parseFloat(poolReserves.junior) > 0 
                          ? formatNumber(parseFloat(poolReserves.senior) / parseFloat(poolReserves.junior), 2)
                          : '1.00'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 font-medium">Emergency Mode</p>
                      <p className={`text-lg font-bold ${vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                        {vaultInfo.emergencyMode ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700"
                    onClick={() => window.open('https://app.uniswap.org/#/pool', '_blank')}
                  >
                    View on Uniswap
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default React.memo(UnifiedDashboard);