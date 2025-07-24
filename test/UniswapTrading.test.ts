// test/UniswapTrading.test.ts

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ZeroAddress } = require("ethers");

describe("Uniswap Trading Tests", function () {
  let vault;
  let ausdc;
  let cusdt;
  let owner, user;
  let factory;
  let router;
  let weth;
  let seniorToken;
  let juniorToken;
  let seniorJuniorPair;
  let seniorAUSDCPair;
  let juniorCUSDTPair;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Deploy mocks
    const MockAUSDCFactory = await ethers.getContractFactory("MockAUSDC");
    ausdc = await MockAUSDCFactory.deploy();

    const MockCUSDTFactory = await ethers.getContractFactory("MockCUSDT");
    cusdt = await MockCUSDTFactory.deploy();

    // Deploy vault
    const VaultFactory = await ethers.getContractFactory("RiskVault");
    vault = await VaultFactory.deploy(await ausdc.getAddress(), await cusdt.getAddress());

    // Mint tokens to user - need enough to have >1000 of each risk token for Uniswap
    // Multiple tests will consume tokens, so we need much more
    await ausdc.mint(user.address, 20000);
    await cusdt.mint(user.address, 20000);

    // Deploy Uniswap contracts using installed packages
    const WETHFactory = await ethers.getContractFactory("WETH");
    weth = await WETHFactory.deploy();

    const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2FactoryFactory.deploy(owner.address);

    const UniswapV2Router02Factory = await ethers.getContractFactory("UniswapV2Router02");
    router = await UniswapV2Router02Factory.deploy(await factory.getAddress(), await weth.getAddress());

    // Get token addresses from vault
    seniorToken = await ethers.getContractAt("RiskToken", await vault.seniorToken());
    juniorToken = await ethers.getContractAt("RiskToken", await vault.juniorToken());

    // Setup initial tokens for trading - deposit enough to get >1000 of each risk token
    // Multiple tests will consume tokens, so deposit more
    await ausdc.connect(user).approve(await vault.getAddress(), 20000);
    await cusdt.connect(user).approve(await vault.getAddress(), 20000);
    await vault.connect(user).depositAsset(await ausdc.getAddress(), 10000);
    await vault.connect(user).depositAsset(await cusdt.getAddress(), 10000);

    // Verify balances after deposit
    const [seniorBalance, juniorBalance] = await vault.getUserTokenBalances(user.address);
    console.log("User Senior Balance:", seniorBalance.toString());
    console.log("User Junior Balance:", juniorBalance.toString());

    // Create trading pairs
    await factory.createPair(await seniorToken.getAddress(), await juniorToken.getAddress());
    await factory.createPair(await seniorToken.getAddress(), await ausdc.getAddress());
    await factory.createPair(await juniorToken.getAddress(), await cusdt.getAddress());

    seniorJuniorPair = await factory.getPair(await seniorToken.getAddress(), await juniorToken.getAddress());
    seniorAUSDCPair = await factory.getPair(await seniorToken.getAddress(), await ausdc.getAddress());
    juniorCUSDTPair = await factory.getPair(await juniorToken.getAddress(), await cusdt.getAddress());
  });

  describe("Liquidity Provision", function () {
    it("should add liquidity to Senior-Junior pair", async () => {
      // Check actual balances first and use conservative amounts
      const actualSeniorBalance = await seniorToken.balanceOf(user.address);
      const actualJuniorBalance = await juniorToken.balanceOf(user.address);
      
      console.log("Actual Senior Balance:", actualSeniorBalance.toString());
      console.log("Actual Junior Balance:", actualJuniorBalance.toString());

      // For Uniswap V2, need sqrt(amount0 * amount1) > MINIMUM_LIQUIDITY (1000)
      // So need amount0 * amount1 > 1000000. With equal amounts: amount > 1000
      // Now we should have 2000 of each token, so we can use 1500 of each
      const seniorAmount = 1500;
      const juniorAmount = 1500;
      
      // Verify we have enough tokens
      expect(Number(actualSeniorBalance)).to.be.greaterThanOrEqual(seniorAmount);
      expect(Number(actualJuniorBalance)).to.be.greaterThanOrEqual(juniorAmount);
      
      console.log("Using Senior Amount:", seniorAmount);
      console.log("Using Junior Amount:", juniorAmount);


      // Approve tokens for router
      await seniorToken.connect(user).approve(await router.getAddress(), seniorAmount);
      await juniorToken.connect(user).approve(await router.getAddress(), juniorAmount);

      // Verify approvals worked
      const seniorAllowance = await seniorToken.allowance(user.address, await router.getAddress());
      const juniorAllowance = await juniorToken.allowance(user.address, await router.getAddress());
      console.log("Senior Allowance:", seniorAllowance.toString());
      console.log("Junior Allowance:", juniorAllowance.toString());

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600; // 1 hour from now

      // Check if pair exists and has reserves
      const pairAddress = await factory.getPair(await seniorToken.getAddress(), await juniorToken.getAddress());
      console.log("Pair address:", pairAddress);

      if (pairAddress !== ethers.ZeroAddress) {
        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
        const reserves = await pair.getReserves();
        console.log("Reserves before adding liquidity:", reserves);

        // Also check token balances of pair
        const seniorBalanceInPair = await seniorToken.balanceOf(pairAddress);
        const juniorBalanceInPair = await juniorToken.balanceOf(pairAddress);
        console.log("Senior token balance in pair:", seniorBalanceInPair.toString());
        console.log("Junior token balance in pair:", juniorBalanceInPair.toString());
      }

      // Now try the router with proper amounts
      console.log("About to call addLiquidity with amounts:", seniorAmount, juniorAmount);
      await router.connect(user).addLiquidity(
        await seniorToken.getAddress(),
        await juniorToken.getAddress(),
        seniorAmount,
        juniorAmount,
        0, // amountAMin
        0, // amountBMin
        user.address,
        deadline
      );

      // Check liquidity was added
      const pair = await ethers.getContractAt("UniswapV2Pair", seniorJuniorPair);
      const liquidity = await pair.balanceOf(user.address);
      expect(liquidity).to.be.greaterThan(0);
    });

    it("should add liquidity to Senior-aUSDC pair", async () => {
      // Need amounts > 1000 for minimum liquidity
      const seniorAmount = 1200;
      const ausdcAmount = 1200;

      // Check actual balances first
      const actualSeniorBalance = await seniorToken.balanceOf(user.address);
      expect(actualSeniorBalance).to.be.greaterThanOrEqual(seniorAmount);

      // Mint additional aUSDC for liquidity
      await ausdc.mint(user.address, ausdcAmount);

      // Approve tokens
      await seniorToken.connect(user).approve(await router.getAddress(), seniorAmount);
      await ausdc.connect(user).approve(await router.getAddress(), ausdcAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      await router.connect(user).addLiquidity(
        await seniorToken.getAddress(),
        await ausdc.getAddress(),
        seniorAmount,
        ausdcAmount,
        0,
        0,
        user.address,
        deadline
      );

      const pair = await ethers.getContractAt("UniswapV2Pair", seniorAUSDCPair);
      const liquidity = await pair.balanceOf(user.address);
      expect(liquidity).to.be.greaterThan(0);
    });
  });

  describe("Token Swapping", function () {
    beforeEach(async () => {
      // Simplified approach: Only set up the pairs we absolutely need
      // Most tests only need Senior-Junior pair, some need Senior-aUSDC
      // Use smaller amounts to avoid state issues
      
      const liquidityAmount = 1050; // Just above 1000 minimum
      
      console.log("Setting up liquidity for swapping tests...");
      
      // Check available balances
      const seniorBalance = await seniorToken.balanceOf(user.address);
      const juniorBalance = await juniorToken.balanceOf(user.address);
      
      console.log("Available tokens - Senior:", seniorBalance.toString(), "Junior:", juniorBalance.toString());
      
      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      // Set up Senior-Junior pair (needed for most swap tests)
      if (Number(seniorBalance) >= liquidityAmount && Number(juniorBalance) >= liquidityAmount) {
        await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
        await juniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
        
        await router.connect(user).addLiquidity(
          await seniorToken.getAddress(),
          await juniorToken.getAddress(),
          liquidityAmount,
          liquidityAmount,
          0, 0, user.address, deadline
        );
        console.log("Senior-Junior liquidity added");
      }

      // Set up Senior-aUSDC pair (needed for aUSDC swap tests)
      const remainingSenior = await seniorToken.balanceOf(user.address);
      if (Number(remainingSenior) >= liquidityAmount) {
        await ausdc.mint(user.address, liquidityAmount);
        await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
        await ausdc.connect(user).approve(await router.getAddress(), liquidityAmount);
        
        await router.connect(user).addLiquidity(
          await seniorToken.getAddress(),
          await ausdc.getAddress(),
          liquidityAmount,
          liquidityAmount,
          0, 0, user.address, deadline
        );
        console.log("Senior-aUSDC liquidity added");
      }
    });

    it("should swap Senior tokens for Junior tokens", async () => {
      const swapAmount = 10;
      const initialJuniorBalance = await juniorToken.balanceOf(user.address);

      await seniorToken.connect(user).approve(await router.getAddress(), swapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [await seniorToken.getAddress(), await juniorToken.getAddress()];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0, // amountOutMin - accept any amount
        path,
        user.address,
        deadline
      );

      const finalJuniorBalance = await juniorToken.balanceOf(user.address);
      expect(finalJuniorBalance).to.be.greaterThan(initialJuniorBalance);
    });

    it("should swap Junior tokens for Senior tokens", async () => {
      const swapAmount = 10;
      const initialSeniorBalance = await seniorToken.balanceOf(user.address);

      await juniorToken.connect(user).approve(await router.getAddress(), swapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [await juniorToken.getAddress(), await seniorToken.getAddress()];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalSeniorBalance = await seniorToken.balanceOf(user.address);
      expect(finalSeniorBalance).to.be.greaterThan(initialSeniorBalance);
    });

    it("should swap Senior tokens for aUSDC", async () => {
      const swapAmount = 10;
      const initialAUSDCBalance = await ausdc.balanceOf(user.address);

      await seniorToken.connect(user).approve(await router.getAddress(), swapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [await seniorToken.getAddress(), await ausdc.getAddress()];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalAUSDCBalance = await ausdc.balanceOf(user.address);
      expect(finalAUSDCBalance).to.be.greaterThan(initialAUSDCBalance);
    });

    it("should swap aUSDC for Senior tokens", async () => {
      const swapAmount = 10;
      await ausdc.mint(user.address, swapAmount);

      const initialSeniorBalance = await seniorToken.balanceOf(user.address);

      await ausdc.connect(user).approve(await router.getAddress(), swapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [await ausdc.getAddress(), await seniorToken.getAddress()];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalSeniorBalance = await seniorToken.balanceOf(user.address);
      expect(finalSeniorBalance).to.be.greaterThan(initialSeniorBalance);
    });

    it("should execute multi-hop swap: aUSDC -> Senior -> Junior", async () => {
      const swapAmount = 10;
      await ausdc.mint(user.address, swapAmount);

      const initialJuniorBalance = await juniorToken.balanceOf(user.address);

      await ausdc.connect(user).approve(await router.getAddress(), swapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [
        await ausdc.getAddress(),
        await seniorToken.getAddress(),
        await juniorToken.getAddress()
      ];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalJuniorBalance = await juniorToken.balanceOf(user.address);
      expect(finalJuniorBalance).to.be.greaterThan(initialJuniorBalance);
    });
  });

  describe("Liquidity Removal", function () {
    let liquidityTokens;

    beforeEach(async () => {
      // Add initial liquidity - need > 1000 each
      const liquidityAmount = 1200;
      await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
      await juniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      const result = await router.connect(user).addLiquidity(
        await seniorToken.getAddress(),
        await juniorToken.getAddress(),
        liquidityAmount,
        liquidityAmount,
        0, 0, user.address, deadline
      );

      const pair = await ethers.getContractAt("UniswapV2Pair", seniorJuniorPair);
      liquidityTokens = await pair.balanceOf(user.address);
    });

    it("should remove liquidity from Senior-Junior pair", async () => {
      const pair = await ethers.getContractAt("UniswapV2Pair", seniorJuniorPair);
      await pair.connect(user).approve(await router.getAddress(), liquidityTokens);

      const initialSeniorBalance = await seniorToken.balanceOf(user.address);
      const initialJuniorBalance = await juniorToken.balanceOf(user.address);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      await router.connect(user).removeLiquidity(
        await seniorToken.getAddress(),
        await juniorToken.getAddress(),
        liquidityTokens,
        0, // amountAMin
        0, // amountBMin
        user.address,
        deadline
      );

      const finalSeniorBalance = await seniorToken.balanceOf(user.address);
      const finalJuniorBalance = await juniorToken.balanceOf(user.address);

      expect(finalSeniorBalance).to.be.greaterThan(initialSeniorBalance);
      expect(finalJuniorBalance).to.be.greaterThan(initialJuniorBalance);
    });
  });

  describe("Trading During Different Phases", function () {
    it("should allow Uniswap trading during COVERAGE phase", async () => {
      // Move to COVERAGE phase
      await vault.forcePhaseTransitionImmediate();

      // Add liquidity - need > 1000 each
      const liquidityAmount = 1200;
      await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
      await juniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      await router.connect(user).addLiquidity(
        await seniorToken.getAddress(),
        await juniorToken.getAddress(),
        liquidityAmount,
        liquidityAmount,
        0, 0, user.address, deadline
      );

      // Execute swap
      const swapAmount = 10;
      const initialJuniorBalance = await juniorToken.balanceOf(user.address);

      await seniorToken.connect(user).approve(await router.getAddress(), swapAmount);
      const path = [await seniorToken.getAddress(), await juniorToken.getAddress()];

      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalJuniorBalance = await juniorToken.balanceOf(user.address);
      expect(finalJuniorBalance).to.be.greaterThan(initialJuniorBalance);
    });

    it("should allow Uniswap trading during CLAIMS phase", async () => {
      // Move to CLAIMS phase
      await vault.forcePhaseTransitionImmediate(); // DEPOSIT -> COVERAGE
      await vault.forcePhaseTransitionImmediate(); // COVERAGE -> CLAIMS

      // Verify trading still works - need > 1000 each
      const liquidityAmount = 1200;
      await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
      await juniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      await expect(
        router.connect(user).addLiquidity(
          await seniorToken.getAddress(),
          await juniorToken.getAddress(),
          liquidityAmount,
          liquidityAmount,
          0, 0, user.address, deadline
        )
      ).to.not.be.reverted;
    });
  });

  describe("Price Impact and Slippage", function () {
    beforeEach(async () => {
      // Add substantial liquidity to test price impact
      // We already have 2000 each from the main setup, which should be enough
      const actualSeniorBalance = await seniorToken.balanceOf(user.address);
      const actualJuniorBalance = await juniorToken.balanceOf(user.address);
      
      // Use a good portion for liquidity, keeping some for swapping
      const liquidityAmount = 1500;

      await seniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);
      await juniorToken.connect(user).approve(await router.getAddress(), liquidityAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;

      await router.connect(user).addLiquidity(
        await seniorToken.getAddress(),
        await juniorToken.getAddress(),
        liquidityAmount,
        liquidityAmount,
        0, 0, user.address, deadline
      );
    });

    it("should handle large swaps with price impact", async () => {
      const largeSwapAmount = 100; // Large relative to liquidity
      const initialJuniorBalance = await juniorToken.balanceOf(user.address);

      await seniorToken.connect(user).approve(await router.getAddress(), largeSwapAmount);

      const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
      const path = [await seniorToken.getAddress(), await juniorToken.getAddress()];

      // Get expected output before swap
      const expectedOutput = await router.getAmountsOut(largeSwapAmount, path);

      await router.connect(user).swapExactTokensForTokens(
        largeSwapAmount,
        0,
        path,
        user.address,
        deadline
      );

      const finalJuniorBalance = await juniorToken.balanceOf(user.address);
      const actualOutput = finalJuniorBalance - initialJuniorBalance;

      // Verify we got approximately expected output (allowing for some variance)
      expect(actualOutput).to.be.closeTo(expectedOutput[1], expectedOutput[1] / 100n); // Within 1%
    });
  });
});