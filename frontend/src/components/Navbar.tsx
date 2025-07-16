import React from 'react';
import Logo from '@/assets/images/CoverMax.svg';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import NetworkSelector from '@/components/NetworkSelector';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isConnected, address, connectWallet, disconnectWallet } = useWeb3();

  // Helper function to determine if a route is active
  const isActive = (path: string) => location.pathname === path;
  
  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl py-4 px-6 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <img src={Logo} alt="CoverMax Logo" className="h-8 w-auto" />
            <span className="font-bold text-xl text-white">CoverMax</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Main Navigation Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="ghost"
              asChild
              className={isActive("/dashboard") ? "bg-slate-700 text-white hover:bg-slate-600" : "text-slate-300 hover:text-white hover:bg-slate-800"}
            >
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className={isActive("/advanced") ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"}
            >
              <Link to="/advanced">Advanced</Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className={isActive("/admin") ? "bg-red-600 hover:bg-red-700 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"}
            >
              <Link to="/admin">Admin</Link>
            </Button>
          </div>

          {/* Network Selector */}
          <NetworkSelector />

          {/* Connect Wallet Button */}
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

          {/* Mobile menu button (you can expand this for mobile navigation) */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
