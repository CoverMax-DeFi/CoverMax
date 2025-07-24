import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CHAIN_CONFIG } from '../config/contracts';
import { useWeb3 } from '../context/PrivyWeb3Context';

export const NetworkSelector: React.FC = () => {
  const { ready, authenticated } = usePrivy();
  const { currentChain } = useWeb3();

  if (!ready || !authenticated) {
    return null;
  }

  // Display the current network status (Moonbeam only)
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
      <span className="text-lg">{CHAIN_CONFIG.icon}</span>
      <span className="text-sm font-medium text-white">
        {CHAIN_CONFIG.chainName}
      </span>
      {currentChain && currentChain !== CHAIN_CONFIG.chainId && (
        <span className="text-xs text-yellow-400">(Wrong Network)</span>
      )}
    </div>
  );
};

export default NetworkSelector;