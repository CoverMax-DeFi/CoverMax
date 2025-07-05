import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers, BrowserProvider, Contract, Signer } from 'ethers';
import { toast } from '@/components/ui/sonner';
import { 
  CHAIN_CONFIG, 
  Phase, 
  PHASE_NAMES,
  SupportedChainId,
  ContractName,
  getContractAddress,
  getContractAddressSafe,
  isContractDeployed,
  getChainContracts,
  getChainConfig,
  isSupportedChain,
  CHAIN_CONFIGS,
  DEFAULT_CHAIN_ID
} from '@/config/contracts';
import {
  RISK_VAULT_ABI,
  RISK_TOKEN_ABI,
  ERC20_ABI,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V2_PAIR_ABI
} from '@/config/abis';

interface TokenBalances {
  seniorTokens: bigint;
  juniorTokens: bigint;
  aUSDC: bigint;
  cUSDT: bigint;
  lpTokens: bigint;
}

interface VaultInfo {
  aUSDCBalance: bigint;
  cUSDTBalance: bigint;
  totalTokensIssued: bigint;
  emergencyMode: boolean;
  currentPhase: Phase;
  phaseStartTime: bigint;
  cycleStartTime: bigint;
  timeRemaining: bigint;
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  currentChain: SupportedChainId | null;
  isUnsupportedChain: boolean;
  
  // Contracts
  provider: BrowserProvider | null;
  signer: Signer | null;
  
  // Balances
  balances: TokenBalances;
  
  // Vault info
  vaultInfo: VaultInfo;
  
  // Token addresses
  seniorTokenAddress: string | null;
  juniorTokenAddress: string | null;
  
  // Connection functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chainId: SupportedChainId) => Promise<void>;
  
  // Contract interactions
  depositAsset: (asset: 'aUSDC' | 'cUSDT', amount: string) => Promise<void>;
  withdraw: (seniorAmount: string, juniorAmount: string) => Promise<void>;
  withdrawSeniorTokens: (amount: string) => Promise<void>;
  withdrawAll: () => Promise<void>;
  emergencyWithdraw: (seniorAmount: string, preferredAsset: 'aUSDC' | 'cUSDT') => Promise<void>;
  
  // Admin functions
  toggleEmergencyMode: () => Promise<void>;
  forcePhaseTransition: () => Promise<void>;
  startNewCycle: () => Promise<void>;
  
  // Utility functions
  refreshData: () => Promise<void>;
  approveToken: (tokenAddress: string, amount: string) => Promise<void>;
  calculateWithdrawalAmounts: (seniorAmount: string, juniorAmount: string) => Promise<{ aUSDC: bigint; cUSDT: bigint }>;
  
  // Uniswap functions
  swapExactTokensForTokens: (
    amountIn: string,
    amountOutMin: string,
    path: string[],
  ) => Promise<void>;
  
  getAmountsOut: (
    amountIn: string,
    path: string[],
  ) => Promise<string>;

  addLiquidity: (
    tokenAAmount: string,
    tokenBAmount: string,
    tokenA: string,
    tokenB: string,
  ) => Promise<void>;

  removeLiquidity: (
    lpTokenAmount: string,
    tokenA: string,
    tokenB: string,
  ) => Promise<void>;

  getPairReserves: (
    pairAddress: string
  ) => Promise<{ reserve0: bigint; reserve1: bigint }>;

  getTokenBalance: (
    tokenAddress: string
  ) => Promise<bigint>;
}

const Web3Context = createContext<Web3ContextType>({
  isConnected: false,
  address: null,
  chainId: null,
  currentChain: null,
  isUnsupportedChain: false,
  provider: null,
  signer: null,
  balances: {
    seniorTokens: 0n,
    juniorTokens: 0n,
    aUSDC: 0n,
    cUSDT: 0n,
    lpTokens: 0n,
  },
  vaultInfo: {
    aUSDCBalance: 0n,
    cUSDTBalance: 0n,
    totalTokensIssued: 0n,
    emergencyMode: false,
    currentPhase: Phase.DEPOSIT,
    phaseStartTime: 0n,
    cycleStartTime: 0n,
    timeRemaining: 0n,
  },
  seniorTokenAddress: null,
  juniorTokenAddress: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchChain: async () => {},
  depositAsset: async () => {},
  withdraw: async () => {},
  withdrawSeniorTokens: async () => {},
  withdrawAll: async () => {},
  emergencyWithdraw: async () => {},
  toggleEmergencyMode: async () => {},
  forcePhaseTransition: async () => {},
  startNewCycle: async () => {},
  refreshData: async () => {},
  approveToken: async () => {},
  calculateWithdrawalAmounts: async () => ({ aUSDC: 0n, cUSDT: 0n }),
  swapExactTokensForTokens: async () => {},
  getAmountsOut: async () => "0",
  addLiquidity: async () => {},
  getPairReserves: async () => ({ reserve0: 0n, reserve1: 0n }),
  getTokenBalance: async () => 0n,
});

// Inner provider that uses Privy hooks
const InnerWeb3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { ready, authenticated, user, logout, login } = usePrivy();
  const { wallets } = useWallets();
  
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [currentChain, setCurrentChain] = useState<SupportedChainId | null>(null);
  const [isUnsupportedChain, setIsUnsupportedChain] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  
  const [balances, setBalances] = useState<TokenBalances>({
    seniorTokens: 0n,
    juniorTokens: 0n,
    aUSDC: 0n,
    cUSDT: 0n,
    lpTokens: 0n,
  });
  
  const [vaultInfo, setVaultInfo] = useState<VaultInfo>({
    aUSDCBalance: 0n,
    cUSDTBalance: 0n,
    totalTokensIssued: 0n,
    emergencyMode: false,
    currentPhase: Phase.DEPOSIT,
    phaseStartTime: 0n,
    cycleStartTime: 0n,
    timeRemaining: 0n,
  });
  
  const [seniorTokenAddress, setSeniorTokenAddress] = useState<string | null>(null);
  const [juniorTokenAddress, setJuniorTokenAddress] = useState<string | null>(null);

  // Initial state values for cleanup
  const initialBalances: TokenBalances = {
    seniorTokens: 0n,
    juniorTokens: 0n,
    aUSDC: 0n,
    cUSDT: 0n,
    lpTokens: 0n,
  };

  const initialVaultInfo: VaultInfo = {
    aUSDCBalance: 0n,
    cUSDTBalance: 0n,
    totalTokensIssued: 0n,
    emergencyMode: false,
    currentPhase: Phase.DEPOSIT,
    phaseStartTime: 0n,
    cycleStartTime: 0n,
    timeRemaining: 0n,
  };

  // Clear chain-specific state when chain changes
  useEffect(() => {
    if (currentChain) {
      // Clear all chain-specific data to prevent stale data
      setBalances(initialBalances);
      setVaultInfo(initialVaultInfo);
      setSeniorTokenAddress(null);
      setJuniorTokenAddress(null);
      
      console.log(`Cleared state for chain switch to ${currentChain}`);
    }
  }, [currentChain]);

  // Helper function to get contract address for current chain
  const getCurrentChainAddress = useCallback((contractName: ContractName): string | null => {
    if (!currentChain) return null;
    return getContractAddressSafe(currentChain, contractName);
  }, [currentChain]);

  // Setup provider and signer when wallet connects
  useEffect(() => {
    const setupWeb3 = async () => {
      if (!ready || !authenticated || !wallets.length) {
        setProvider(null);
        setSigner(null);
        setAddress(null);
        setChainId(null);
        setCurrentChain(null);
        setIsUnsupportedChain(false);
        return;
      }

      try {
        const wallet = wallets[0];
        if (!wallet.walletClientType || !wallet.address) return;

        // Get the ethereum provider from the wallet
        const ethereumProvider = await wallet.getEthereumProvider();
        if (!ethereumProvider) return;

        const web3Provider = new BrowserProvider(ethereumProvider);
        const network = await web3Provider.getNetwork();
        const networkChainId = Number(network.chainId);
        
        // Check if chain is supported
        if (!isSupportedChain(networkChainId)) {
          setIsUnsupportedChain(true);
          setCurrentChain(null);
          toast.error('Unsupported network. Please switch to a supported chain.');
        } else {
          setIsUnsupportedChain(false);
          setCurrentChain(networkChainId as SupportedChainId);
        }

        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAddress(wallet.address);
        setChainId(networkChainId);
        
        // Only load contract data if on supported chain
        if (isSupportedChain(networkChainId)) {
          await loadContractData(web3Provider, web3Signer, networkChainId as SupportedChainId);
        }
        
      } catch (error) {
        console.error('Error setting up Web3:', error);
        toast.error('Failed to setup Web3 connection');
      }
    };

    setupWeb3();
  }, [ready, authenticated, wallets]);

  // Handle external network changes (e.g., from wallet UI)
  useEffect(() => {
    if (!ready || !authenticated || !wallets.length) return;

    const wallet = wallets[0];
    
    const setupNetworkListener = async () => {
      try {
        const ethereumProvider = await wallet.getEthereumProvider();
        if (!ethereumProvider) return;

        const handleChainChanged = (chainId: string) => {
          const numericChainId = parseInt(chainId, 16);
          console.log('Network changed externally to:', numericChainId);
          
          // Force a page reload to ensure clean state
          // This is a common pattern for multi-chain dApps to avoid state pollution
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        };

        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected wallet - clear state and logout
            logout();
          } else {
            // User switched accounts - reload to clear state
            window.location.reload();
          }
        };

        // Add event listeners
        ethereumProvider.on('chainChanged', handleChainChanged);
        ethereumProvider.on('accountsChanged', handleAccountsChanged);

        // Cleanup function
        return () => {
          ethereumProvider.removeListener('chainChanged', handleChainChanged);
          ethereumProvider.removeListener('accountsChanged', handleAccountsChanged);
        };
      } catch (error) {
        console.error('Error setting up network listeners:', error);
      }
    };

    setupNetworkListener();
  }, [ready, authenticated, wallets, logout]);

  // Load contract data
  const loadContractData = async (provider: BrowserProvider, signer: Signer, chainId: SupportedChainId) => {
    try {
      const vaultAddress = getContractAddress(chainId, ContractName.RISK_VAULT);
      if (!vaultAddress) {
        console.warn('Risk vault not deployed on this chain');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, provider);
      
      // Get token addresses
      const [seniorAddr, juniorAddr] = await Promise.all([
        vaultContract.seniorToken(),
        vaultContract.juniorToken(),
      ]);
      setSeniorTokenAddress(seniorAddr);
      setJuniorTokenAddress(juniorAddr);
      
      // Load balances and vault info
      await refreshData();
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast.error('Failed to load contract data for this network');
    }
  };

  // Connect wallet using Privy
  const handleConnectWallet = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      await logout();
      setBalances({
        seniorTokens: 0n,
        juniorTokens: 0n,
        aUSDC: 0n,
        cUSDT: 0n,
        lpTokens: 0n,
      });
      toast.info('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  // Switch chain function
  const switchChain = async (chainId: SupportedChainId) => {
    if (!wallets.length) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const wallet = wallets[0];
      await wallet.switchChain(chainId);
      toast.success(`Switched to ${getChainConfig(chainId)?.chainName}`);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast.error('Failed to switch network');
    }
  };

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!provider || !signer || !address || !currentChain) return;
    
    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        console.warn('Risk vault not available on current chain');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, provider);
      
      // Get vault info
      const [
        protocolStatus,
        phaseInfo,
        vaultBalances,
        userTokenBalances,
      ] = await Promise.all([
        vaultContract.getProtocolStatus(),
        vaultContract.getPhaseInfo(),
        vaultContract.getVaultBalances(),
        vaultContract.getUserTokenBalances(address),
      ]);
      
      setVaultInfo({
        aUSDCBalance: vaultBalances.aUSDCVaultBalance,
        cUSDTBalance: vaultBalances.cUSDTVaultBalance,
        totalTokensIssued: protocolStatus.totalTokens,
        emergencyMode: protocolStatus.emergency,
        currentPhase: protocolStatus.phase,
        phaseStartTime: phaseInfo.phaseStart,
        cycleStartTime: phaseInfo.cycleStart,
        timeRemaining: phaseInfo.timeRemaining,
      });
      
      // Get user token balances
      const aUSDCAddress = getCurrentChainAddress(ContractName.MOCK_AUSDC);
      const cUSDTAddress = getCurrentChainAddress(ContractName.MOCK_CUSDT);
      const pairAddress = getCurrentChainAddress(ContractName.SENIOR_JUNIOR_PAIR);

      if (!aUSDCAddress || !cUSDTAddress || !pairAddress) {
        console.warn('Some token contracts not available on current chain');
        return;
      }

      const aUSDCContract = new Contract(aUSDCAddress, ERC20_ABI, provider);
      const cUSDTContract = new Contract(cUSDTAddress, ERC20_ABI, provider);
      const pairContract = new Contract(pairAddress, ERC20_ABI, provider);
      
      const [aUSDCBalance, cUSDTBalance, lpBalance] = await Promise.all([
        aUSDCContract.balanceOf(address),
        cUSDTContract.balanceOf(address),
        pairContract.balanceOf(address),
      ]);
      
      setBalances({
        seniorTokens: userTokenBalances.seniorBalance,
        juniorTokens: userTokenBalances.juniorBalance,
        aUSDC: aUSDCBalance,
        cUSDT: cUSDTBalance,
        lpTokens: lpBalance,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  }, [provider, signer, address, currentChain, getCurrentChainAddress]);

  // Approve token spending
  const approveToken = async (tokenAddress: string, amount: string) => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const token = new Contract(tokenAddress, ERC20_ABI, signer);
      const tx = await token.approve(vaultAddress, ethers.parseEther(amount));
      toast.info('Approving token...');
      await tx.wait();
      toast.success('Token approved');
    } catch (error) {
      console.error('Error approving token:', error);
      toast.error('Failed to approve token');
      throw error;
    }
  };

  // Deposit assets
  const depositAsset = async (asset: 'aUSDC' | 'cUSDT', amount: string) => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tokenAddress = asset === 'aUSDC' 
        ? getCurrentChainAddress(ContractName.MOCK_AUSDC)
        : getCurrentChainAddress(ContractName.MOCK_CUSDT);

      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);

      if (!tokenAddress || !vaultAddress) {
        toast.error('Required contracts not available on this network');
        return;
      }
      const amountWei = ethers.parseEther(amount);
      
      // Check allowance first
      const token = new Contract(tokenAddress, ERC20_ABI, signer);
      const allowance = await token.allowance(address, vaultAddress);
      
      if (allowance < amountWei) {
        await approveToken(tokenAddress, amount);
      }
      
      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.depositAsset(tokenAddress, amountWei);
      toast.info('Depositing assets...');
      await tx.wait();
      toast.success(`Successfully deposited ${amount} ${asset}`);
      
      await refreshData();
    } catch (error: any) {
      console.error('Error depositing:', error);
      if (error.reason) {
        toast.error(`Failed to deposit: ${error.reason}`);
      } else {
        toast.error('Failed to deposit assets');
      }
    }
  };

  // Withdraw tokens
  const withdraw = async (seniorAmount: string, juniorAmount: string, preferredAsset?: string) => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      
      // Get the preferred asset address
      let preferredAssetAddress = ethers.ZeroAddress; // Default to proportional
      if (preferredAsset === 'aUSDC') {
        preferredAssetAddress = getCurrentChainAddress(ContractName.MOCK_AUSDC) || ethers.ZeroAddress;
      } else if (preferredAsset === 'cUSDT') {
        preferredAssetAddress = getCurrentChainAddress(ContractName.MOCK_CUSDT) || ethers.ZeroAddress;
      }
      
      const tx = await vaultContract.withdraw(
        ethers.parseEther(seniorAmount),
        ethers.parseEther(juniorAmount),
        preferredAssetAddress
      );
      toast.info('Processing withdrawal...');
      await tx.wait();
      toast.success('Withdrawal successful');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      if (error.reason) {
        toast.error(`Failed to withdraw: ${error.reason}`);
      } else {
        toast.error('Failed to withdraw');
      }
    }
  };

  // Withdraw senior tokens only
  const withdrawSeniorTokens = async (amount: string) => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.withdrawSeniorTokens(ethers.parseEther(amount));
      toast.info('Processing senior token withdrawal...');
      await tx.wait();
      toast.success('Senior tokens withdrawn successfully');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error withdrawing senior tokens:', error);
      if (error.reason) {
        toast.error(`Failed to withdraw: ${error.reason}`);
      } else {
        toast.error('Failed to withdraw senior tokens');
      }
    }
  };

  // Withdraw all tokens
  const withdrawAll = async () => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.withdrawAll();
      toast.info('Processing full withdrawal...');
      await tx.wait();
      toast.success('All tokens withdrawn successfully');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error withdrawing all:', error);
      if (error.reason) {
        toast.error(`Failed to withdraw: ${error.reason}`);
      } else {
        toast.error('Failed to withdraw all tokens');
      }
    }
  };

  // Emergency withdraw
  const emergencyWithdraw = async (seniorAmount: string, preferredAsset: 'aUSDC' | 'cUSDT') => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const assetAddress = preferredAsset === 'aUSDC' 
        ? getCurrentChainAddress(ContractName.MOCK_AUSDC)
        : getCurrentChainAddress(ContractName.MOCK_CUSDT);
      
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);

      if (!assetAddress || !vaultAddress) {
        toast.error('Required contracts not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.emergencyWithdraw(
        ethers.parseEther(seniorAmount),
        assetAddress
      );
      toast.info('Processing emergency withdrawal...');
      await tx.wait();
      toast.success('Emergency withdrawal successful');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error in emergency withdrawal:', error);
      if (error.reason) {
        toast.error(`Failed to withdraw: ${error.reason}`);
      } else {
        toast.error('Failed to perform emergency withdrawal');
      }
    }
  };

  // Admin functions
  const toggleEmergencyMode = async () => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.toggleEmergencyMode();
      toast.info('Toggling emergency mode...');
      await tx.wait();
      toast.success('Emergency mode toggled');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error toggling emergency mode:', error);
      toast.error('Failed to toggle emergency mode - admin access required');
    }
  };

  const forcePhaseTransition = async () => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.forcePhaseTransition();
      toast.info('Forcing phase transition...');
      await tx.wait();
      toast.success('Phase transition forced');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error forcing phase transition:', error);
      toast.error('Failed to force phase transition - admin access required');
    }
  };

  const startNewCycle = async () => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        toast.error('Risk vault not available on this network');
        return;
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, signer);
      const tx = await vaultContract.startNewCycle();
      toast.info('Starting new cycle...');
      await tx.wait();
      toast.success('New cycle started');
      
      await refreshData();
    } catch (error: any) {
      console.error('Error starting new cycle:', error);
      toast.error('Failed to start new cycle - admin access required');
    }
  };

  // Calculate withdrawal amounts
  const calculateWithdrawalAmounts = async (seniorAmount: string, juniorAmount: string) => {
    if (!provider || !currentChain) return { aUSDC: 0n, cUSDT: 0n };

    try {
      const vaultAddress = getCurrentChainAddress(ContractName.RISK_VAULT);
      if (!vaultAddress) {
        console.warn('Risk vault not available on current chain');
        return { aUSDC: 0n, cUSDT: 0n };
      }

      const vaultContract = new Contract(vaultAddress, RISK_VAULT_ABI, provider);
      const amounts = await vaultContract.calculateWithdrawalAmounts(
        ethers.parseEther(seniorAmount),
        ethers.parseEther(juniorAmount)
      );
      return {
        aUSDC: amounts.aUSDCAmount,
        cUSDT: amounts.cUSDTAmount,
      };
    } catch (error) {
      console.error('Error calculating withdrawal amounts:', error);
      return { aUSDC: 0n, cUSDT: 0n };
    }
  };

  // Auto-refresh data periodically
  useEffect(() => {
    if (!authenticated || !address) return;

    const interval = setInterval(() => {
      refreshData();
    }, 500); // Refresh every .5 second for real-time updates

    return () => clearInterval(interval);
  }, [authenticated, address, refreshData]);

  // Define all the inline functions that were in contextValue
  const swapExactTokensForTokens = async (amountIn: string, amountOutMin: string, path: string[]) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amountInWei = ethers.parseEther(amountIn);
      const amountOutMinWei = ethers.parseEther(amountOutMin);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Check token balance first
      const inputToken = new Contract(path[0], ERC20_ABI, signer);
      const balance = await inputToken.balanceOf(address);
      
      if (balance < amountInWei) {
        toast.error('Insufficient token balance');
        return;
      }

      // Approve token spending if needed
      const routerAddress = getCurrentChainAddress(ContractName.UNISWAP_V2_ROUTER);
      if (!routerAddress) {
        toast.error('Uniswap router not available on this network');
        return;
      }

      const allowance = await inputToken.allowance(address, routerAddress);
      
      if (allowance < amountInWei) {
        // Approve maximum amount to avoid repeated approvals
        const maxApproval = ethers.MaxUint256;
        const approveTx = await inputToken.approve(routerAddress, maxApproval);
        toast.info('Approving token...');
        await approveTx.wait();
        toast.success('Token approved');
      }

      // Execute swap
      const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);
      const tx = await router.swapExactTokensForTokens(
        amountInWei,
        amountOutMinWei,
        path,
        address,
        deadline,
      );

      toast.info('Executing swap...');
      await tx.wait();
      toast.success('Swap completed');
      
      await refreshData();
    } catch (error: any) {
      console.error('Swap failed:', error);
      toast.error(error.reason || 'Swap failed');
    }
  };

  const getAmountsOut = async (amountIn: string, path: string[]): Promise<string> => {
    if (!provider) return "0";

    try {
      const routerAddress = getCurrentChainAddress(ContractName.UNISWAP_V2_ROUTER);
      if (!routerAddress) return "0";

      const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, provider);
      const amountInWei = ethers.parseEther(amountIn);
      const amounts = await router.getAmountsOut(amountInWei, path);
      return ethers.formatEther(amounts[amounts.length - 1]);
    } catch (error) {
      console.error('Error getting amounts out:', error);
      return "0";
    }
  };

  const getTokenBalance = async (tokenAddress: string): Promise<bigint> => {
    if (!provider || !address) return 0n;

    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      return balance;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0n;
    }
  };

  const addLiquidity = async (tokenAAmount: string, tokenBAmount: string, tokenA: string, tokenB: string) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amountADesired = ethers.parseEther(tokenAAmount);
      const amountBDesired = ethers.parseEther(tokenBAmount);
      const amountAMin = amountADesired * 95n / 100n; // 5% slippage
      const amountBMin = amountBDesired * 95n / 100n; // 5% slippage
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Approve both tokens
      const tokenAContract = new Contract(tokenA, ERC20_ABI, signer);
      const tokenBContract = new Contract(tokenB, ERC20_ABI, signer);

      const routerAddress = getCurrentChainAddress(ContractName.UNISWAP_V2_ROUTER);
      if (!routerAddress) {
        toast.error('Uniswap router not available on this network');
        return;
      }

      const allowanceA = await tokenAContract.allowance(address, routerAddress);
      const allowanceB = await tokenBContract.allowance(address, routerAddress);

      if (allowanceA < amountADesired) {
        const approveTx = await tokenAContract.approve(routerAddress, amountADesired);
        toast.info(`Approving ${await tokenAContract.symbol()}...`);
        await approveTx.wait();
      }

      if (allowanceB < amountBDesired) {
        const approveTx = await tokenBContract.approve(routerAddress, amountBDesired);
        toast.info(`Approving ${await tokenBContract.symbol()}...`);
        await approveTx.wait();
      }

      // Add liquidity
      const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);
      const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        address,
        deadline,
      );

      toast.info('Adding liquidity...');
      await tx.wait();
      toast.success('Liquidity added');
      
      await refreshData();
    } catch (error: any) {
      console.error('Failed to add liquidity:', error);
      toast.error(error.reason || 'Failed to add liquidity');
    }
  };

  const removeLiquidity = async (lpTokenAmount: string, tokenA: string, tokenB: string) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const lpAmountWei = ethers.parseEther(lpTokenAmount);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Approve LP tokens
      const pairAddress = getCurrentChainAddress(ContractName.SENIOR_JUNIOR_PAIR);
      const routerAddress = getCurrentChainAddress(ContractName.UNISWAP_V2_ROUTER);

      if (!pairAddress || !routerAddress) {
        toast.error('Required contracts not available on this network');
        return;
      }

      const pairContract = new Contract(pairAddress, ERC20_ABI, signer);
      const allowance = await pairContract.allowance(address, routerAddress);

      if (allowance < lpAmountWei) {
        const approveTx = await pairContract.approve(routerAddress, lpAmountWei);
        toast.info('Approving LP tokens...');
        await approveTx.wait();
      }

      // Remove liquidity
      const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);
      const tx = await router.removeLiquidity(
        tokenA,
        tokenB,
        lpAmountWei,
        0, // amountAMin (accept any amount)
        0, // amountBMin (accept any amount)
        address,
        deadline,
      );

      toast.info('Removing liquidity...');
      await tx.wait();
      toast.success('Liquidity removed');
      
      await refreshData();
    } catch (error: any) {
      console.error('Failed to remove liquidity:', error);
      toast.error(error.reason || 'Failed to remove liquidity');
    }
  };

  const getPairReserves = async (pairAddress: string) => {
    if (!provider) return { reserve0: 0n, reserve1: 0n };

    try {
      const pair = new Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
      const [reserve0, reserve1] = await pair.getReserves();
      return { reserve0, reserve1 };
    } catch (error) {
      console.error('Error getting pair reserves:', error);
      return { reserve0: 0n, reserve1: 0n };
    }
  };

  const contextValue: Web3ContextType = {
    isConnected: authenticated && !!address,
    address,
    chainId,
    currentChain,
    isUnsupportedChain,
    provider,
    signer,
    balances,
    vaultInfo,
    seniorTokenAddress,
    juniorTokenAddress,
    connectWallet: handleConnectWallet,
    disconnectWallet,
    switchChain,
    depositAsset,
    withdraw,
    withdrawSeniorTokens,
    withdrawAll,
    emergencyWithdraw,
    toggleEmergencyMode,
    forcePhaseTransition,
    startNewCycle,
    refreshData,
    approveToken,
    calculateWithdrawalAmounts,
    swapExactTokensForTokens,
    getAmountsOut,
    getTokenBalance,
    addLiquidity,
    removeLiquidity,
    getPairReserves,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

// Main Privy provider wrapper
export const PrivyWeb3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || 'your-privy-app-id'}
      config={{
        loginMethods: ['wallet', 'email', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/CoverVault_Favicon.svg',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: {
          id: CHAIN_CONFIG.chainId,
          name: CHAIN_CONFIG.chainName,
          network: CHAIN_CONFIG.networkName,
          nativeCurrency: CHAIN_CONFIG.nativeCurrency,
          rpcUrls: {
            default: {
              http: CHAIN_CONFIG.rpcUrls,
            },
          },
          blockExplorers: {
            default: {
              name: `${CHAIN_CONFIG.chainName} Explorer`,
              url: CHAIN_CONFIG.blockExplorerUrls[0],
            },
          },
        },
        supportedChains: Object.values(CHAIN_CONFIGS).map(config => ({
          id: config.chainId,
          name: config.chainName,
          network: config.networkName,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: {
            default: {
              http: config.rpcUrls,
            },
          },
          blockExplorers: {
            default: {
              name: `${config.chainName} Explorer`,
              url: config.blockExplorerUrls[0],
            },
          },
        })),
      }}
    >
      <InnerWeb3Provider>{children}</InnerWeb3Provider>
    </PrivyProvider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
