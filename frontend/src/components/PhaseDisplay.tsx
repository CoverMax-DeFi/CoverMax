import React, { useEffect, useState } from 'react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import { PHASE_NAMES, Phase } from '@/config/contracts';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Shield, FileText } from 'lucide-react';

const PhaseDisplay: React.FC = () => {
  const { vaultInfo } = useWeb3();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Number(vaultInfo.timeRemaining);
      if (remaining <= 0) {
        setTimeRemaining('Phase ending...');
        setProgress(100);
        return;
      }

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m `;
      timeStr += `${seconds}s`;

      setTimeRemaining(timeStr);

      // Calculate progress based on phase duration
      const phaseDurations: { [key: number]: number } = {
        [Phase.DEPOSIT]: 2 * 24 * 60 * 60,
        [Phase.COVERAGE]: 3 * 24 * 60 * 60,
        [Phase.CLAIMS]: 1 * 24 * 60 * 60,
        [Phase.FINAL_CLAIMS]: 1 * 24 * 60 * 60,
      };

      const duration = phaseDurations[vaultInfo.currentPhase] || 1;
      const elapsed = duration - remaining;
      setProgress((elapsed / duration) * 100);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [vaultInfo.timeRemaining, vaultInfo.currentPhase]);

  const getPhaseIcon = () => {
    switch (vaultInfo.currentPhase) {
      case Phase.DEPOSIT:
        return <FileText className="h-5 w-5" />;
      case Phase.COVERAGE:
        return <Shield className="h-5 w-5" />;
      case Phase.CLAIMS:
      case Phase.FINAL_CLAIMS:
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getPhaseColor = () => {
    switch (vaultInfo.currentPhase) {
      case Phase.DEPOSIT:
        return 'bg-green-500';
      case Phase.COVERAGE:
        return 'bg-blue-500';
      case Phase.CLAIMS:
        return 'bg-orange-500';
      case Phase.FINAL_CLAIMS:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPhaseDescription = () => {
    switch (vaultInfo.currentPhase) {
      case Phase.DEPOSIT:
        return 'Users can deposit aUSDC or cUSDT to receive CM-SENIOR and CM-JUNIOR tokens';
      case Phase.COVERAGE:
        return 'Coverage is active. Tokens are locked and earning yield';
      case Phase.CLAIMS:
        return 'Senior token holders can withdraw their funds';
      case Phase.FINAL_CLAIMS:
        return 'All token holders can withdraw remaining funds';
      default:
        return '';
    }
  };

  return (
    <Card className="p-6 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getPhaseColor()} text-white`}>
              {getPhaseIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {PHASE_NAMES[vaultInfo.currentPhase as Phase]}
              </h3>
              <p className="text-sm text-slate-400">Current Protocol Phase</p>
            </div>
          </div>
          {vaultInfo.emergencyMode && (
            <Badge variant="destructive" className="animate-pulse bg-red-600 hover:bg-red-700">
              Emergency Mode Active
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Time Remaining</span>
            <span className="font-medium text-white">{timeRemaining}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <p className="text-sm text-slate-300">{getPhaseDescription()}</p>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <p className="text-sm text-slate-400">Vault TVL</p>
            <p className="text-lg font-semibold text-white">
              ${((Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Tokens Issued</p>
            <p className="text-lg font-semibold text-white">
              {(Number(vaultInfo.totalTokensIssued) / 1e18).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PhaseDisplay;