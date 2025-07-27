import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import { Shield, TrendingUp, Users, Clock, CheckCircle, XCircle, Info } from 'lucide-react';

interface Protocol {
  name: string;
  tvl: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  logo: string;
  description: string;
  coverage: string;
}

const protocols: Protocol[] = [
  {
    name: 'Aave',
    tvl: '$12.4B',
    riskLevel: 'Low',
    logo: '🏦',
    description: 'Leading lending protocol',
    coverage: '$500K'
  },
  {
    name: 'Compound',
    tvl: '$3.2B',
    riskLevel: 'Low',
    logo: '🏛️',
    description: 'Decentralized lending platform',
    coverage: '$300K'
  },
  {
    name: 'Uniswap V3',
    tvl: '$8.1B',
    riskLevel: 'Medium',
    logo: '🦄',
    description: 'Automated market maker',
    coverage: '$400K'
  },
  {
    name: 'Yearn Finance',
    tvl: '$1.8B',
    riskLevel: 'Medium',
    logo: '💰',
    description: 'Yield optimization protocol',
    coverage: '$250K'
  }
];

const WidgetDemo: React.FC = () => {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [userChoice, setUserChoice] = useState<'yes' | 'no' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleProtocolSelect = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setUserChoice(null);
    setShowResult(false);
  };

  const handleChoice = (choice: 'yes' | 'no') => {
    setUserChoice(choice);
    setShowResult(true);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
            CoverMax Insurance Widget
          </h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            A simple question that abstracts away insurance complexity:
            <span className="font-semibold text-blue-400"> Do you think this protocol will get hacked in the next 7 days?</span>
          </p>
        </div>

        {/* How it works */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <h4 className="font-semibold text-white">Answer "YES" (I think it will get hacked)</h4>
                    <p className="text-sm text-slate-400">You become an insurance buyer - get coverage if the protocol is exploited</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <div>
                    <h4 className="font-semibold text-white">Answer "NO" (I don't think it will get hacked)</h4>
                    <p className="text-sm text-slate-400">You become an underwriter - earn premiums if the protocol stays safe</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protocol Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select a Protocol to Insure</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {protocols.map((protocol) => (
              <Card
                key={protocol.name}
                className={`cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                  selectedProtocol?.name === protocol.name
                    ? 'border-2 border-blue-500 bg-blue-500/10'
                    : 'border border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
                onClick={() => handleProtocolSelect(protocol)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{protocol.logo}</div>
                    <h3 className="font-bold text-white text-lg">{protocol.name}</h3>
                    <p className="text-slate-400 text-sm mb-3">{protocol.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">TVL:</span>
                        <span className="text-white font-medium">{protocol.tvl}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Coverage:</span>
                        <span className="text-white font-medium">{protocol.coverage}</span>
                      </div>
                      <Badge className={`w-full justify-center ${getRiskColor(protocol.riskLevel)}`}>
                        {protocol.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* The Question */}
        {selectedProtocol && (
          <Card className="mb-8 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-3">
                <span className="text-2xl">{selectedProtocol.logo}</span>
                The Question for {selectedProtocol.name}
              </CardTitle>
              <CardDescription className="text-slate-300">
                Based on your assessment of this protocol's security and market conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Do you think {selectedProtocol.name} will get hacked in the next 7 days?
                </h3>
                <div className="flex justify-center gap-6">
                  <Button
                    size="lg"
                    className={`px-8 py-4 text-lg font-semibold min-w-32 ${
                      userChoice === 'yes'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-slate-700 hover:bg-red-600 text-white'
                    }`}
                    onClick={() => handleChoice('yes')}
                  >
                    YES
                  </Button>
                  <Button
                    size="lg"
                    className={`px-8 py-4 text-lg font-semibold min-w-32 ${
                      userChoice === 'no'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-slate-700 hover:bg-green-600 text-white'
                    }`}
                    onClick={() => handleChoice('no')}
                  >
                    NO
                  </Button>
                </div>
              </div>

              {/* Result */}
              {showResult && userChoice && (
                <div className="space-y-6">
                  <Separator className="bg-slate-600" />

                  <Alert className={`backdrop-blur-sm ${
                    userChoice === 'yes' ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'
                  }`}>
                    <AlertDescription className="text-lg">
                      {userChoice === 'yes' ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Shield className="h-6 w-6 text-red-400" />
                            <span className="font-semibold text-white">You chose: Insurance Buyer</span>
                          </div>
                          <div className="text-slate-300">
                            <p className="mb-3">Here's what happens behind the scenes:</p>
                            <ul className="space-y-2 ml-4">
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>You deposit USDC and receive CM-Senior and CM-Junior risk tokens</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>You <strong className="text-white">hold</strong> these tokens, meaning you bear the insurance risk</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>If {selectedProtocol.name} gets hacked, you can claim compensation</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>If nothing happens, you earn yield from your deposited assets</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-6 w-6 text-green-400" />
                            <span className="font-semibold text-white">You chose: Insurance Provider (Underwriter)</span>
                          </div>
                          <div className="text-slate-300">
                            <p className="mb-3">Here's what happens behind the scenes:</p>
                            <ul className="space-y-2 ml-4">
                              <li className="flex items-start gap-2">
                                <span className="text-green-400">•</span>
                                <span>You deposit USDC and receive CM-Senior and CM-Junior risk tokens</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-green-400">•</span>
                                <span>You <strong className="text-white">sell</strong> these tokens on Uniswap, transferring risk to buyers</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-green-400">•</span>
                                <span>You earn premiums from token sales plus yield from deposits</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-green-400">•</span>
                                <span>If {selectedProtocol.name} stays safe, you keep all earnings</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Transaction Details */}
                  <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        Transaction Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Coverage Amount:</span>
                          <p className="text-white font-medium">{selectedProtocol.coverage}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Coverage Period:</span>
                          <p className="text-white font-medium">7 days</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Protocol Risk:</span>
                          <Badge className={getRiskColor(selectedProtocol.riskLevel)}>
                            {selectedProtocol.riskLevel}
                          </Badge>
                        </div>
                      </div>

                      <Separator className="bg-slate-600" />

                      <div className="text-center">
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                          size="lg"
                        >
                          {userChoice === 'yes' ? 'Get Insurance Coverage' : 'Provide Insurance Coverage'}
                        </Button>
                        <p className="text-slate-400 text-sm mt-2">
                          Connect your wallet to proceed with the transaction
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Simple & Intuitive
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>No need to understand complex insurance mechanics. Just answer a simple question based on your market view.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                Community Driven
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Your opinion contributes to a decentralized insurance pool that protects the entire DeFi ecosystem.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Earn While You Protect
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Whether you're buying or providing insurance, you earn yield from the underlying protocols.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WidgetDemo;
