import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Brain,
  Activity,
  Pause,
  Play,
  Settings,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { dcaBotService, DCAStrategy, PriceAnalysis } from '@/services/dcaBot';
import { useWeb3 } from '@/context/PrivyWeb3Context';

interface DCABotWidgetProps {
  onStrategyCreated?: (strategy: DCAStrategy) => void;
}

const DCABotWidget: React.FC<DCABotWidgetProps> = ({ onStrategyCreated }) => {
  const { address, isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState('create');
  const [strategies, setStrategies] = useState<DCAStrategy[]>([]);
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [tokenType, setTokenType] = useState<'senior' | 'junior'>('senior');
  const [amount, setAmount] = useState('100');
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [useAI, setUseAI] = useState(true);
  const [targetPrice, setTargetPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');

  useEffect(() => {
    if (address) {
      loadUserStrategies();
    }
  }, [address]);

  useEffect(() => {
    // Update price analysis periodically
    const interval = setInterval(async () => {
      if (tokenType) {
        const analysis = await dcaBotService.analyzePriceForDCA(tokenType, getCurrentMockPrice());
        setPriceAnalysis(analysis);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tokenType]);

  const loadUserStrategies = () => {
    if (address) {
      const userStrategies = dcaBotService.getUserStrategies(address);
      setStrategies(userStrategies);
    }
  };

  const getCurrentMockPrice = () => {
    return tokenType === 'senior' ? 1.02 : 1.25;
  };

  const handleCreateStrategy = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const priceConstraints = showAdvanced ? {
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
      } : undefined;

      const strategy = await dcaBotService.createStrategy(
        address,
        tokenType,
        amount,
        frequency,
        priceConstraints
      );

      setStrategies([...strategies, strategy]);
      onStrategyCreated?.(strategy);

      // Reset form
      setAmount('100');
      setTargetPrice('');
      setMaxPrice('');
      setMinPrice('');
      setActiveTab('manage');
    } catch (error) {
      console.error('Failed to create strategy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStrategy = async (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    if (strategy.isActive) {
      await dcaBotService.stopStrategy(strategyId);
    } else {
      // Reactivate strategy (would need to implement in service)
      strategy.isActive = true;
    }

    loadUserStrategies();
  };

  const formatFrequency = (freq: string) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-500';
    if (confidence > 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white backdrop-blur-sm">
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Bot className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">AI-Powered DCA Bot</CardTitle>
              <CardDescription className="text-slate-400">
                Automate your risk token purchases with AI optimization
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500 text-purple-400">
            <Brain className="h-3 w-3 mr-1" />
            Hedera Agent
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="create" className="data-[state=active]:bg-slate-600">
              Create Strategy
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-slate-600">
              Manage ({strategies.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-600">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label>Risk Token Type</Label>
              <Select value={tokenType} onValueChange={(v) => setTokenType(v as 'senior' | 'junior')}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="senior">Senior Token (Lower Risk)</SelectItem>
                  <SelectItem value="junior">Junior Token (Higher Risk)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount per Purchase (USDC)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="bg-slate-700/50 border-slate-600"
              />
            </div>

            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Purchase Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-purple-400" />
                <div>
                  <Label className="text-base">AI Price Optimization</Label>
                  <p className="text-xs text-slate-400">Let AI determine optimal buy times</p>
                </div>
              </div>
              <Switch
                checked={useAI}
                onCheckedChange={setUseAI}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                Advanced Settings
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-slate-700/20 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm">Target Price</Label>
                    <Input
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Optional"
                      className="bg-slate-700/50 border-slate-600 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Max Price</Label>
                      <Input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Optional"
                        className="bg-slate-700/50 border-slate-600 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Min Price</Label>
                      <Input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Optional"
                        className="bg-slate-700/50 border-slate-600 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Market Analysis */}
            {priceAnalysis && (
              <Alert className="bg-slate-700/30 border-slate-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Current Price:</span>
                      <span className="font-mono">${priceAnalysis.currentPrice.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AI Recommendation:</span>
                      <Badge className={`${
                        priceAnalysis.recommendation === 'buy' ? 'bg-green-500/20 text-green-400' :
                        priceAnalysis.recommendation === 'wait' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {priceAnalysis.recommendation.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Confidence:</span>
                      <span className={getConfidenceColor(priceAnalysis.confidence)}>
                        {(priceAnalysis.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCreateStrategy}
              disabled={!isConnected || isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Creating...' : 'Create DCA Strategy'}
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4 mt-6">
            {strategies.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active strategies</p>
                <p className="text-sm mt-2">Create your first DCA strategy to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={strategy.tokenType === 'senior' ? 'border-blue-500 text-blue-400' : 'border-orange-500 text-orange-400'}>
                          {strategy.tokenType}
                        </Badge>
                        <span className="text-sm">
                          ${strategy.amount} {formatFrequency(strategy.frequency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={strategy.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {strategy.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStrategy(strategy.id)}
                          className="h-8 w-8 p-0"
                        >
                          {strategy.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Executions:</span>
                        <p className="font-mono">{strategy.totalExecutions}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Spent:</span>
                        <p className="font-mono">${strategy.totalAmountSpent}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Avg Price:</span>
                        <p className="font-mono">${strategy.averagePrice.toFixed(4)}</p>
                      </div>
                    </div>

                    {strategy.lastExecuted && (
                      <div className="text-xs text-slate-400">
                        Last executed: {new Date(strategy.lastExecuted).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-6">
            <div className="space-y-4">
              {/* Market Overview */}
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  Market Analysis
                </h3>
                {priceAnalysis && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Market Trend</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(priceAnalysis.trend)}
                        <span className="text-sm capitalize">{priceAnalysis.trend}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Volatility</span>
                      <Progress value={priceAnalysis.volatility * 100} className="w-24 h-2" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Optimal Buy Price</span>
                      <span className="font-mono text-sm">${priceAnalysis.optimalBuyPrice.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Summary */}
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  Performance Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-2xl font-bold text-green-400">
                      {strategies.filter(s => s.isActive).length}
                    </p>
                    <p className="text-xs text-slate-400">Active Strategies</p>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-2xl font-bold text-blue-400">
                      ${strategies.reduce((sum, s) => sum + parseFloat(s.totalAmountSpent), 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400">Total Invested</p>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <Alert className="bg-purple-500/10 border-purple-500/30">
                <Brain className="h-4 w-4 text-purple-400" />
                <AlertDescription className="text-sm">
                  <strong>AI Insight:</strong> Based on current market conditions and your portfolio, 
                  consider increasing DCA frequency during high volatility periods for better average entry prices.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DCABotWidget;