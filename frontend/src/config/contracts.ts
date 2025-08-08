// Auto-generated from Ignition deployment artifacts
// DO NOT EDIT MANUALLY - Run 'npm run generate-config' to regenerate

// Supported chain IDs
export enum SupportedChainId {
  HEDERA_TESTNET = 296,
}

// Contract names enum for type safety
export enum ContractName {
  RISK_VAULT = 'RiskVault',
  SENIOR_TOKEN = 'SeniorToken',
  JUNIOR_TOKEN = 'JuniorToken',
  MOCK_AUSDC = 'MockAUSDC',
  MOCK_CUSDT = 'MockCUSDT',
  UNISWAP_V2_FACTORY = 'UniswapV2Factory',
  UNISWAP_V2_ROUTER = 'UniswapV2Router02',
  WETH = 'WETH',
  SENIOR_JUNIOR_PAIR = 'SeniorJuniorPair',
}

// Multi-chain contract addresses
export const MULTI_CHAIN_ADDRESSES: Record<SupportedChainId, Partial<Record<ContractName, string>>> = {
  [SupportedChainId.HEDERA_TESTNET]: {
    [ContractName.MOCK_AUSDC]: "0xc6461cf8E77b40293d90c9670FcC2Da04346Df1A",
    [ContractName.MOCK_CUSDT]: "0xe786547f22F29E477B51135b24A39E937d291d17",
    [ContractName.UNISWAP_V2_FACTORY]: "0x3e83552ED9bF1418Bf50fbc7071C87361Ce156b5",
    [ContractName.WETH]: "0xED6eF615b61D37a5E1cce5D5Aaddc1064Fb9fA07",
    [ContractName.RISK_VAULT]: "0x86840DBAE8aF63780ffFB2990aADDF5C78aeb184",
    [ContractName.UNISWAP_V2_ROUTER]: "0xBA659094Ffd44F3CCcFffd7c172cB42f0aD362b0",
    [ContractName.JUNIOR_TOKEN]: "0x2DDd2DD26A3d90d4a67F02A69728B386B1461710",
    [ContractName.SENIOR_TOKEN]: "0xC5F805bBD905803e5Ec1280827068B9889978cF3",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0x40C4F4B6fB472bFE986134A2A99C691E4323b09E",
  },
};

// Helper function to get contract address for specific chain
export function getContractAddress(chainId: SupportedChainId, contractName: ContractName): string {
  const address = MULTI_CHAIN_ADDRESSES[chainId]?.[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`);
  }
  return address;
}

// Helper function to get all contract addresses for a specific chain
export function getChainContracts(chainId: SupportedChainId): Record<string, string> {
  const contracts = MULTI_CHAIN_ADDRESSES[chainId];
  if (!contracts || Object.keys(contracts).length === 0) {
    throw new Error(`No contracts deployed on chain ${chainId}`);
  }
  return contracts as Record<string, string>;
}

// Legacy export for backward compatibility (deprecated - use getContractAddress instead)
// @deprecated Use getContractAddress(chainId, contractName) instead
export const CONTRACT_ADDRESSES = MULTI_CHAIN_ADDRESSES[SupportedChainId.HEDERA_TESTNET] as Record<string, string>;

// Chain configurations
export const CHAIN_CONFIGS: Record<SupportedChainId, {
  chainId: number;
  chainName: string;
  networkName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  icon: string;
  isTestnet: boolean;
}> = {
  [SupportedChainId.HEDERA_TESTNET]: {
    chainId: 296,
    chainName: "Hedera Testnet",
    networkName: "hedera-testnet",
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 18,
    },
    rpcUrls: ["https://testnet.hashio.io/api"],
    blockExplorerUrls: ["https://hashscan.io/testnet"],
    icon: "ℏ",
    isTestnet: true,
  },
};

// Default chain configuration (Hedera Testnet)
export const DEFAULT_CHAIN_ID = SupportedChainId.HEDERA_TESTNET;
export const CHAIN_CONFIG = CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

// Helper function to get chain config by ID
export function getChainConfig(chainId: number): typeof CHAIN_CONFIGS[SupportedChainId] | null {
  return CHAIN_CONFIGS[chainId as SupportedChainId] || null;
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return Object.values(SupportedChainId).includes(chainId as SupportedChainId);
}

// Helper function to get contract address safely without throwing
export function getContractAddressSafe(
  chainId: SupportedChainId, 
  contractName: ContractName
): string | null {
  try {
    return getContractAddress(chainId, contractName);
  } catch {
    return null;
  }
}

// Helper function to check if a contract is deployed on a chain
export function isContractDeployed(
  chainId: SupportedChainId, 
  contractName: ContractName
): boolean {
  return getContractAddressSafe(chainId, contractName) !== null;
}

// Helper function to get deployment status for all contracts on a chain
export function getChainDeploymentStatus(chainId: SupportedChainId): Record<ContractName, boolean> {
  const status = {} as Record<ContractName, boolean>;
  
  Object.values(ContractName).forEach(contractName => {
    status[contractName] = isContractDeployed(chainId, contractName);
  });
  
  return status;
}

// Phase enum matching the smart contract
export enum Phase {
  ACTIVE = 0,
  CLAIMS = 1,
  FINAL_CLAIMS = 2,
}

export const PHASE_NAMES = {
  [Phase.ACTIVE]: "Active Period",
  [Phase.CLAIMS]: "Claims Period", 
  [Phase.FINAL_CLAIMS]: "Final Claims Period",
} as const;

// Utility function to get phase name from BigInt
export function getPhaseNameFromBigInt(phase: bigint | undefined): string {
  if (phase === undefined) return 'Loading...';
  return PHASE_NAMES[Number(phase) as Phase] || `Unknown Phase (${phase.toString()})`;
}

// Phase durations in seconds (matching smart contract)
export const PHASE_DURATIONS = {
  [Phase.ACTIVE]: 5 * 24 * 60 * 60, // 5 days
  [Phase.CLAIMS]: 1 * 24 * 60 * 60, // 1 day
  [Phase.FINAL_CLAIMS]: 1 * 24 * 60 * 60, // 1 day
} as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  network: "Hedera Testnet",
  chainId: 296,
  deployedAt: 1751731602070,
  deploymentBlock: "Latest", // Could be extracted from deployment artifacts
} as const;
