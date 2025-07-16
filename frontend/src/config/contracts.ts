// Auto-generated from Ignition deployment artifacts
// DO NOT EDIT MANUALLY - Run 'npm run generate-config' to regenerate

// Supported chain IDs
export enum SupportedChainId {
  FLOW_TESTNET = 545,
  HEDERA_TESTNET = 296,
  MANTLE_TESTNET = 5003,
  XRPL_TESTNET = 1449000,
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
    [ContractName.MOCK_AUSDC]: "0x2Ec140Ba967BD9d2B5C0C138F22E20A530beFaF4",
    [ContractName.MOCK_CUSDT]: "0xbc20b977781705589EC578aC7d5680Af821D4c1c",
    [ContractName.UNISWAP_V2_FACTORY]: "0x0310c9Cf82c2b0a426F2a5e09d1d670B31442a63",
    [ContractName.WETH]: "0x86840528937f5f1578601d3d31Bc7cFF6A540009",
    [ContractName.RISK_VAULT]: "0x78a9bCbA870A367559258AAAC5b7e533cF9C0EB7",
    [ContractName.UNISWAP_V2_ROUTER]: "0x80E7C7932059ce5E67506B0BC25971B8209e003f",
    [ContractName.JUNIOR_TOKEN]: "0xc3e818236440461916BF75C91bd28Bb27bEa746e",
    [ContractName.SENIOR_TOKEN]: "0x9c6A5C213F5CB326186E876C3e37ec8F73768b2B",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0xb6368834321662839717dbd3dea511525B8382B5",
  },
  [SupportedChainId.FLOW_TESTNET]: {
    [ContractName.MOCK_AUSDC]: "0x27448B112B42c930915bF3953A691c80BdcE7208",
    [ContractName.MOCK_CUSDT]: "0x39b0982322FfbFd17Bc705ef6E55dc92581337Ef",
    [ContractName.UNISWAP_V2_FACTORY]: "0x59Bb52f2F93eA480df5d4549C12F5062Adccd087",
    [ContractName.WETH]: "0xFb01cCbf406E820163911D0A37d89Bab72A85399",
    [ContractName.RISK_VAULT]: "0x0b6371795b2Ef3149dbd3803eeaf8576282C127A",
    [ContractName.UNISWAP_V2_ROUTER]: "0x0357D34e591C25b78565611C9d3401553Fff9737",
    [ContractName.JUNIOR_TOKEN]: "0xA050373612033aA1440a549496400cA48a84Cbdd",
    [ContractName.SENIOR_TOKEN]: "0xd3ef53FC2874522Aee118640f6e4B632573Ea474",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0x8609546aE826d023c804a48218FD5EC3037e2059",
  },
  [SupportedChainId.MANTLE_TESTNET]: {
    [ContractName.MOCK_AUSDC]: "0x0ad1167FaEAE7e0E64d3C050fa85e0a0ff53A19f",
    [ContractName.MOCK_CUSDT]: "0x6dea81C0967C9eE8B9FABd550b3dfcAab105f0ae",
    [ContractName.UNISWAP_V2_FACTORY]: "0x93d20A1AEdE9E0Ac4feBE08B5D40847746117863",
    [ContractName.WETH]: "0xAa933E28370bCEab3424830b7EA95f493464f59b",
    [ContractName.RISK_VAULT]: "0x070A30b9299F744352F6Bef5fD18f58E44b2a6eb",
    [ContractName.UNISWAP_V2_ROUTER]: "0xe40539a72c42D4E4D193f5342aCCfc45F8134B23",
    [ContractName.JUNIOR_TOKEN]: "0xfB7A47A1AF866CCaE1E6212732B403AB2c5844C5",
    [ContractName.SENIOR_TOKEN]: "0xBe2b463cf7679B1939628F54A380AC241547A6F6",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0x1bd0D0D09e0ed8e417dDae0Ca6160f985B3cfc66",
  },
  [SupportedChainId.XRPL_TESTNET]: {
    [ContractName.MOCK_AUSDC]: "0x88a6B75bf7376De9FF3E602f8FF0C160b89D8a3A",
    [ContractName.MOCK_CUSDT]: "0x012c9515Eb3d86C5A1b13195AfaC785919C4CF5b",
    [ContractName.UNISWAP_V2_FACTORY]: "0x89f5f743489A156688B83C520832D340cE12EBE7",
    [ContractName.WETH]: "0x799DaD27F8038517c1031fCB05dFEdde4721409F",
    [ContractName.RISK_VAULT]: "0xD3ce5cbC4F11eCC53Eb2B2B151378E49E9171B3b",
    [ContractName.UNISWAP_V2_ROUTER]: "0xf2862D664074Dc003f75848dc67cB8efd8baCac2",
    [ContractName.JUNIOR_TOKEN]: "0x1EC0632176F4Ca8CA8E95d2c85419BC37cc8DF74",
    [ContractName.SENIOR_TOKEN]: "0x28Fa1c3e924b4969759513f1351212F705ec3e86",
    [ContractName.SENIOR_JUNIOR_PAIR]: "0x60ce2ef9253dc447090aDcebA3530a9eC6BD75F0",
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
export const CONTRACT_ADDRESSES = MULTI_CHAIN_ADDRESSES[SupportedChainId.FLOW_TESTNET] as Record<string, string>;

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
  [SupportedChainId.FLOW_TESTNET]: {
    chainId: 545,
    chainName: "Flow Testnet",
    networkName: "flow-testnet",
    nativeCurrency: {
      name: "FLOW",
      symbol: "FLOW",
      decimals: 18,
    },
    rpcUrls: ["https://testnet.evm.nodes.onflow.org"],
    blockExplorerUrls: ["https://evm-testnet.flowscan.io"],
    icon: "🌊",
    isTestnet: true,
  },
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
  [SupportedChainId.MANTLE_TESTNET]: {
    chainId: 5003,
    chainName: "Mantle Sepolia",
    networkName: "mantle-testnet",
    nativeCurrency: {
      name: "MNT",
      symbol: "MNT",
      decimals: 18,
    },
    rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
    blockExplorerUrls: ["https://sepolia.mantlescan.xyz"],
    icon: "🧩",
    isTestnet: true,
  },
  [SupportedChainId.XRPL_TESTNET]: {
    chainId: 1449000,
    chainName: "XRPL EVM Sidechain",
    networkName: "xrpl-testnet",
    nativeCurrency: {
      name: "XRP",
      symbol: "XRP",
      decimals: 18,
    },
    rpcUrls: ["https://rpc.testnet.xrplevm.org"],
    blockExplorerUrls: ["https://explorer.testnet.xrplevm.org"],
    icon: "💧",
    isTestnet: true,
  },
};

// Default chain configuration (Flow Testnet)
export const DEFAULT_CHAIN_ID = SupportedChainId.FLOW_TESTNET;
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
  network: "Flow Testnet",
  chainId: 545,
  deployedAt: 1751731602070,
  deploymentBlock: "Latest", // Could be extracted from deployment artifacts
} as const;
