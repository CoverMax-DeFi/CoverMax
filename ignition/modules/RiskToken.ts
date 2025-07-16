import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RiskTokenModule = buildModule("RiskTokenModule", (m) => {
  // Deploy mock yield tokens first - no constructor args needed
  const mockAUSDC = m.contract("MockAUSDC");
  const mockCUSDT = m.contract("MockCUSDT");

  // Deploy Uniswap contracts for DEX functionality
  const weth = m.contract("WETH");
  const uniswapFactory = m.contract("UniswapV2Factory", [m.getAccount(0)]);
  const uniswapRouter = m.contract("UniswapV2Router02", [uniswapFactory, weth]);

  // Deploy RiskVault - it will create the RiskToken contracts internally
  const riskVault = m.contract("RiskVault", [
    mockAUSDC,
    mockCUSDT
  ]);

  // Mint 100k tokens for deployer
  const deployerAddress = m.getAccount(0);
  const aUSDCAmount = 100000n * 10n ** 18n; // 100k aUSDC
  const cUSDTAmount = 100000n * 10n ** 18n; // 100k cUSDT

  m.call(mockAUSDC, "mint", [deployerAddress, aUSDCAmount]);
  m.call(mockCUSDT, "mint", [deployerAddress, cUSDTAmount]);

  // Approve RiskVault to spend tokens
  const depositAmount = 50000n * 10n ** 18n; // 50k each
  m.call(mockAUSDC, "approve", [riskVault, depositAmount]);
  m.call(mockCUSDT, "approve", [riskVault, depositAmount]);

  // Deposit into CoverMax to get risk tokens
  m.call(riskVault, "depositAsset", [mockAUSDC, depositAmount], { id: "depositAUSDC" });
  m.call(riskVault, "depositAsset", [mockCUSDT, depositAmount], { id: "depositCUSDT" });

  // Get the tranche token addresses from the RiskVault public variables
  const seniorTokenAddress = m.staticCall(riskVault, "seniorToken");
  const juniorTokenAddress = m.staticCall(riskVault, "juniorToken");

  // Create only the cross-tranche liquidity pool
  const pairCreation = m.call(uniswapFactory, "createPair", [seniorTokenAddress, juniorTokenAddress]);
  const pairAddress = m.readEventArgument(pairCreation, "PairCreated", "pair");
  const seniorJuniorPair = m.contractAt("UniswapV2Pair", pairAddress);

  // Add initial liquidity to the cross-tranche pair
  const liquidityAmount = 50000n * 10n ** 18n; // 50k of each token
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes deadline
  
  // Approve router to spend risk tokens (need to call on the actual token contracts)
  const seniorApproval = m.call(m.contractAt("RiskToken", seniorTokenAddress, { id: "seniorTokenContract" }), "approve", [uniswapRouter, liquidityAmount], { id: "approveSenior" });
  const juniorApproval = m.call(m.contractAt("RiskToken", juniorTokenAddress, { id: "juniorTokenContract" }), "approve", [uniswapRouter, liquidityAmount], { id: "approveJunior" });
  
  m.call(uniswapRouter, "addLiquidity", [
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
    after: [seniorApproval, juniorApproval]
  });

  return { 
    mockAUSDC, 
    mockCUSDT, 
    riskVault,
    weth,
    uniswapFactory,
    uniswapRouter,
    seniorJuniorPair
  };
});

export default RiskTokenModule;