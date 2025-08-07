import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PredictionMarketWidget from '@/components/PredictionMarketWidget';
import Logo from '@/assets/images/CoverMax.svg';
import { Link } from 'react-router-dom';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import NetworkSelector from '@/components/NetworkSelector';
import { Zap, TrendingUp, DollarSign, Target, Brain } from 'lucide-react';

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
  const [currentOdds, setCurrentOdds] = useState({ hack: 1.02, safe: 1.25 });
  const [seniorPrice, setSeniorPrice] = useState('1.00');
  const [juniorPrice, setJuniorPrice] = useState('1.00');
  const [aiRecommendation, setAiRecommendation] = useState<{ betType: 'hack' | 'safe'; confidence: number } | null>(null);
  const { isConnected, address, connectWallet, disconnectWallet } = useWeb3();
  
  // Use Aave as the default protocol
  const selectedProtocol = demoProtocols[0];

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  // Memoize the callback to prevent infinite re-renders
  const handleOddsUpdate = useCallback((odds: { hack: number; safe: number }, senior: string, junior: string) => {
    setCurrentOdds(odds);
    setSeniorPrice(senior);
    setJuniorPrice(junior);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Isolated Header - With Clickable Logo */}
      <div className="relative z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          {/* Clickable Logo and Title */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img src={Logo} alt="CoverMax Logo" className="h-8 w-auto" />
              <span className="font-bold text-xl text-white">CoverMax</span>
            </Link>
            <span className="text-slate-400 text-sm ml-2">Widget Demo</span>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-3">
            <NetworkSelector />
            {!isConnected ? (
              <Button
                variant="outline"
                className="text-slate-300 hover:text-white hover:bg-slate-700 px-4 py-2 text-sm font-medium border-slate-600 hover:border-slate-500 bg-slate-800/50"
                onClick={connectWallet}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H13.5m-9 0a2.25 2.25 0 0 0-2.25 2.25m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
                Connect Wallet
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-slate-300 hover:text-white hover:bg-slate-700 px-4 py-2 text-sm font-medium border-slate-600 hover:border-slate-500 bg-slate-800/50"
                onClick={disconnectWallet}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H13.5m-9 0a2.25 2.25 0 0 0-2.25 2.25m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
                {formatAddress(address!)}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Smart DeFi Insurance Made Simple
          </h1>
          <p className="text-slate-300 text-xl max-w-3xl mx-auto mb-6 leading-relaxed">
            Get <span className="text-purple-400 font-semibold">AI-powered recommendations</span> that analyze your portfolio to suggest optimal protection or yield strategies. 
            No complex insurance jargon - just smart betting with real returns.
          </p>
          <div className="flex justify-center items-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Live Protocol</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="font-medium">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="font-medium">Real Returns</span>
            </div>
          </div>
        </div>

        {/* Main Widget Demo */}
        <div className="max-w-md mx-auto mb-12">
          <PredictionMarketWidget
            protocolName={selectedProtocol.name}
            protocolLogo={selectedProtocol.logo}
            timeframe="7 days"
            minBet="10"
            maxPayout="1000"
            supportedAssets={selectedProtocol.supportedAssets}
            onOddsUpdate={handleOddsUpdate}
            aiRecommendation={aiRecommendation}
          />
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p className="text-sm">AI analyzes your wallet composition and market conditions to recommend optimal betting strategies.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-green-400" />
                Smart Positioning
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p className="text-sm">Recommendations consider your existing positions to avoid over-concentration and optimize returns.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
                Expected Value
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p className="text-sm">Real-time calculations show mathematical edge and profit potential for each betting opportunity.</p>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
};

export default WidgetDemo;

