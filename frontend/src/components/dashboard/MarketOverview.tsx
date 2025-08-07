import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  TrendingUp,
  Droplets,
  Users,
  ExternalLink,
} from 'lucide-react';

interface MarketOverviewProps {
  seniorPrice: string;
  juniorPrice: string;
  poolReserves: { senior: string; junior: string };
  protocolTVL: number;
  formatNumber: (num: number, decimals?: number) => string;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({
  seniorPrice,
  juniorPrice,
  poolReserves,
  protocolTVL,
  formatNumber,
}) => {
  return (
    <Card className="bg-slate-800/80 border-slate-600 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center font-semibold">
            <Activity className="w-5 h-5 mr-2" />
            Market Overview
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
  );
};

export default MarketOverview;
