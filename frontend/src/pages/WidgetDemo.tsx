import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import PredictionMarketWidget from '@/components/PredictionMarketWidget';
import { Code, Zap, TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface ProtocolDemo {
  name: string;
  logo: string;
  supportedAssets: ('aUSDC' | 'cUSDT')[];
}

const demoProtocols: ProtocolDemo[] = [
  {
    name: 'Aave',
    logo: '🏦',
    supportedAssets: ['aUSDC']  // Aave only supports aUSDC
  },
  {
    name: 'Compound',
    logo: '🏛️',
    supportedAssets: ['cUSDT']  // Compound only supports cUSDT
  }
];

const WidgetDemo: React.FC = () => {
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolDemo>(demoProtocols[0]);
  const [showCode, setShowCode] = useState(false);

  const codeExample = `import PredictionMarketWidget from '@/components/PredictionMarketWidget';

// Embed in your protocol page
<PredictionMarketWidget
  protocolName="${selectedProtocol.name}"
  protocolLogo="${selectedProtocol.logo}"
  timeframe="7 days"
  minBet={10}
  maxPayout={1000}
/>`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            CoverMax Prediction Market Widget
          </h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            A standalone component that turns protocol security into a <span className="font-semibold text-purple-400">profitable prediction game</span>.
            No insurance jargon, just pure speculation on DeFi protocol outcomes.
          </p>
        </div>

        {/* Live Demo */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Widget Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              Live Demo Widget
            </h2>
            <PredictionMarketWidget
              protocolName={selectedProtocol.name}
              protocolLogo={selectedProtocol.logo}
              timeframe="7 days"
              minBet="10"
              maxPayout="1000"
              supportedAssets={selectedProtocol.supportedAssets}
            />
          </div>

          {/* Protocol Selector */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Choose Protocol to Demo</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {demoProtocols.map((protocol) => (
                <button
                  key={protocol.name}
                  onClick={() => setSelectedProtocol(protocol)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedProtocol.name === protocol.name
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 hover:border-purple-400 hover:bg-slate-600/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{protocol.logo}</span>
                    <div>
                      <div className="text-white font-medium">{protocol.name}</div>
                      <div className="text-xs text-slate-400">
                        Live odds from Uniswap pools
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Why This Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-slate-300">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-white">Feels Like Speculation</h4>
                    <p className="text-sm">Users love betting on outcomes - no complex insurance terminology</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-white">Clear Profit Motive</h4>
                    <p className="text-sm">Show exact payouts and odds to drive engagement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-white">Embeddable Anywhere</h4>
                    <p className="text-sm">Drop into any protocol page, forum, or dApp</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Implementation Code */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="h-5 w-5 text-green-400" />
              Easy Integration
            </CardTitle>
            <CardDescription className="text-slate-300">
              Copy and paste this component anywhere. Perfect for embedding on Aave, Compound, or any DeFi protocol page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-slate-400">React Component</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
                className="text-white bg-slate-600 border-slate-500 hover:bg-slate-500 hover:text-white font-medium"
              >
                {showCode ? 'Hide Code' : 'Show Code'}
              </Button>
            </div>

            {showCode && (
              <div className="bg-slate-900/50 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400">
                  <code>{codeExample}</code>
                </pre>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-white font-medium">Single Component</div>
                <div className="text-slate-400">No dependencies</div>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-white font-medium">Customizable</div>
                <div className="text-slate-400">Odds, logos, timeframes</div>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-white font-medium">Mobile Ready</div>
                <div className="text-slate-400">Responsive design</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Value */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-400" />
                Mass Market Appeal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Transforms complex insurance into simple betting. Crypto users love speculation and profit opportunities.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Viral Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Embeddable widgets spread organically. Each protocol becomes a distribution channel for CoverMax.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Hidden Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Users get insurance coverage without realizing it. Behind the scenes, CoverMax handles all the complexity.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WidgetDemo;
