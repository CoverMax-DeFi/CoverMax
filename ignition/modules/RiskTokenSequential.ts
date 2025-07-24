import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RiskTokenSequentialModule = buildModule("RiskTokenSequentialModule", (m) => {
  // Phase 1: Deploy Core Infrastructure (Sequential)
  // Deploy mock yield tokens first
  const mockAUSDC = m.contract("MockAUSDC");
  const mockCUSDT = m.contract("MockCUSDT", [], { 
    after: [mockAUSDC] // Force sequential: wait for mockAUSDC
  });

  // Deploy WETH after mock tokens
  const weth = m.contract("WETH", [], { 
    after: [mockCUSDT] // Force sequential: wait for mockCUSDT
  });

  // Deploy Uniswap Factory after WETH
  const uniswapFactory = m.contract("UniswapV2Factory", [m.getAccount(0)], { 
    after: [weth] // Force sequential: wait for WETH
  });

  // Deploy Uniswap Router after Factory
  const uniswapRouter = m.contract("UniswapV2Router02", [uniswapFactory, weth], { 
    after: [uniswapFactory] // Force sequential: wait for factory
  });

  // Deploy RiskVault after all infrastructure
  const riskVault = m.contract("RiskVault", [mockAUSDC, mockCUSDT], { 
    after: [uniswapRouter] // Force sequential: wait for router
  });

  // Phase 2: Mint tokens (Sequential)
  const deployerAddress = m.getAccount(0);
  const aUSDCAmount = 100000n * 10n ** 18n; // 100k aUSDC
  const cUSDTAmount = 100000n * 10n ** 18n; // 100k cUSDT

  const mintAUSDC = m.call(mockAUSDC, "mint", [deployerAddress, aUSDCAmount], { 
    id: "mintAUSDC",
    after: [riskVault] // Wait for all contracts to be deployed
  });
  
  const mintCUSDT = m.call(mockCUSDT, "mint", [deployerAddress, cUSDTAmount], { 
    id: "mintCUSDT",
    after: [mintAUSDC] // Force sequential: wait for first mint
  });

  // Phase 3: Approve tokens (Sequential)
  const depositAmount = 50000n * 10n ** 18n; // 50k each
  
  const approveAUSDC = m.call(mockAUSDC, "approve", [riskVault, depositAmount], { 
    id: "approveAUSDC",
    after: [mintCUSDT] // Wait for all mints complete
  });
  
  const approveCUSDT = m.call(mockCUSDT, "approve", [riskVault, depositAmount], { 
    id: "approveCUSDT",
    after: [approveAUSDC] // Force sequential: wait for first approval
  });

  // Phase 4: Deposit assets (Sequential)
  const depositAUSDC = m.call(riskVault, "depositAsset", [mockAUSDC, depositAmount], { 
    id: "depositAUSDC",
    after: [approveCUSDT] // Wait for all approvals
  });
  
  const depositCUSDT = m.call(riskVault, "depositAsset", [mockCUSDT, depositAmount], { 
    id: "depositCUSDT",
    after: [depositAUSDC] // Force sequential: wait for first deposit
  });

  // Phase 5: Get token addresses
  const seniorTokenAddress = m.staticCall(riskVault, "seniorToken");
  
  const juniorTokenAddress = m.staticCall(riskVault, "juniorToken");

  // Phase 6: Create liquidity pool
  const pairCreation = m.call(uniswapFactory, "createPair", [seniorTokenAddress, juniorTokenAddress], { 
    id: "createPair",
    after: [depositCUSDT] // Wait for deposits to complete
  });
  
  const pairAddress = m.readEventArgument(pairCreation, "PairCreated", "pair");
  
  const seniorJuniorPair = m.contractAt("UniswapV2Pair", pairAddress, { 
    id: "pairContract"
  });

  // Phase 7: Approve router for risk tokens (Sequential)
  const liquidityAmount = 50000n * 10n ** 18n; // 50k of each token
  const deadline = 1893456000n; // Far future deadline for deployment
  
  const seniorToken = m.contractAt("RiskToken", seniorTokenAddress, { 
    id: "seniorTokenContract"
  });
  
  const juniorToken = m.contractAt("RiskToken", juniorTokenAddress, { 
    id: "juniorTokenContract"
  });
  
  const seniorApproval = m.call(seniorToken, "approve", [uniswapRouter, liquidityAmount], { 
    id: "approveSenior",
    after: [seniorJuniorPair] // Wait for pair to be created
  });
  
  const juniorApproval = m.call(juniorToken, "approve", [uniswapRouter, liquidityAmount], { 
    id: "approveJunior",
    after: [seniorApproval] // Force sequential: wait for first approval
  });

  // Phase 8: Add liquidity (Final step)
  const addLiquidity = m.call(uniswapRouter, "addLiquidity", [
    seniorTokenAddress,
    juniorTokenAddress,
    liquidityAmount,
    liquidityAmount,
    0n, // min amounts (0 for deployment)
    0n,
    deployerAddress,
    deadline
  ], { 
    id: "addLiquidityPair",
    after: [juniorApproval] // Wait for all approvals
  });

  return { 
    mockAUSDC, 
    mockCUSDT, 
    riskVault,
    weth,
    uniswapFactory,
    uniswapRouter,
    seniorJuniorPair,
    addLiquidity
  };
});

export default RiskTokenSequentialModule;