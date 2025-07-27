import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, DollarSign, Clock, Target } from 'lucide-react';

interface PredictionMarketWidgetProps {
  protocolName: string;
  protocolLogo?: string;
  currentOdds?: {
    hack: number;    // e.g., 1.15 (15% implied probability)
    safe: number;    // e.g., 6.5 (15.4% implied probability)
  };
  timeframe?: string;
  minBet?: number;
  maxPayout?: number;
}

const PredictionMarketWidget: React.FC<PredictionMarketWidgetProps> = ({
  protocolName,
  protocolLogo = '🛡️',
  currentOdds = { hack: 1.15, safe: 6.5 },
  timeframe = '7 days',
  minBet = 10,
  maxPayout = 1000
}) => {
  const [selectedBet, setSelectedBet] = useState<'hack' | 'safe' | null>(null);
  const [betAmount, setBetAmount] = useState(minBet);

  const handleBetSelection = (bet: 'hack' | 'safe') => {
    setSelectedBet(bet);
  };

  const calculatePayout = (amount: number, odds: number) => {
    return (amount * odds).toFixed(2);
  };

  const getImpliedProbability = (odds: number) => {
    return ((1 / odds) * 100).toFixed(1);
  };

  const getBetColorClass = (bet: 'hack' | 'safe') => {
    if (bet === 'hack') {
      return selectedBet === 'hack'
        ? 'border-red-500 bg-red-500/20'
        : 'border-slate-600 bg-slate-700/50 hover:border-red-400 hover:bg-red-500/10';
    } else {
      return selectedBet === 'safe'
        ? 'border-green-500 bg-green-500/20'
        : 'border-slate-600 bg-slate-700/50 hover:border-green-400 hover:bg-green-500/10';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-white">
          <span className="text-2xl">{protocolLogo}</span>
          <div>
            <div className="text-lg font-bold">Predict {protocolName}</div>
            <div className="text-sm text-slate-400 font-normal">Next {timeframe}</div>
          </div>
          <Badge className="ml-auto bg-purple-600 text-white">
            <Zap className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question */}
        <div className="text-center">
          <h3 className="text-white font-semibold mb-2">
            Will {protocolName} get exploited?
          </h3>
          <p className="text-slate-400 text-sm">
            Bet on protocol security • Earn up to {currentOdds.safe}x returns
          </p>
        </div>

        {/* Betting Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* YES - Gets Hacked */}
          <button
            onClick={() => handleBetSelection('hack')}
            className={`p-4 rounded-lg border-2 transition-all ${getBetColorClass('hack')}`}
          >
            <div className="text-center">
              <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-white font-bold">YES</div>
              <div className="text-xs text-slate-400 mb-1">Gets Hacked</div>
              <div className="text-red-400 font-bold">{currentOdds.hack}x</div>
              <div className="text-xs text-slate-500">
                {getImpliedProbability(currentOdds.hack)}% chance
              </div>
            </div>
          </button>

          {/* NO - Stays Safe */}
          <button
            onClick={() => handleBetSelection('safe')}
            className={`p-4 rounded-lg border-2 transition-all ${getBetColorClass('safe')}`}
          >
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-white font-bold">NO</div>
              <div className="text-xs text-slate-400 mb-1">Stays Safe</div>
              <div className="text-green-400 font-bold">{currentOdds.safe}x</div>
              <div className="text-xs text-slate-500">
                {getImpliedProbability(currentOdds.safe)}% chance
              </div>
            </div>
          </button>
        </div>

        {/* Bet Amount Input */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Bet Amount (USDC)</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(minBet, Number(e.target.value)))}
                min={minBet}
                max={maxPayout}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder={`Min ${minBet}`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(100)}
              className="text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              Max
            </Button>
          </div>
        </div>

        {/* Potential Payout */}
        {selectedBet && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Potential Payout:</span>
              <span className="text-white font-bold">
                ${calculatePayout(betAmount, selectedBet === 'hack' ? currentOdds.hack : currentOdds.safe)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-slate-400">Profit:</span>
              <span className={`font-bold ${selectedBet === 'hack' ? 'text-red-400' : 'text-green-400'}`}>
                ${(parseFloat(calculatePayout(betAmount, selectedBet === 'hack' ? currentOdds.hack : currentOdds.safe)) - betAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          className={`w-full py-3 font-bold ${
            selectedBet === 'hack'
              ? 'bg-red-600 hover:bg-red-700'
              : selectedBet === 'safe'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={!selectedBet}
        >
          {selectedBet
            ? `Place ${selectedBet === 'hack' ? 'HACK' : 'SAFE'} Bet • $${betAmount}`
            : 'Select Your Prediction'
          }
        </Button>

        {/* Stats Footer */}
        <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Ends in {timeframe}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>1,247 bets placed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionMarketWidget;
