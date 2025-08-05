import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Droplets,
  Minus,
  RefreshCw,
  Info,
  Plus,
} from 'lucide-react';

interface AdvancedFeaturesProps {
  seniorBalance: number;
  juniorBalance: number;
  lpBalance: number;
  formatNumber: (num: number, decimals?: number) => string;
  isExecuting: boolean;
  vaultInfo: any;
  onAddLiquidity: (seniorAmount: string, juniorAmount: string) => void;
  onRemoveLiquidity: (amount: string) => void;
  onEmergencyWithdraw: (amount: string, asset: 'aUSDC' | 'cUSDT') => void;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({
  seniorBalance,
  juniorBalance,
  lpBalance,
  formatNumber,
  isExecuting,
  vaultInfo,
  onAddLiquidity,
  onRemoveLiquidity,
  onEmergencyWithdraw,
}) => {
  const [liquiditySeniorAmount, setLiquiditySeniorAmount] = useState('');
  const [liquidityJuniorAmount, setLiquidityJuniorAmount] = useState('');
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('');
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [preferredAsset, setPreferredAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');

  const handleAddLiquidity = () => {
    if (!liquiditySeniorAmount || !liquidityJuniorAmount) return;
    onAddLiquidity(liquiditySeniorAmount, liquidityJuniorAmount);
    setLiquiditySeniorAmount('');
    setLiquidityJuniorAmount('');
  };

  const handleRemoveLiquidity = () => {
    if (!removeLiquidityAmount) return;
    onRemoveLiquidity(removeLiquidityAmount);
    setRemoveLiquidityAmount('');
  };

  const handleEmergencyWithdraw = () => {
    if (!emergencyAmount) return;
    onEmergencyWithdraw(emergencyAmount, preferredAsset);
    setEmergencyAmount('');
  };

  const handleOptimalLiquidity = () => {
    // Use equal amounts for simplicity - could be enhanced with pool ratio logic
    const maxAmount = Math.min(seniorBalance, juniorBalance);
    setLiquiditySeniorAmount(maxAmount.toFixed(6));
    setLiquidityJuniorAmount(maxAmount.toFixed(6));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Add Liquidity */}
      <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
        <CardHeader>
          <CardTitle className="text-white flex items-center font-semibold">
            <Droplets className="w-5 h-5 mr-2" />
            Add Liquidity
          </CardTitle>
          <CardDescription className="text-slate-200">
            Provide liquidity to earn trading fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-3 bg-slate-700/30 rounded-lg border border-slate-600">
            <p className="text-white font-medium">Available tokens:</p>
            <p className="text-slate-300 text-sm">
              {formatNumber(seniorBalance, 4)} SENIOR + {formatNumber(juniorBalance, 4)} JUNIOR
            </p>
          </div>

          <Button
            onClick={handleOptimalLiquidity}
            disabled={seniorBalance <= 0 && juniorBalance <= 0}
            className="w-full bg-blue-600/20 border border-blue-500 text-blue-300 hover:bg-blue-600/30"
          >
            Preview Optimal Amounts
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-200 font-medium mb-2 block">SENIOR Amount</Label>
              <Input
                type="number"
                placeholder="0.0"
                value={liquiditySeniorAmount}
                onChange={(e) => setLiquiditySeniorAmount(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
              <p className="text-sm text-slate-400 mt-1">
                Balance: {formatNumber(seniorBalance)}
              </p>
            </div>
            
            <div>
              <Label className="text-slate-200 font-medium mb-2 block">JUNIOR Amount</Label>
              <Input
                type="number"
                placeholder="0.0"
                value={liquidityJuniorAmount}
                onChange={(e) => setLiquidityJuniorAmount(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
              <p className="text-sm text-slate-400 mt-1">
                Balance: {formatNumber(juniorBalance)}
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
            disabled={!liquiditySeniorAmount || !liquidityJuniorAmount || parseFloat(liquiditySeniorAmount) <= 0 || parseFloat(liquidityJuniorAmount) <= 0 || isExecuting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </div>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Liquidity
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Remove Liquidity */}
      <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
        <CardHeader>
          <CardTitle className="text-white flex items-center font-semibold">
            <Minus className="w-5 h-5 mr-2" />
            Remove Liquidity
          </CardTitle>
          <CardDescription className="text-slate-200">
            Remove liquidity from the SENIOR/JUNIOR pool
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
            <p className="text-sm text-slate-300 mb-1 font-medium">Current LP Position</p>
            <p className="text-xl font-bold text-purple-400">{formatNumber(lpBalance)} LP</p>
            <p className="text-xs text-slate-400 font-medium">Pool share tokens</p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 font-medium">LP Token Amount</Label>
            <Input
              type="number"
              placeholder="0.0"
              value={removeLiquidityAmount}
              onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
            />
            <p className="text-sm text-slate-400 mt-1">
              LP Balance: {formatNumber(lpBalance)}
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
            disabled={!removeLiquidityAmount || parseFloat(removeLiquidityAmount) <= 0 || isExecuting}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </div>
            ) : (
              'Remove Liquidity'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Withdrawal */}
      {vaultInfo.emergencyMode && (
        <Card className="bg-red-900/20 border-red-700 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-red-400">Emergency Withdrawal</CardTitle>
            <CardDescription className="text-red-300">
              Emergency mode is active. Senior token holders can withdraw with preferred asset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="emergency-amount" className="text-slate-300 font-medium mb-2 block">CM-SENIOR Amount</Label>
                <Input
                  id="emergency-amount"
                  type="number"
                  placeholder="0.0"
                  value={emergencyAmount}
                  onChange={(e) => setEmergencyAmount(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block font-medium">Preferred Asset</Label>
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
              disabled={!emergencyAmount || isExecuting}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isExecuting ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                'Emergency Withdraw'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFeatures;