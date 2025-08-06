import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  TrendingUp,
  Activity,
  Target,
  Info,
  RefreshCw,
} from 'lucide-react';

interface DepositStrategiesProps {
  aUSDCBalance: number;
  cUSDTBalance: number;
  formatNumber: (num: number, decimals?: number) => string;
  isExecuting: boolean;
  onExecuteStrategy: (strategy: 'safety' | 'upside' | 'balanced', amount: string, asset: 'aUSDC' | 'cUSDT') => void;
}

const DepositStrategies: React.FC<DepositStrategiesProps> = ({
  aUSDCBalance,
  cUSDTBalance,
  formatNumber,
  isExecuting,
  onExecuteStrategy,
}) => {
  const [activeStrategy, setActiveStrategy] = useState<'safety' | 'upside' | 'balanced'>('balanced');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');

  const handleExecute = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onExecuteStrategy(activeStrategy, amount, selectedAsset);
    setAmount('');
  };

  return (
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer transition-all ${
              activeStrategy === 'safety'
                ? 'ring-2 ring-blue-500 bg-blue-900/30 border-blue-500'
                : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70'
            }`}
            onClick={() => setActiveStrategy('safety')}
          >
            <CardContent className="p-3 text-center">
              <Shield className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <h3 className="font-semibold text-white text-sm mb-1">Max Safety</h3>
              <p className="text-xs text-slate-300 mb-2">All funds → Senior tokens</p>
              <Badge variant="outline" className="border-blue-500 text-blue-300 text-xs">
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
            <CardContent className="p-3 text-center">
              <Activity className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <h3 className="font-semibold text-white text-sm mb-1">Balanced</h3>
              <p className="text-xs text-slate-300 mb-2">50% Senior / 50% Junior</p>
              <Badge variant="outline" className="border-purple-500 text-purple-300 text-xs">
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
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <h3 className="font-semibold text-white text-sm mb-1">Max Upside</h3>
              <p className="text-xs text-slate-300 mb-2">All funds → Junior tokens</p>
              <Badge variant="outline" className="border-amber-500 text-amber-300 text-xs">
                Higher Returns
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Deposit Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-200 mb-2 block font-medium">Select Asset</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedAsset('aUSDC')}
                className={`p-3 rounded-lg border transition-all ${
                  selectedAsset === 'aUSDC'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">aUSDC</div>
                  <div className="text-xs opacity-90">Aave USDC</div>
                  <div className="text-xs mt-1 font-medium">Balance: {formatNumber(aUSDCBalance, 2)}</div>
                </div>
              </button>
              <button
                onClick={() => setSelectedAsset('cUSDT')}
                className={`p-3 rounded-lg border transition-all ${
                  selectedAsset === 'cUSDT'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">cUSDT</div>
                  <div className="text-xs opacity-90">Compound USDT</div>
                  <div className="text-xs mt-1 font-medium">Balance: {formatNumber(cUSDTBalance, 2)}</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-slate-200 mb-2 block font-medium">Deposit Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white"
            />
            <div className="flex justify-between mt-2 text-sm text-slate-300">
              <span className="font-medium">Available: {formatNumber(selectedAsset === 'aUSDC' ? aUSDCBalance : cUSDTBalance, 2)}</span>
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
          onClick={handleExecute}
          disabled={!amount || parseFloat(amount) <= 0 || isExecuting}
          className="w-full font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
  );
};

export default DepositStrategies;
