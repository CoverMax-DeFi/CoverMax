import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  TrendingUp,
  Zap,
  Activity,
  Settings,
  Droplets,
  Plus,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface VaultInfo {
  emergencyMode: boolean;
}

interface PortfolioOverviewProps {
  seniorBalance: number;
  juniorBalance: number;
  lpBalance: number;
  seniorPrice: string;
  juniorPrice: string;
  riskProfile: {
    level: string;
    color: string;
    percentage: number;
  };
  formatNumber: (num: number, decimals?: number) => string;
  protocolTVL: number;
  userSharePercent: number;
  vaultInfo: VaultInfo;
  onTabChange: (tab: string) => void;
}

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  seniorBalance,
  juniorBalance,
  lpBalance,
  seniorPrice,
  juniorPrice,
  riskProfile,
  formatNumber,
  protocolTVL,
  userSharePercent,
  vaultInfo,
  onTabChange,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                    <p className="text-white font-semibold">Staked Tokens</p>
                    <p className="text-xs text-slate-300">Risk token staking rewards</p>
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
            onClick={() => onTabChange('deposit')}
          >
            Deposit & Get Tokens
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => onTabChange('manage')}
          >
            Manage Positions
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => onTabChange('advanced')}
          >
            Stake Risk Tokens
            <Droplets className="w-4 h-4" />
          </Button>

          {/* Protocol Analytics */}
          <div className="pt-4 border-t border-slate-600">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Protocol Analytics
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-slate-300 font-medium">Total TVL</p>
                <p className="text-lg font-bold text-green-400">${formatNumber(protocolTVL, 0)}</p>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-slate-300 font-medium">Your Share</p>
                <p className="text-lg font-bold text-blue-400">{formatNumber(userSharePercent, 4)}%</p>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-slate-300 font-medium">Pool Ratio</p>
                <p className="text-lg font-bold text-purple-400">1.00</p>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-slate-300 font-medium">Emergency</p>
                <p className={`text-sm font-bold ${vaultInfo.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                  {vaultInfo.emergencyMode ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioOverview;
