import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Phase 1: Infrastructure Module
const InfrastructureModule = buildModule("InfrastructureModule", (m) => {
  const mockAUSDC = m.contract("MockAUSDC");
  const mockCUSDT = m.contract("MockCUSDT");
  const weth = m.contract("WETH");
  const uniswapFactory = m.contract("UniswapV2Factory", [m.getAccount(0)]);
  const uniswapRouter = m.contract("UniswapV2Router02", [uniswapFactory, weth]);
  
  return { mockAUSDC, mockCUSDT, weth, uniswapFactory, uniswapRouter };
});

// Phase 2: RiskVault Module
const RiskVaultModule = buildModule("RiskVaultModule", (m) => {
  const { mockAUSDC, mockCUSDT } = m.useModule(InfrastructureModule);
  
  const riskVault = m.contract("RiskVault", [mockAUSDC, mockCUSDT]);
  
  return { riskVault };
});

// Phase 3: Token Operations Module
const TokenOperationsModule = buildModule("TokenOperationsModule", (m) => {
  const { mockAUSDC, mockCUSDT } = m.useModule(InfrastructureModule);
  const { riskVault } = m.useModule(RiskVaultModule);
  
  const deployerAddress = m.getAccount(0);
  const mintAmount = 100000n * 10n ** 18n;
  const depositAmount = 50000n * 10n ** 18n;
  
  // Mint operations
  const mintAUSDC = m.call(mockAUSDC, "mint", [deployerAddress, mintAmount], { 
    id: "mintAUSDC" 
  });
  const mintCUSDT = m.call(mockCUSDT, "mint", [deployerAddress, mintAmount], { 
    id: "mintCUSDT" 
  });
  
  // Approve operations (depend on mints)
  const approveAUSDC = m.call(mockAUSDC, "approve", [riskVault, depositAmount], { 
    id: "approveAUSDC",
    after: [mintAUSDC]
  });
  const approveCUSDT = m.call(mockCUSDT, "approve", [riskVault, depositAmount], { 
    id: "approveCUSDT",
    after: [mintCUSDT]
  });
  
  // Deposit operations (depend on approvals)
  const depositAUSDC = m.call(riskVault, "depositAsset", [mockAUSDC, depositAmount], { 
    id: "depositAUSDC",
    after: [approveAUSDC]
  });
  const depositCUSDT = m.call(riskVault, "depositAsset", [mockCUSDT, depositAmount], { 
    id: "depositCUSDT",
    after: [approveCUSDT]
  });
  
  return { depositAUSDC, depositCUSDT };
});

// Phase 4: Liquidity Module
const LiquidityModule = buildModule("LiquidityModule", (m) => {
  const { uniswapFactory, uniswapRouter } = m.useModule(InfrastructureModule);
  const { riskVault } = m.useModule(RiskVaultModule);
  const { depositAUSDC, depositCUSDT } = m.useModule(TokenOperationsModule);
  
  // Get risk token addresses after deposits
  const seniorTokenAddress = m.staticCall(riskVault, "seniorToken", [], {
    after: [depositAUSDC, depositCUSDT]
  });
  const juniorTokenAddress = m.staticCall(riskVault, "juniorToken", [], {
    after: [depositAUSDC, depositCUSDT]
  });
  
  // Create pair
  const pairCreation = m.call(uniswapFactory, "createPair", [seniorTokenAddress, juniorTokenAddress], {
    id: "createPair",
    after: [seniorTokenAddress, juniorTokenAddress]
  });
  const pairAddress = m.readEventArgument(pairCreation, "PairCreated", "pair");
  const seniorJuniorPair = m.contractAt("UniswapV2Pair", pairAddress);
  
  // Approve and add liquidity
  const liquidityAmount = 50000n * 10n ** 18n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  const deployerAddress = m.getAccount(0);
  
  const seniorToken = m.contractAt("RiskToken", seniorTokenAddress, { id: "seniorTokenContract" });
  const juniorToken = m.contractAt("RiskToken", juniorTokenAddress, { id: "juniorTokenContract" });
  
  const seniorApproval = m.call(seniorToken, "approve", [uniswapRouter, liquidityAmount], { 
    id: "approveSenior",
    after: [pairCreation]
  });
  const juniorApproval = m.call(juniorToken, "approve", [uniswapRouter, liquidityAmount], { 
    id: "approveJunior",
    after: [pairCreation]
  });
  
  const addLiquidity = m.call(uniswapRouter, "addLiquidity", [
    seniorTokenAddress,
    juniorTokenAddress,
    liquidityAmount,
    liquidityAmount,
    0n,
    0n,
    deployerAddress,
    deadline
  ], { 
    id: "addLiquidityPair",
    after: [seniorApproval, juniorApproval]
  });
  
  return { seniorJuniorPair, addLiquidity };
});

// Main Module that combines all phases
const RiskTokenPhasedModule = buildModule("RiskTokenPhasedModule", (m) => {
  const infrastructure = m.useModule(InfrastructureModule);
  const { riskVault } = m.useModule(RiskVaultModule);
  const tokenOps = m.useModule(TokenOperationsModule);
  const { seniorJuniorPair } = m.useModule(LiquidityModule);
  
  return {
    ...infrastructure,
    riskVault,
    seniorJuniorPair
  };
});

export default RiskTokenPhasedModule;