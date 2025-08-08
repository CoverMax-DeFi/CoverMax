import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface ProtocolCoverageCardProps {
  currentProtocol?: string;
}

const ProtocolCoverageCard: React.FC<ProtocolCoverageCardProps> = ({ currentProtocol = '' }) => {
  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          <Shield className="h-5 w-5 text-purple-400" />
          CoverMax Protocol Coverage
          <span className="text-sm text-slate-400 ml-auto font-normal">Shared Risk Pool</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Bonzo', emoji: '🟣', tvl: '45M', risk: 'medium', type: 'lending', age: 6 },
            { name: 'Compound', emoji: '🏛️', tvl: '2.8B', risk: 'low', type: 'lending', age: 48 },
            { name: 'MoonSwap', emoji: '🌙', tvl: '15M', risk: 'high', type: 'dex', age: 3 },
            { name: 'LunarVault', emoji: '🔒', tvl: '8M', risk: 'high', type: 'yield', age: 2 }
          ].map(protocol => (
            <div 
              key={protocol.name}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                protocol.name === currentProtocol 
                  ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/20' 
                  : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70'
              }`}
            >
              <span className="text-xl">{protocol.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{protocol.name}</div>
                <div className="text-xs text-slate-400">${protocol.tvl} TVL</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                protocol.risk === 'high' ? 'bg-red-400' : 
                protocol.risk === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
              }`} title={`${protocol.risk.charAt(0).toUpperCase() + protocol.risk.slice(1)} Risk`} />
            </div>
          ))}
        </div>
        
        {/* Key Information */}
        <div className="mt-4 space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="text-xs text-center text-amber-300 font-medium mb-1">
              ⚠️ Cross-Protocol Risk Sharing
            </div>
            <div className="text-xs text-center text-slate-300">
              Any protocol hack affects ALL token prices across the entire pool
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/30 rounded p-2">
              <div className="text-slate-400">Total Coverage:</div>
              <div className="text-white font-semibold">$2.87B TVL</div>
            </div>
            <div className="bg-slate-700/30 rounded p-2">
              <div className="text-slate-400">Risk Correlation:</div>
              <div className="text-white font-semibold">High</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProtocolCoverageCard;