const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🌙 Deploying to Moonbeam with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DEV");
  
  const deployments = {};
  
  try {
    // Phase 1: Deploy Core Infrastructure
    console.log("\n📦 Phase 1: Deploying Core Infrastructure...");
    
    // Deploy mock yield tokens
    console.log("Deploying MockAUSDC...");
    const MockAUSDC = await ethers.getContractFactory("MockAUSDC");
    const mockAUSDC = await MockAUSDC.deploy();
    await mockAUSDC.waitForDeployment();
    deployments.mockAUSDC = await mockAUSDC.getAddress();
    console.log("✅ MockAUSDC:", deployments.mockAUSDC);
    
    console.log("Deploying MockCUSDT...");
    const MockCUSDT = await ethers.getContractFactory("MockCUSDT");
    const mockCUSDT = await MockCUSDT.deploy();
    await mockCUSDT.waitForDeployment();
    deployments.mockCUSDT = await mockCUSDT.getAddress();
    console.log("✅ MockCUSDT:", deployments.mockCUSDT);
    
    // Deploy WETH
    console.log("Deploying WETH...");
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    deployments.weth = await weth.getAddress();
    console.log("✅ WETH:", deployments.weth);
    
    // Deploy Uniswap Factory
    console.log("Deploying UniswapV2Factory...");
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    const uniswapFactory = await UniswapV2Factory.deploy(deployer.address);
    await uniswapFactory.waitForDeployment();
    deployments.uniswapFactory = await uniswapFactory.getAddress();
    console.log("✅ UniswapV2Factory:", deployments.uniswapFactory);
    
    // Deploy Uniswap Router
    console.log("Deploying UniswapV2Router02...");
    const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
    const uniswapRouter = await UniswapV2Router02.deploy(deployments.uniswapFactory, deployments.weth);
    await uniswapRouter.waitForDeployment();
    deployments.uniswapRouter = await uniswapRouter.getAddress();
    console.log("✅ UniswapV2Router02:", deployments.uniswapRouter);
    
    // Deploy RiskVault
    console.log("Deploying RiskVault...");
    const RiskVault = await ethers.getContractFactory("RiskVault");
    const riskVault = await RiskVault.deploy(deployments.mockAUSDC, deployments.mockCUSDT);
    await riskVault.waitForDeployment();
    deployments.riskVault = await riskVault.getAddress();
    console.log("✅ RiskVault:", deployments.riskVault);
    
    // Phase 2: Initialize with Tokens
    console.log("\n🪙 Phase 2: Minting and Setting up Tokens...");
    
    const aUSDCAmount = ethers.parseEther("100000"); // 100k aUSDC
    const cUSDTAmount = ethers.parseEther("100000"); // 100k cUSDT
    
    console.log("Minting aUSDC...");
    let tx = await mockAUSDC.mint(deployer.address, aUSDCAmount);
    await tx.wait();
    console.log("✅ Minted 100k aUSDC");
    
    console.log("Minting cUSDT...");
    tx = await mockCUSDT.mint(deployer.address, cUSDTAmount);
    await tx.wait();
    console.log("✅ Minted 100k cUSDT");
    
    // Phase 3: Deposit Assets and Create Risk Tokens
    console.log("\n💰 Phase 3: Creating Risk Tokens...");
    
    const depositAmount = ethers.parseEther("50000"); // 50k each
    
    console.log("Approving aUSDC for RiskVault...");
    tx = await mockAUSDC.approve(deployments.riskVault, depositAmount);
    await tx.wait();
    console.log("✅ Approved aUSDC");
    
    console.log("Approving cUSDT for RiskVault...");
    tx = await mockCUSDT.approve(deployments.riskVault, depositAmount);
    await tx.wait();
    console.log("✅ Approved cUSDT");
    
    console.log("Depositing aUSDC...");
    tx = await riskVault.depositAsset(deployments.mockAUSDC, depositAmount);
    await tx.wait();
    console.log("✅ Deposited 50k aUSDC");
    
    console.log("Depositing cUSDT...");
    tx = await riskVault.depositAsset(deployments.mockCUSDT, depositAmount);
    await tx.wait();
    console.log("✅ Deposited 50k cUSDT");
    
    // Get risk token addresses
    deployments.seniorToken = await riskVault.seniorToken();
    deployments.juniorToken = await riskVault.juniorToken();
    console.log("✅ Senior Token:", deployments.seniorToken);
    console.log("✅ Junior Token:", deployments.juniorToken);
    
    // Phase 4: Create Liquidity Infrastructure
    console.log("\n🔄 Phase 4: Setting up Liquidity...");
    
    // Create liquidity pair
    console.log("Creating liquidity pair...");
    try {
      // Check if pair already exists
      let pairAddress = await uniswapFactory.getPair(deployments.seniorToken, deployments.juniorToken);
      
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        tx = await uniswapFactory.createPair(deployments.seniorToken, deployments.juniorToken);
        const receipt = await tx.wait();
        
        // Get pair address from event
        const pairCreatedEvent = receipt.logs.find(log => {
          try {
            const decoded = uniswapFactory.interface.parseLog(log);
            return decoded.name === "PairCreated";
          } catch (e) {
            return false;
          }
        });
        
        pairAddress = pairCreatedEvent ? uniswapFactory.interface.parseLog(pairCreatedEvent).args.pair : null;
        console.log("✅ Created new pair");
      } else {
        console.log("✅ Using existing pair");
      }
      
      deployments.liquidityPair = pairAddress;
      console.log("✅ Liquidity Pair:", deployments.liquidityPair);
      
    } catch (error) {
      if (error.message.includes("PAIR_EXISTS")) {
        deployments.liquidityPair = await uniswapFactory.getPair(deployments.seniorToken, deployments.juniorToken);
        console.log("✅ Using existing pair:", deployments.liquidityPair);
      } else {
        throw error;
      }
    }
    
    // Add liquidity
    console.log("Adding initial liquidity...");
    const liquidityAmount = ethers.parseEther("50000"); // 50k of each token
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    // Get risk token contracts
    const seniorToken = await ethers.getContractAt("RiskToken", deployments.seniorToken);
    const juniorToken = await ethers.getContractAt("RiskToken", deployments.juniorToken);
    
    console.log("Approving senior token for router...");
    tx = await seniorToken.approve(deployments.uniswapRouter, liquidityAmount);
    await tx.wait();
    console.log("✅ Approved senior token");
    
    console.log("Approving junior token for router...");
    tx = await juniorToken.approve(deployments.uniswapRouter, liquidityAmount);
    await tx.wait();
    console.log("✅ Approved junior token");
    
    console.log("Adding liquidity to pair...");
    tx = await uniswapRouter.addLiquidity(
      deployments.seniorToken,
      deployments.juniorToken,
      liquidityAmount,
      liquidityAmount,
      0, // min amounts
      0,
      deployer.address,
      deadline
    );
    await tx.wait();
    console.log("✅ Added liquidity");
    
    // Phase 5: Save Deployment Info
    console.log("\n💾 Phase 5: Saving Deployment Info...");
    
    const deploymentInfo = {
      network: "moonbeamTestnet",
      chainId: 1287,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployments
    };
    
    const deploymentPath = path.join(__dirname, "..", "deployments", "moonbeam-testnet.json");
    
    // Ensure deployments directory exists
    const deploymentsDir = path.dirname(deploymentPath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Deployment info saved to:", deploymentPath);
    
    // Final Summary
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("==========================================");
    console.log("Network: Moonbeam Testnet (Chain ID: 1287)");
    console.log("Deployer:", deployer.address);
    console.log("\n📋 Contract Addresses:");
    console.log("MockAUSDC:", deployments.mockAUSDC);
    console.log("MockCUSDT:", deployments.mockCUSDT);
    console.log("WETH:", deployments.weth);
    console.log("UniswapV2Factory:", deployments.uniswapFactory);
    console.log("UniswapV2Router02:", deployments.uniswapRouter);
    console.log("RiskVault:", deployments.riskVault);
    console.log("Senior Token:", deployments.seniorToken);
    console.log("Junior Token:", deployments.juniorToken);
    console.log("Liquidity Pair:", deployments.liquidityPair);
    console.log("==========================================");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });