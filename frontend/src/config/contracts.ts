// Auto-generated from Ignition deployment artifacts
// DO NOT EDIT MANUALLY - Run 'npm run generate-config' to regenerate

// Supported chain IDs
export enum SupportedChainId {
  MOONBEAM_TESTNET = 1287,
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
  [SupportedChainId.MOONBEAM_TESTNET]: {
    [ContractName.MOCK_AUSDC]: "0x7f61393E1E0340ffA9108E1e42004Fe370FFC009",
    [ContractName.MOCK_CUSDT]: "0xD1778a3Ac473bcd84C18fb872a042E58baD7Ca57",
    [ContractName.WETH]: "0x079ae146407027a1Bfe5F6957Ed8108bC4dD1F81",
    [ContractName.UNISWAP_V2_FACTORY]: "0x77b84973c1a3382FEA7768730F467C2325974FEf",
    [ContractName.UNISWAP_V2_ROUTER]: "0x014DD22Fe0dC9fbD4494eFa09c1889a94A801F62",
    [ContractName.RISK_VAULT]: "0x0A3084651A5E3D39B237D8C8a6Ea25B019327ab1",
    [ContractName.JUNIOR_TOKEN]: "0x8b1A793A77B7d09823Fb5ed934E974Ac3E52ca7e",
    [ContractName.SENIOR_TOKEN]: "0x78d186Ab2fB7aCB5Dd85b3D0Dbec58e9F1a8607E",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0x6aa77654014443a443A8490366aD6AD2af529750",
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
export const CONTRACT_ADDRESSES = MULTI_CHAIN_ADDRESSES[SupportedChainId.MOONBEAM_TESTNET] as Record<string, string>;

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
  [SupportedChainId.MOONBEAM_TESTNET]: {
    chainId: 1287,
    chainName: "Moonbase Alpha",
    networkName: "moonbeam-testnet",
    nativeCurrency: {
      name: "DEV",
      symbol: "DEV",
      decimals: 18,
    },
    rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
    blockExplorerUrls: ["https://moonbase.moonscan.io"],
    icon: "🌙",
    isTestnet: true,
  },
};

// Default chain configuration (Moonbeam Testnet)
export const DEFAULT_CHAIN_ID = SupportedChainId.MOONBEAM_TESTNET;
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
  DEPOSIT = 0,
  COVERAGE = 1,
  CLAIMS = 2,
  FINAL_CLAIMS = 3,
}

export const PHASE_NAMES = {
  [Phase.DEPOSIT]: "Deposit Period",
  [Phase.COVERAGE]: "Coverage Period", 
  [Phase.CLAIMS]: "Claims Period",
  [Phase.FINAL_CLAIMS]: "Final Claims Period",
} as const;

// Phase durations in seconds (matching smart contract)
export const PHASE_DURATIONS = {
  [Phase.DEPOSIT]: 2 * 24 * 60 * 60, // 2 days
  [Phase.COVERAGE]: 3 * 24 * 60 * 60, // 3 days
  [Phase.CLAIMS]: 1 * 24 * 60 * 60, // 1 day
  [Phase.FINAL_CLAIMS]: 1 * 24 * 60 * 60, // 1 day
} as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  network: "Moonbase Alpha",
  chainId: 1287,
  deployedAt: 1751731602070,
  deploymentBlock: "Latest", // Could be extracted from deployment artifacts
} as const;
