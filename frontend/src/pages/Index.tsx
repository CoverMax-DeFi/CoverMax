import { Link } from 'react-router-dom';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import Logo from '@/assets/images/CoverMax.svg';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Zap,
  BarChart3,
  Globe
} from 'lucide-react';

const Index = () => {
  const { isConnected, vaultInfo } = useWeb3();

  // Demo stats
  const totalValueLocked = ((Number(vaultInfo.aUSDCBalance) + Number(vaultInfo.cUSDTBalance)) / 1e18).toFixed(0);
  const estimatedAPY = "12.5"; // Demo APY

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Risk-Adjusted Yields",
      description: "Earn competitive returns while protecting your downside with our dual-token architecture"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Phased Protection",
      description: "Time-based cycles ensure fair claims processing and optimal capital efficiency"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Emergency Safeguards",
      description: "Automatic emergency mode prioritizes senior token holders during market stress"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Transparent Analytics",
      description: "Real-time protocol metrics and performance tracking for informed decisions"
    }
  ];

  const stats = [
    { label: "Total Value Locked", value: `$${totalValueLocked || "0"}`, suffix: "" },
    { label: "Est. APY", value: estimatedAPY, suffix: "%" },
    { label: "Protocol Phases", value: "4", suffix: "" },
    { label: "Emergency Mode", value: vaultInfo.emergencyMode ? "Active" : "Ready", suffix: "" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img src={Logo} alt="CoverMax" className="h-8 w-auto" />
              <span className="text-xl font-bold text-white">CoverMax</span>
            </Link>
            
            <div className="flex items-center space-x-6">

              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link to="/dashboard">
                  {isConnected ? 'Dashboard' : 'Launch App'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-slate-800 text-slate-200 border-slate-700 px-4 py-2">
              <Globe className="w-4 h-4 mr-2" />
              Live on Blockchain
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Turn Insurance Risk Into
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tradeable Tokens
              </span>
            </h1>
            <p className="text-lg text-blue-300 mb-4 font-semibold">
              For safety-first users and high-upside seekers—choose your risk, earn your yield.
            </p>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Deposit your assets → Get risk tokens → Trade them on Uniswap.
              <br />
              <span className="text-blue-400 font-medium">Senior tokens = safety first. Junior tokens = higher upside.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                <Link to="/dashboard">
                  Start Trading
                  <TrendingUp className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" asChild className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-slate-500 text-lg px-8 py-6">
                <Link to="/insurance">
                  Learn More
                </Link>
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-6">
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="relative z-10 py-24 bg-slate-800/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Who is CoverMax for?
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Two distinct user types—choose your risk, earn your yield.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Card className="flex-1 flex flex-row items-center gap-4 bg-slate-800/80 border-blue-600 border-2 p-6 shadow-lg">
              <Shield className="w-10 h-10 text-blue-400" />
              <div>
                <div className="text-xl font-bold text-blue-300">For Safety-First Users</div>
                <div className="text-slate-300 text-base">
                  <span className="text-blue-400 font-medium">Benefit:</span> Deposit yield tokens, sell of your risk tokens to get "insured-yield", and withdraw from unharmed with priority during emergencies.
                </div>
              </div>
            </Card>
            <Card className="flex-1 flex flex-row items-center gap-4 bg-slate-800/80 border-amber-500 border-2 p-6 shadow-lg">
              <TrendingUp className="w-10 h-10 text-amber-400" />
              <div>
                <div className="text-xl font-bold text-amber-300">For High-Upside Seekers</div>
                <div className="text-slate-300 text-base">
                  <span className="text-amber-400 font-medium">Benefit:</span> Deposit yield tokens, arbitrage the risk tokens, and manage the Junior Tokens for higher yield still with flexible risk exposure.<br />

                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Simple How It Works */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Dead Simple Process
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Deposit</h3>
                <p className="text-slate-400 text-sm">Put in aUSDC/cUSDT</p>
              </div>
              
              <ArrowRight className="w-8 h-8 text-slate-600 rotate-90 md:rotate-0" />
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Get Tokens</h3>
                <p className="text-slate-400 text-sm">Receive senior + junior</p>
              </div>
              
              <ArrowRight className="w-8 h-8 text-slate-600 rotate-90 md:rotate-0" />
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Trade</h3>
                <p className="text-slate-400 text-sm">Buy/sell on Uniswap</p>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <p className="text-lg text-slate-300">
                <span className="text-blue-400 font-medium">Why?</span> Because now you can buy/sell insurance risk like any other token.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Token Comparison */}
      <section className="relative z-10 py-20 bg-slate-800/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Two Risk Types
            </h2>
            <p className="text-slate-300 text-lg">
              Choose your risk level
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-6 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Senior Tokens</h3>
              <p className="text-blue-400 mb-4">"Safety First"</p>
              <p className="text-slate-300 text-sm">
                Get paid out first if things go wrong. Lower risk, lower reward.
              </p>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-6 text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Junior Tokens</h3>
              <p className="text-amber-400 mb-4">"High Upside"</p>
              <p className="text-slate-300 text-sm">
                Get paid after seniors. Higher risk, higher potential reward.
              </p>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-slate-400">
              Both types are tradeable on Uniswap • Adjust your risk anytime
            </p>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-12 text-center max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
            <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Try It?
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Turn your DeFi assets into tradeable risk tokens.
            </p>
            

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                <Link to="/dashboard">
                  Launch Protocol
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src={Logo} alt="CoverMax" className="h-6 w-auto" />
                <span className="text-lg font-bold text-white">CoverMax</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                Insurance-backed DeFi yields through innovative dual-token architecture.
                Built for the future of protected finance.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Protocol</h4>
              <div className="space-y-2">
                <Link to="/dashboard" className="block text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                <Link to="/insurance" className="block text-slate-400 hover:text-white transition-colors">Try Demo</Link>
                <Link to="/admin" className="block text-slate-400 hover:text-white transition-colors">Analytics</Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <div className="space-y-2">
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">GitHub</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Whitepaper</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Audit</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} CoverMax Protocol. Decentralized and open source.
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                v1.0.0
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;