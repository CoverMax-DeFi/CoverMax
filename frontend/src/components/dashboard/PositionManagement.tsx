import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Phase } from '@/config/contracts';
import {
  Activity,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  AlertCircle,
} from 'lucide-react';

interface PositionManagementProps {
  riskProfile: { percentage: number };
  totalPortfolioValue: number;
  formatNumber: (num: number, decimals?: number) => string;
  isExecuting: boolean;
  onRebalance: (targetPercent: number) => void;
  onWithdraw: (asset: 'aUSDC' | 'cUSDT', amount: string) => void;
  vaultInfo: any;
}

const PositionManagement: React.FC<PositionManagementProps> = ({
  riskProfile,
  totalPortfolioValue,
  formatNumber,
  isExecuting,
  onRebalance,
  onWithdraw,
  vaultInfo,
}) => {
  const [targetSeniorPercent, setTargetSeniorPercent] = useState(50);
  const [isRebalancePreview, setIsRebalancePreview] = useState(false);
  const [selectedWithdrawAsset, setSelectedWithdrawAsset] = useState<'aUSDC' | 'cUSDT' | null>(null);
  const [withdrawAssetAmount, setWithdrawAssetAmount] = useState('');

  // Initialize target percent to current allocation
  useEffect(() => {
    setTargetSeniorPercent(Math.round(riskProfile.percentage));
  }, [riskProfile.percentage]);

  const handleRebalancePreview = (targetPercent: number) => {
    setTargetSeniorPercent(targetPercent);
    setIsRebalancePreview(true);
  };

  const handleRebalanceExecute = () => {
    onRebalance(targetSeniorPercent);
    setIsRebalancePreview(false);
  };

  const handleWithdrawExecute = () => {
    if (!selectedWithdrawAsset || !withdrawAssetAmount) return;
    onWithdraw(selectedWithdrawAsset, withdrawAssetAmount);
    setSelectedWithdrawAsset(null);
    setWithdrawAssetAmount('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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

          {/* Target Allocation Buttons */}
          <div className="space-y-3">
            <Label className="text-slate-200 font-medium">Set Target Allocation</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[0, 25, 50, 75, 100].map((percent) => (
                <Button
                  key={percent}
                  variant={targetSeniorPercent === percent ? "default" : "outline"}
                  size="sm"
                  className={`${
                    targetSeniorPercent === percent 
                      ? "bg-blue-600 text-white" 
                      : "border-slate-600 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700"
                  } text-xs sm:text-sm min-h-[2.5rem]`}
                  onClick={() => handleRebalancePreview(percent)}
                >
                  <span className="text-center">{percent}%<br/>Protection</span>
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium px-2">
              <span className="text-center">Max Risk</span>
              <span className="text-center hidden sm:block">Balanced</span>
              <span className="text-center">Max Safety</span>
            </div>
          </div>

          {/* Action Buttons */}
          {isRebalancePreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                onClick={handleRebalanceExecute}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Rebalancing...
                  </div>
                ) : (
                  'Execute Rebalance'
                )}
              </Button>
            </div>
          ) : (
            <Alert className="bg-blue-900/30 border-blue-500">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                Use the buttons above to set your target allocation. Trades will be executed via AMM.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Withdraw */}
      <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
        <CardHeader>
          <CardTitle className="text-white flex items-center font-semibold">
            <Minus className="w-5 h-5 mr-2" />
            Withdraw
          </CardTitle>
          <CardDescription className="text-slate-200">
            Choose target asset and amount to withdraw from your position
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Asset Selection */}
          <div>
            <Label className="text-slate-200 mb-2 block font-medium">Target Asset</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label htmlFor="withdraw-amount" className="text-slate-200 font-medium">
                Target Amount ({selectedWithdrawAsset})
              </Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="0.0"
                value={withdrawAssetAmount}
                onChange={(e) => setWithdrawAssetAmount(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
              <div className="text-sm text-slate-300 font-medium mt-1">
                Max withdrawable: ${formatNumber(totalPortfolioValue)}
              </div>
            </div>
          )}

          <Button 
            onClick={handleWithdrawExecute}
            disabled={!selectedWithdrawAsset || !withdrawAssetAmount || parseFloat(withdrawAssetAmount) <= 0 || isExecuting}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </div>
            ) : (
              'Redeem Optimally'
            )}
          </Button>

          <Alert className="bg-yellow-900/30 border-yellow-500">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              {vaultInfo.currentPhase === 0 && 'Withdrawals require equal amounts of SENIOR and JUNIOR tokens.'}
              {vaultInfo.currentPhase === 1 && 'Any combination of SENIOR and JUNIOR tokens can be withdrawn.'}
              {vaultInfo.currentPhase === 2 && 'All token holders can withdraw remaining funds with any token combination.'}
              {vaultInfo.currentPhase === undefined && 'Loading withdrawal rules...'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default PositionManagement;