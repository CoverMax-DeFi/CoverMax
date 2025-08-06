import React, { useState } from 'react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  TrendingUp,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Phase } from '@/config/contracts';
import StatCard from '@/components/StatCard';

// Import custom hooks
import { usePricing } from '@/hooks/usePricing';
import { usePortfolioCalculations } from '@/hooks/usePortfolioCalculations';

// Import dashboard components
import PortfolioOverview from '@/components/dashboard/PortfolioOverview';
import DepositStrategies from '@/components/dashboard/DepositStrategies';
import PositionManagement from '@/components/dashboard/PositionManagement';
import AdvancedFeatures from '@/components/dashboard/AdvancedFeatures';
import MarketOverview from '@/components/dashboard/MarketOverview';

const Dashboard = () => {
  const {
    isConnected,
    vaultInfo,
    depositAsset,
    withdraw,
    emergencyWithdraw,
    swapExactTokensForTokens,
    getAmountsOut,
    seniorTokenAddress,
    juniorTokenAddress,
    stakeRiskTokens,
    unstakeRiskTokens,
    refreshData,
    getTokenBalance,
  } = useWeb3();

  // Custom hooks for pricing and calculations
  const { seniorPrice, juniorPrice, poolReserves } = usePricing();
  const {
    formatNumber,
    seniorBalance,
    juniorBalance,
    aUSDCBalance,
    cUSDTBalance,
    lpBalance,
    totalPortfolioValue,
    protocolTVL,
    userSharePercent,
    riskProfile,
  } = usePortfolioCalculations(seniorPrice, juniorPrice);

  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [isExecuting, setIsExecuting] = useState(false);

  // Strategy execution
  const executeStrategy = async (strategy: 'safety' | 'upside' | 'balanced', amount: string, asset: 'aUSDC' | 'cUSDT') => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsExecuting(true);
    try {
      // First deposit to get tokens
      await depositAsset(asset, amount);

      if (strategy === 'safety') {
        // Convert all junior to senior
        const freshJuniorBalance = await getTokenBalance(juniorTokenAddress!);
        if (Number(freshJuniorBalance) > 0) {
          const path = [juniorTokenAddress!, seniorTokenAddress!];
          const balanceString = formatNumber(Number(freshJuniorBalance) / 1e18, 18);
          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18);
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      } else if (strategy === 'upside') {
        // Convert all senior to junior
        const freshSeniorBalance = await getTokenBalance(seniorTokenAddress!);
        if (Number(freshSeniorBalance) > 0) {
          const path = [seniorTokenAddress!, juniorTokenAddress!];
          const balanceString = formatNumber(Number(freshSeniorBalance) / 1e18, 18);
          const estimate = await getAmountsOut(balanceString, path);
          const minOutput = (parseFloat(estimate) * 0.95).toFixed(18);
          await swapExactTokensForTokens(balanceString, minOutput, path);
        }
      }
      // For balanced, keep 50/50 split from deposit

      await refreshData();
    } catch (error) {
      console.error('Strategy execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Rebalancing handler
  const handleRebalance = async (targetPercent: number) => {
    if (!seniorTokenAddress || !juniorTokenAddress || !swapExactTokensForTokens || !getAmountsOut) return;

    const currentSeniorPercent = riskProfile.percentage;
    const percentDiff = targetPercent - currentSeniorPercent;

    if (Math.abs(percentDiff) < 1) return;

    setIsExecuting(true);
    try {
      let amountIn: string;
      let path: string[];

      if (targetPercent === 100) {
        amountIn = juniorBalance.toFixed(18);
        path = [juniorTokenAddress, seniorTokenAddress];
      } else if (targetPercent === 0) {
        amountIn = seniorBalance.toFixed(18);
        path = [seniorTokenAddress, juniorTokenAddress];
      } else if (percentDiff > 0) {
        const totalTokens = seniorBalance + juniorBalance;
        const targetSeniorAmount = (totalTokens * targetPercent) / 100;
        const seniorNeeded = targetSeniorAmount - seniorBalance;
        const juniorToSwap = Math.min(seniorNeeded / parseFloat(juniorPrice), juniorBalance);
        amountIn = juniorToSwap.toFixed(18);
        path = [juniorTokenAddress, seniorTokenAddress];
      } else {
        const totalTokens = seniorBalance + juniorBalance;
        const targetJuniorAmount = (totalTokens * (100 - targetPercent)) / 100;
        const juniorNeeded = targetJuniorAmount - juniorBalance;
        const seniorToSwap = Math.min(juniorNeeded * parseFloat(juniorPrice), seniorBalance);
        amountIn = seniorToSwap.toFixed(18);
        path = [seniorTokenAddress, juniorTokenAddress];
      }

      if (parseFloat(amountIn) > 0) {
        const amountsOut = await getAmountsOut(amountIn, path);
        const minAmountOut = (parseFloat(amountsOut) * 0.95).toFixed(18);
        await swapExactTokensForTokens(amountIn, minAmountOut, path);
      }

      await refreshData();
    } catch (error) {
      console.error('Rebalancing failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Withdrawal handler
  const handleWithdraw = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsExecuting(true);
    try {
      // Simplified withdrawal logic - could be enhanced with optimal token calculation
      const halfAmount = (parseFloat(amount) / 2).toFixed(6);
      await withdraw(halfAmount, halfAmount);
      await refreshData();
    } catch (error) {
      console.error('Withdrawal failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Risk token staking handlers
  const handleStakeRiskTokens = async (seniorAmount: string, juniorAmount: string) => {
    if (!seniorTokenAddress || !juniorTokenAddress) return;
    setIsExecuting(true);
    try {
      await stakeRiskTokens(seniorAmount, juniorAmount, seniorTokenAddress, juniorTokenAddress);
      await refreshData();
    } catch (error) {
      console.error('Stake risk tokens failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUnstakeRiskTokens = async (amount: string) => {
    if (!seniorTokenAddress || !juniorTokenAddress) return;
    setIsExecuting(true);
    try {
      await unstakeRiskTokens(amount, seniorTokenAddress, juniorTokenAddress);
      await refreshData();
    } catch (error) {
      console.error('Unstake risk tokens failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEmergencyWithdraw = async (amount: string, asset: 'aUSDC' | 'cUSDT') => {
    setIsExecuting(true);
    try {
      await emergencyWithdraw(amount, asset);
      await refreshData();
    } catch (error) {
      console.error('Emergency withdrawal failed:', error);
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

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Portfolio Dashboard</h1>
              <p className="text-slate-300 text-sm md:text-base">
                Smart risk management with tradeable insurance tokens
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Badge
                variant="outline"
                className={`border-${riskProfile.color}-500 text-${riskProfile.color}-400 text-xs md:text-sm`}
              >
                {riskProfile.level} Risk Profile
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatCard
            title="Portfolio Value"
            value={`$${formatNumber(totalPortfolioValue)}`}
            description={`${formatNumber(userSharePercent, 4)}% of protocol`}
            icon={<DollarSign className="w-8 h-8 text-green-400" />}
            className="text-white"
          />

          <StatCard
            title="Senior Tokens"
            value={formatNumber(seniorBalance)}
            description={`$${formatNumber(seniorBalance * parseFloat(seniorPrice))} value`}
            icon={<Shield className="w-8 h-8 text-blue-400" />}
            className="text-blue-400"
          />

          <StatCard
            title="Junior Tokens"
            value={formatNumber(juniorBalance)}
            description={`$${formatNumber(juniorBalance * parseFloat(juniorPrice))} value`}
            icon={<TrendingUp className="w-8 h-8 text-amber-400" />}
            className="text-amber-400"
          />

          <StatCard
            title="Protocol Phase"
            value={vaultInfo.currentPhase !== undefined ? Phase[vaultInfo.currentPhase] : 'Loading...'}
            description={`TVL: $${formatNumber(protocolTVL, 0)}`}
            icon={<Clock className="w-8 h-8 text-purple-400" />}
            className="text-white"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-800/80 border border-slate-600">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Overview</TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Deposit & Trade</TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Manage Positions</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 font-medium">Staking</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <PortfolioOverview
              seniorBalance={seniorBalance}
              juniorBalance={juniorBalance}
              lpBalance={lpBalance}
              seniorPrice={seniorPrice}
              juniorPrice={juniorPrice}
              riskProfile={riskProfile}
              formatNumber={formatNumber}
              protocolTVL={protocolTVL}
              userSharePercent={userSharePercent}
              vaultInfo={vaultInfo}
              onTabChange={setActiveTab}
            />
          </TabsContent>

          {/* Deposit & Trade Tab */}
          <TabsContent value="deposit" className="space-y-4 md:space-y-6">
            <DepositStrategies
              aUSDCBalance={aUSDCBalance}
              cUSDTBalance={cUSDTBalance}
              formatNumber={formatNumber}
              isExecuting={isExecuting}
              onExecuteStrategy={executeStrategy}
            />
          </TabsContent>

          {/* Manage Positions Tab */}
          <TabsContent value="manage" className="space-y-4 md:space-y-6">
            <PositionManagement
              riskProfile={riskProfile}
              totalPortfolioValue={totalPortfolioValue}
              formatNumber={formatNumber}
              isExecuting={isExecuting}
              onRebalance={handleRebalance}
              onWithdraw={handleWithdraw}
              vaultInfo={vaultInfo}
            />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 md:space-y-6">
            <AdvancedFeatures
              seniorBalance={seniorBalance}
              juniorBalance={juniorBalance}
              lpBalance={lpBalance}
              formatNumber={formatNumber}
              isExecuting={isExecuting}
              vaultInfo={vaultInfo}
              onStakeRiskTokens={handleStakeRiskTokens}
              onUnstakeRiskTokens={handleUnstakeRiskTokens}
              onEmergencyWithdraw={handleEmergencyWithdraw}
            />
          </TabsContent>
        </Tabs>

        {/* Market Overview - Always Visible at Bottom */}
        <div className="mt-6 md:mt-8">
          <MarketOverview
            seniorPrice={seniorPrice}
            juniorPrice={juniorPrice}
            poolReserves={poolReserves}
            protocolTVL={protocolTVL}
            formatNumber={formatNumber}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);