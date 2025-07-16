import React, { useEffect, useState } from 'react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import Navbar from '@/components/Navbar';
import PhaseDisplay from '@/components/PhaseDisplay';
import Trade from '@/components/Trade';
import SmartLiquiditySuggestion from '@/components/SmartLiquiditySuggestion';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, DollarSign, Coins, Shield, AlertCircle, RefreshCw, Droplets, Minus, Activity, Settings, BarChart3 } from 'lucide-react';
import { Phase, ContractName, getContractAddress, SupportedChainId } from '@/config/contracts';
import { ethers } from 'ethers';

const Advanced = () => {
  const {
    isConnected,
    balances,
    vaultInfo,
    depositAsset,
    withdraw,
    emergencyWithdraw,
    getAmountsOut,
    seniorTokenAddress,
    juniorTokenAddress,
    addLiquidity,
    removeLiquidity,
    getPairReserves,
    currentChain,
    isUnsupportedChain,
  } = useWeb3();

  const [depositAmount, setDepositAmount] = useState('');
  const [depositAssetType, setDepositAssetType] = useState<'aUSDC' | 'cUSDT'>('aUSDC');
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [preferredAsset, setPreferredAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');
  const [seniorPrice, setSeniorPrice] = useState('0.98');
  const [juniorPrice, setJuniorPrice] = useState('1.05');
  const [pricesLoading, setPricesLoading] = useState(false);
  
  // Pool reserves state
  const [poolReserves, setPoolReserves] = useState({ senior: '0', junior: '0' });
  
  // Liquidity management state
  const [liquiditySeniorAmount, setLiquiditySeniorAmount] = useState('');
  const [liquidityJuniorAmount, setLiquidityJuniorAmount] = useState('');
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('');
  const [showLiquiditySuggestion, setShowLiquiditySuggestion] = useState(false);
  const [liquidityMode, setLiquidityMode] = useState<'manual' | 'optimal'>('optimal');
  
  // New redemption state
  const [selectedWithdrawAsset, setSelectedWithdrawAsset] = useState<'aUSDC' | 'cUSDT' | null>(null);
  const [withdrawAssetAmount, setWithdrawAssetAmount] = useState('');
  const [calculatedTokenAmounts, setCalculatedTokenAmounts] = useState({ senior: '0', junior: '0' });
  const [effectivePhase, setEffectivePhase] = useState<Phase>(Phase.DEPOSIT);

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


  // Calculate optimal token amounts when user selects asset and amount
  useEffect(() => {
    const calculateOptimalTokens = () => {
      if (!selectedWithdrawAsset || !withdrawAssetAmount || parseFloat(withdrawAssetAmount) <= 0) {
        setCalculatedTokenAmounts({ senior: '0', junior: '0' });
        return;
      }

      const targetAmount = parseFloat(withdrawAssetAmount);
      const seniorBalance = parseFloat(formatTokenAmount(balances.seniorTokens));
      const juniorBalance = parseFloat(formatTokenAmount(balances.juniorTokens));

      let seniorToUse = 0;
      let juniorToUse = 0;

      // Handle case where phase is not loaded yet - default to DEPOSIT phase logic
      // Convert bigint to number for comparison
      const currentPhase = vaultInfo.currentPhase !== undefined ? Number(vaultInfo.currentPhase) : Phase.DEPOSIT;
      setEffectivePhase(currentPhase);

      if (currentPhase === Phase.DEPOSIT) {
        // Deposit phase: equal amounts required  
        const requiredPerToken = targetAmount / 2; // Each token contributes half
        const maxPossible = Math.min(seniorBalance, juniorBalance);
        const actualPerToken = Math.min(requiredPerToken, maxPossible);
        seniorToUse = actualPerToken;
        juniorToUse = actualPerToken;
      } else if (currentPhase === Phase.CLAIMS) {
        // Claims phase: senior tokens only
        seniorToUse = Math.min(targetAmount, seniorBalance);
        juniorToUse = 0;
      } else {
        // Other phases: prefer junior tokens first
        if (juniorBalance >= targetAmount) {
          juniorToUse = targetAmount;
          seniorToUse = 0;
        } else {
          juniorToUse = juniorBalance;
          seniorToUse = Math.min(targetAmount - juniorBalance, seniorBalance);
        }
      }

      setCalculatedTokenAmounts({
        senior: seniorToUse.toFixed(6),
        junior: juniorToUse.toFixed(6),
      });
    };

    calculateOptimalTokens();
  }, [selectedWithdrawAsset, withdrawAssetAmount, balances.seniorTokens, balances.juniorTokens, vaultInfo.currentPhase]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    await depositAsset(depositAssetType, depositAmount);
    setDepositAmount('');
  };


  const handleOptimalWithdraw = async () => {
    if (!selectedWithdrawAsset || !withdrawAssetAmount || parseFloat(withdrawAssetAmount) <= 0) return;
    
    const { senior, junior } = calculatedTokenAmounts;
    if (parseFloat(senior) <= 0 && parseFloat(junior) <= 0) return;
    
    await withdraw(senior, junior);
    setSelectedWithdrawAsset(null);
    setWithdrawAssetAmount('');
    setCalculatedTokenAmounts({ senior: '0', junior: '0' });
  };

  const handleEmergencyWithdraw = async () => {
    if (!emergencyAmount || parseFloat(emergencyAmount) <= 0) return;
    await emergencyWithdraw(emergencyAmount, preferredAsset);
    setEmergencyAmount('');
  };

  const handleAddLiquidity = async () => {
    if (!liquiditySeniorAmount || !liquidityJuniorAmount || !seniorTokenAddress || !juniorTokenAddress) return;
    if (parseFloat(liquiditySeniorAmount) <= 0 || parseFloat(liquidityJuniorAmount) <= 0) return;
    
    await addLiquidity(liquiditySeniorAmount, liquidityJuniorAmount, seniorTokenAddress, juniorTokenAddress);
    setLiquiditySeniorAmount('');
    setLiquidityJuniorAmount('');
    setShowLiquiditySuggestion(false);
  };

  const handleOptimalLiquidity = () => {
    const seniorBalance = parseFloat(formatTokenAmount(balances.seniorTokens));
    const juniorBalance = parseFloat(formatTokenAmount(balances.juniorTokens));
    const poolSenior = parseFloat(poolReserves.senior);
    const poolJunior = parseFloat(poolReserves.junior);
    
    if (poolSenior > 0 && poolJunior > 0) {
      // Calculate optimal amounts based on pool ratio
      const poolRatio = poolSenior / poolJunior;
      const userRatio = seniorBalance / juniorBalance;
      
      let optimalSenior: number, optimalJunior: number;
      
      if (userRatio > poolRatio) {
        // User has more senior relative to pool ratio
        optimalJunior = juniorBalance;
        optimalSenior = Math.min(optimalJunior * poolRatio, seniorBalance);
      } else {
        // User has more junior relative to pool ratio
        optimalSenior = seniorBalance;
        optimalJunior = Math.min(optimalSenior / poolRatio, juniorBalance);
      }
      
      setLiquiditySeniorAmount(optimalSenior.toFixed(6));
      setLiquidityJuniorAmount(optimalJunior.toFixed(6));
    } else {
      // If no pool reserves, use equal amounts
      const maxAmount = Math.min(seniorBalance, juniorBalance);
      setLiquiditySeniorAmount(maxAmount.toFixed(6));
      setLiquidityJuniorAmount(maxAmount.toFixed(6));
    }
  };


  const handleRemoveLiquidity = async () => {
    if (!removeLiquidityAmount || !seniorTokenAddress || !juniorTokenAddress) return;
    if (parseFloat(removeLiquidityAmount) <= 0) return;
    
    await removeLiquidity(removeLiquidityAmount, seniorTokenAddress, juniorTokenAddress);
    setRemoveLiquidityAmount('');
  };

  // Calculate total portfolio value based on risk token holdings and current market prices
  const seniorTokenAmount = parseFloat(formatTokenAmount(balances.seniorTokens));
  const juniorTokenAmount = parseFloat(formatTokenAmount(balances.juniorTokens));
  
  const totalPortfolioValue = 
    (seniorTokenAmount * parseFloat(seniorPrice)) +
    (juniorTokenAmount * parseFloat(juniorPrice));

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Settings className="w-8 h-8 mr-3 text-purple-400" />
                Advanced Trading
              </h1>
              <p className="text-slate-300">
                Complete control over protocol operations, manual trading, and liquidity management
              </p>
            </div>
            <div className="flex items-center text-slate-400 text-sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${pricesLoading ? 'animate-spin' : ''}`} />
              Real-time data
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Alert className="mb-6 bg-slate-800/50 border-slate-700 text-slate-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to interact with advanced protocol features
            </AlertDescription>
          </Alert>
        )}

        {/* Phase Display */}
        <div className="mb-8">
          <PhaseDisplay />
        </div>

        {/* Advanced Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Portfolio Value"
            value={`$${totalPortfolioValue.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            description={`${seniorTokenAmount.toFixed(2)} SENIOR + ${juniorTokenAmount.toFixed(2)} JUNIOR`}
            className="transition-all duration-300"
          />
          <StatCard
            title="SENIOR Price"
            value={`$${seniorPrice}`}
            icon={<Shield className="h-5 w-5" />}
            description="Priority claims token"
            className="transition-all duration-300"
          />
          <StatCard
            title="JUNIOR Price"
            value={`$${juniorPrice}`}
            icon={<Coins className="h-5 w-5" />}
            description="Higher yield token"
            className="transition-all duration-300"
          />
          <StatCard
            title="Pool Liquidity"
            value={poolReserves.senior === '0' && poolReserves.junior === '0' ? 'Loading...' : `$${((parseFloat(poolReserves.senior)) + (parseFloat(poolReserves.junior))).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            icon={<Activity className="h-5 w-5" />}
            description={`${(parseFloat(poolReserves.senior) / 1000).toFixed(3)}K SENIOR / ${(parseFloat(poolReserves.junior) / 1000).toFixed(3)}K JUNIOR`}
            className="transition-all duration-300"
          />
        </div>

        {/* Manual Risk Trading */}
        <div className="mb-8">
          <Trade />
        </div>

        {/* Advanced Protocol Actions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Advanced Protocol Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Issue Risk Tokens */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Issue Risk Tokens</CardTitle>
                <CardDescription className="text-slate-300">
                  Deposit assets to receive CM-SENIOR and CM-JUNIOR tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Number(vaultInfo.currentPhase) !== Phase.DEPOSIT ? (
                  <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Deposits are only allowed during the Deposit phase. Current phase: {Phase[vaultInfo.currentPhase]}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div>
                      <Label className="text-slate-300 mb-3 block">Select Asset</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setDepositAssetType('aUSDC')}
                          className={`p-3 rounded-lg border transition-all ${
                            depositAssetType === 'aUSDC'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">aUSDC</div>
                            <div className="text-sm opacity-80">Balance: {formatTokenAmount(balances.aUSDC)}</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setDepositAssetType('cUSDT')}
                          className={`p-3 rounded-lg border transition-all ${
                            depositAssetType === 'cUSDT'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">cUSDT</div>
                            <div className="text-sm opacity-80">Balance: {formatTokenAmount(balances.cUSDT)}</div>
                          </div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="deposit-amount" className="text-slate-300">Amount</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        placeholder="0.0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={!isConnected}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                    <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You will receive {depositAmount ? (parseFloat(depositAmount) / 2) : '0'} CM-SENIOR and {depositAmount ? (parseFloat(depositAmount) / 2) : '0'} CM-JUNIOR tokens
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={handleDeposit} 
                      disabled={!isConnected || !depositAmount || parseFloat(depositAmount) <= 0 || Number(vaultInfo.currentPhase) !== Phase.DEPOSIT}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Deposit {depositAssetType}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Optimal Asset Redemption */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Optimal Asset Redemption</CardTitle>
                <CardDescription className="text-slate-300">
                  Choose target asset and amount - system calculates optimal token usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Asset Selection */}
                <div>
                  <Label className="text-slate-300 mb-3 block">Target Asset</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedWithdrawAsset('aUSDC')}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedWithdrawAsset === 'aUSDC'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">aUSDC</div>
                        <div className="text-sm opacity-80">Aave USDC</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedWithdrawAsset('cUSDT')}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedWithdrawAsset === 'cUSDT'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">cUSDT</div>
                        <div className="text-sm opacity-80">Compound USDT</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                {selectedWithdrawAsset && (
                  <div>
                    <Label htmlFor="withdraw-amount" className="text-slate-300">
                      Target Amount ({selectedWithdrawAsset})
                    </Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.0"
                      value={withdrawAssetAmount}
                      onChange={(e) => setWithdrawAssetAmount(e.target.value)}
                      disabled={!isConnected}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                )}

                {/* Automatic Token Allocation Display */}
                {selectedWithdrawAsset && withdrawAssetAmount && parseFloat(withdrawAssetAmount) > 0 && (
                  <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">Optimal Token Allocation:</div>
                        <div className="text-sm space-y-1">
                          <div>Senior Tokens: {calculatedTokenAmounts.senior}</div>
                          <div>Junior Tokens: {calculatedTokenAmounts.junior}</div>
                          <div className="text-xs text-slate-400 mt-2">
                            {effectivePhase === Phase.DEPOSIT
                              ? 'Deposit phase: Using equal amounts of senior and junior tokens'
                              : effectivePhase === Phase.CLAIMS
                              ? 'Claims phase: Using senior tokens only'
                              : 'Using max junior tokens first, then senior tokens'}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleOptimalWithdraw} 
                  disabled={!isConnected || !selectedWithdrawAsset || !withdrawAssetAmount || parseFloat(withdrawAssetAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Redeem Optimally
                </Button>
              </CardContent>
            </Card>

            {/* Add Liquidity */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Droplets className="w-5 h-5 mr-2" />
                  Add Liquidity
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Provide liquidity to earn trading fees. Choose optimal or manual mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Selection */}
                <div>
                  <Label className="text-slate-300 mb-3 block">Liquidity Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLiquidityMode('optimal')}
                      className={`p-3 rounded-lg border transition-all ${
                        liquidityMode === 'optimal'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">Optimal</div>
                        <div className="text-sm opacity-80">Auto-calculate amounts</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setLiquidityMode('manual')}
                      className={`p-3 rounded-lg border transition-all ${
                        liquidityMode === 'manual'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">Manual</div>
                        <div className="text-sm opacity-80">Set custom amounts</div>
                      </div>
                    </button>
                  </div>
                </div>

                {liquidityMode === 'optimal' ? (
                  <div className="space-y-4">
                    {/* Available Tokens Display */}
                    <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Available tokens:</p>
                          <p className="text-slate-300 text-sm">
                            {seniorTokenAmount.toFixed(4)} SENIOR + {juniorTokenAmount.toFixed(4)} JUNIOR
                          </p>
                          <p className="text-slate-300 text-xs opacity-80">
                            Will add optimal amounts to match pool ratio
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleOptimalLiquidity}
                        disabled={!isConnected || (seniorTokenAmount <= 0 && juniorTokenAmount <= 0)}
                        className="w-full bg-blue-600/20 border border-blue-500 text-blue-300 hover:bg-blue-600/30"
                      >
                        Preview Optimal Amounts
                      </Button>
                      
                      {(liquiditySeniorAmount || liquidityJuniorAmount) && (
                        <Button
                          onClick={handleAddLiquidity}
                          disabled={!isConnected || !liquiditySeniorAmount || !liquidityJuniorAmount}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <Droplets className="w-4 h-4 mr-2" />
                          Add Liquidity
                        </Button>
                      )}
                    </div>

                    {/* Show calculated amounts */}
                    {(liquiditySeniorAmount || liquidityJuniorAmount) && (
                      <Alert className="bg-blue-900/20 border-blue-600 text-blue-300">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-semibold">Ready to add:</div>
                            <div className="text-sm">
                              {liquiditySeniorAmount} SENIOR + {liquidityJuniorAmount} JUNIOR
                            </div>
                            <div className="text-xs opacity-80">
                              These amounts match the current pool ratio for optimal liquidity provision
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Manual Input */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">SENIOR Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={liquiditySeniorAmount}
                          onChange={(e) => setLiquiditySeniorAmount(e.target.value)}
                          disabled={!isConnected}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                        />
                        <p className="text-sm text-slate-400 mt-1">
                          Balance: {formatTokenAmount(balances.seniorTokens)}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-slate-300">JUNIOR Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={liquidityJuniorAmount}
                          onChange={(e) => setLiquidityJuniorAmount(e.target.value)}
                          disabled={!isConnected}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                        />
                        <p className="text-sm text-slate-400 mt-1">
                          Balance: {formatTokenAmount(balances.juniorTokens)}
                        </p>
                      </div>
                    </div>

                    {liquiditySeniorAmount && liquidityJuniorAmount && (
                      <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          You'll receive LP tokens proportional to your share of the pool
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleAddLiquidity}
                      disabled={!isConnected || !liquiditySeniorAmount || !liquidityJuniorAmount || parseFloat(liquiditySeniorAmount) <= 0 || parseFloat(liquidityJuniorAmount) <= 0}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Add Liquidity
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Remove Liquidity */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Minus className="w-5 h-5 mr-2" />
                  Remove Liquidity
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Remove liquidity from the SENIOR/JUNIOR pool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">LP Token Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={removeLiquidityAmount}
                    onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
                    disabled={!isConnected}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                  <p className="text-sm text-slate-400 mt-1">
                    LP Balance: {formatTokenAmount(balances.lpTokens)}
                  </p>
                </div>

                {removeLiquidityAmount && parseFloat(removeLiquidityAmount) > 0 && (
                  <Alert className="bg-slate-700/50 border-slate-600 text-slate-300">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      You'll receive proportional amounts of SENIOR and JUNIOR tokens
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleRemoveLiquidity}
                  disabled={!isConnected || !removeLiquidityAmount || parseFloat(removeLiquidityAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Remove Liquidity
                </Button>
              </CardContent>
            </Card>

            {/* Emergency Withdrawal */}
            {vaultInfo.emergencyMode && (
              <Card className="bg-red-900/20 border-red-700 backdrop-blur-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-red-400">Emergency Withdrawal</CardTitle>
                  <CardDescription className="text-red-300">
                    Emergency mode is active. Senior token holders can withdraw with preferred asset.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency-amount" className="text-slate-300">CM-SENIOR Amount</Label>
                      <Input
                        id="emergency-amount"
                        type="number"
                        placeholder="0.0"
                        value={emergencyAmount}
                        onChange={(e) => setEmergencyAmount(e.target.value)}
                        disabled={!isConnected}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 mb-3 block">Preferred Asset</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPreferredAsset('aUSDC')}
                          className={`p-3 rounded-lg border transition-all ${
                            preferredAsset === 'aUSDC'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">aUSDC</div>
                            <div className="text-sm opacity-80">Aave USDC</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setPreferredAsset('cUSDT')}
                          className={`p-3 rounded-lg border transition-all ${
                            preferredAsset === 'cUSDT'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">cUSDT</div>
                            <div className="text-sm opacity-80">Compound USDT</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleEmergencyWithdraw} 
                    disabled={!isConnected || !emergencyAmount}
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Emergency Withdraw
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Smart Liquidity Suggestion */}
        <SmartLiquiditySuggestion
          isVisible={showLiquiditySuggestion}
          seniorValue={seniorTokenAmount}
          juniorValue={juniorTokenAmount}
          isExecuting={false}
          isConnected={isConnected}
          onAddLiquidity={handleAddLiquidity}
          onDismiss={() => setShowLiquiditySuggestion(false)}
        />

        {/* Advanced Portfolio Analytics */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Advanced Portfolio Analytics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Current Positions</CardTitle>
                <CardDescription className="text-slate-300">Detailed breakdown of your holdings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">SENIOR</p>
                      <p className="text-slate-400 text-sm">Priority claims</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatTokenAmount(balances.seniorTokens)}</p>
                    <p className="text-slate-400 text-sm">Value: ${(seniorTokenAmount * parseFloat(seniorPrice)).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">JUNIOR</p>
                      <p className="text-slate-400 text-sm">Higher upside</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatTokenAmount(balances.juniorTokens)}</p>
                    <p className="text-slate-400 text-sm">Value: ${(juniorTokenAmount * parseFloat(juniorPrice)).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <Droplets className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">LP TOKENS</p>
                      <p className="text-slate-400 text-sm">Liquidity provider</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatTokenAmount(balances.lpTokens)}</p>
                    <p className="text-slate-400 text-sm">Pool share</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Protocol Status</CardTitle>
                <CardDescription className="text-slate-300">Current protocol information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Current Phase:</span>
                  <span className="text-white font-medium">{vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Emergency Mode:</span>
                  <span className={`font-medium ${vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                    {vaultInfo.emergencyMode ? '🚨 Active' : '✅ Inactive'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total TVL:</span>
                  <span className="text-white font-medium">${((Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Your Share:</span>
                  <span className="text-white font-medium">
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

export default React.memo(Advanced);