import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import { Shield, Info, Wallet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PHASE_NAMES } from '@/config/contracts';

const InsuranceCalculator: React.FC = () => {
  const { 
    isConnected, 
    connectWallet, 
    vaultInfo, 
    balances,
    depositAsset, 
    withdraw, 
    withdrawAll, 
    emergencyWithdraw 
  } = useWeb3();

  // State for form inputs
  const [selectedAsset, setSelectedAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawSeniorAmount, setWithdrawSeniorAmount] = useState('');
  const [withdrawJuniorAmount, setWithdrawJuniorAmount] = useState('');
  const [emergencyWithdrawAmount, setEmergencyWithdrawAmount] = useState('');
  const [preferredAsset, setPreferredAsset] = useState<'aUSDC' | 'cUSDT'>('aUSDC');

  // Calculate values for display
  const seniorTokenValue = Number(balances.seniorTokens) / 1e18;
  const juniorTokenValue = Number(balances.juniorTokens) / 1e18;
  const totalTokenValue = seniorTokenValue + juniorTokenValue;
  const availableBalance = selectedAsset === 'aUSDC' ? Number(balances.aUSDC) / 1e18 : Number(balances.cUSDT) / 1e18;
  const protectionPercentage = totalTokenValue > 0 ? (seniorTokenValue / totalTokenValue) * 100 : 50;

  // Handle deposit
  const handleDeposit = useCallback(async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (amount > availableBalance) {
      alert('Insufficient balance');
      return;
    }

    try {
      await depositAsset(selectedAsset, depositAmount);
      setDepositAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  }, [depositAmount, selectedAsset, availableBalance, depositAsset]);

  // Handle withdraw
  const handleWithdraw = useCallback(async () => {
    const seniorAmount = withdrawSeniorAmount || '0';
    const juniorAmount = withdrawJuniorAmount || '0';

    if (parseFloat(seniorAmount) <= 0 && parseFloat(juniorAmount) <= 0) {
      alert('Please enter a valid amount for at least one token type');
      return;
    }

    if (parseFloat(seniorAmount) > seniorTokenValue) {
      alert('Insufficient senior tokens');
      return;
    }

    if (parseFloat(juniorAmount) > juniorTokenValue) {
      alert('Insufficient junior tokens');
      return;
    }

    try {
      await withdraw(seniorAmount, juniorAmount);
      setWithdrawSeniorAmount('');
      setWithdrawJuniorAmount('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
    }
  }, [withdrawSeniorAmount, withdrawJuniorAmount, seniorTokenValue, juniorTokenValue, withdraw]);

  // Handle withdraw all
  const handleWithdrawAll = useCallback(async () => {
    try {
      await withdrawAll();
    } catch (error) {
      console.error('Withdraw all failed:', error);
    }
  }, [withdrawAll]);

  // Handle emergency withdraw
  const handleEmergencyWithdraw = useCallback(async () => {
    if (!emergencyWithdrawAmount || parseFloat(emergencyWithdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(emergencyWithdrawAmount);
    if (amount > seniorTokenValue) {
      alert('Insufficient senior tokens');
      return;
    }

    try {
      await emergencyWithdraw(emergencyWithdrawAmount, preferredAsset);
      setEmergencyWithdrawAmount('');
    } catch (error) {
      console.error('Emergency withdraw failed:', error);
    }
  }, [emergencyWithdrawAmount, preferredAsset, seniorTokenValue, emergencyWithdraw]);

  const [severity, setSeverity] = useState("100");
  const severityPercentage = useMemo(() => parseInt(severity), [severity]);

  // Calculate emergency scenario outcomes based on severity
  // Senior tokens are always fully recovered
  const emergencyProtectedAmount = seniorTokenValue;

  // Junior tokens recovery is inversely proportional to severity
  const juniorTokenRecoveryRate = Math.max(0, 1 - (severityPercentage / 100));
  const emergencyUnprotectedAmount = juniorTokenValue * juniorTokenRecoveryRate;

  // Calculate total recovery and loss
  const totalRecoveredValue = emergencyProtectedAmount + emergencyUnprotectedAmount;
  const totalPossibleLoss = juniorTokenValue * (severityPercentage / 100);

  // Potential loss avoided - what senior tokens save compared to having only junior tokens
  const lossAvoided = emergencyProtectedAmount - (seniorTokenValue * juniorTokenRecoveryRate);

  if (!isConnected) {
    return (
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Connect Your Wallet</CardTitle>
          <CardDescription className="text-slate-300">
            Connect your wallet to start using the vault and managing your tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connectWallet} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">CoverMax Operations</CardTitle>
        <CardDescription className="text-slate-300">
          Current Phase: {PHASE_NAMES[vaultInfo.currentPhase]} 
          {vaultInfo.emergencyMode && <span className="text-red-400 ml-2">(Emergency Mode Active)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Position */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-sm font-medium mb-2 flex items-center text-white">
              <Shield className="h-4 w-4 mr-1 text-blue-400" />
              Senior Tokens (Priority)
            </h3>
            <p className="text-xl font-semibold text-white">{seniorTokenValue.toFixed(4)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {protectionPercentage.toFixed(1)}% of your position
            </p>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-sm font-medium mb-2 flex items-center text-white">
              <Shield className="h-4 w-4 mr-1 text-amber-400" strokeWidth={1} />
              Junior Tokens (Subordinate)
            </h3>
            <p className="text-xl font-semibold text-white">{juniorTokenValue.toFixed(4)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {(100 - protectionPercentage).toFixed(1)}% of your position
            </p>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium mb-3 text-white">Deposit Assets</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Select value={selectedAsset} onValueChange={(value: 'aUSDC' | 'cUSDT') => setSelectedAsset(value)}>
                <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="aUSDC" className="text-white hover:bg-slate-700">aUSDC</SelectItem>
                  <SelectItem value="cUSDT" className="text-white hover:bg-slate-700">cUSDT</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 bg-slate-700/50 border-slate-600 text-white"
              />
              <Button onClick={handleDeposit} className="bg-green-600 hover:bg-green-700">
                Deposit
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Available: {availableBalance.toFixed(4)} {selectedAsset}
            </p>
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium mb-3 text-white">Withdraw Tokens</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Senior Tokens</Label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={withdrawSeniorAmount}
                  onChange={(e) => setWithdrawSeniorAmount(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Junior Tokens</Label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={withdrawJuniorAmount}
                  onChange={(e) => setWithdrawJuniorAmount(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleWithdraw} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Withdraw
              </Button>
              <Button onClick={handleWithdrawAll} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Withdraw All
              </Button>
            </div>
          </div>
        </div>

        {/* Emergency Withdraw Section */}
        {vaultInfo.emergencyMode && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-medium mb-3 text-red-400">Emergency Withdraw (Senior Only)</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Select value={preferredAsset} onValueChange={(value: 'aUSDC' | 'cUSDT') => setPreferredAsset(value)}>
                  <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="aUSDC" className="text-white hover:bg-slate-700">aUSDC</SelectItem>
                    <SelectItem value="cUSDT" className="text-white hover:bg-slate-700">cUSDT</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Senior tokens"
                  value={emergencyWithdrawAmount}
                  onChange={(e) => setEmergencyWithdrawAmount(e.target.value)}
                  className="flex-1 bg-slate-700/50 border-slate-600 text-white"
                />
                <Button onClick={handleEmergencyWithdraw} className="bg-red-600 hover:bg-red-700">
                  Emergency Withdraw
                </Button>
              </div>
              <p className="text-xs text-red-400">
                Emergency mode active - senior tokens get priority withdrawal
              </p>
            </div>
          </div>
        )}

        {/* Emergency Scenario Analysis */}
        <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-700 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-amber-400">Emergency Scenario Analysis</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={16} className="text-amber-500" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
                  <p className="max-w-xs text-sm">
                    See how much you'd recover in different emergency scenarios. Senior tokens get priority withdrawal.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="mb-3">
            <Label htmlFor="severity" className="text-sm text-amber-400 mb-1 block">
              Emergency Severity:
            </Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity" className="w-full bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="25" className="text-white hover:bg-slate-700">25% - Minor Loss</SelectItem>
                <SelectItem value="50" className="text-white hover:bg-slate-700">50% - Moderate Loss</SelectItem>
                <SelectItem value="75" className="text-white hover:bg-slate-700">75% - Major Loss</SelectItem>
                <SelectItem value="100" className="text-white hover:bg-slate-700">100% - Total Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-300">Senior tokens recovered</span>
              <span className="font-medium text-white">{emergencyProtectedAmount.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-300">Junior tokens recovered</span>
              <span className="font-medium text-white">{emergencyUnprotectedAmount.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-amber-600">
              <span className="text-amber-300">Total recovered</span>
              <span className="text-white">{totalRecoveredValue.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm text-amber-400 mt-2">
              <span>Benefit of senior tokens</span>
              <span>{lossAvoided.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsuranceCalculator;