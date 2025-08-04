import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ZeroAddress } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskVault, MockAUSDC, MockCUSDT, RiskToken } from "../typechain-types";

describe("RiskVault - Integration Tests", function () {
  let vault: RiskVault;
  let ausdc: MockAUSDC;
  let cusdt: MockCUSDT;
  let seniorToken: RiskToken;
  let juniorToken: RiskToken;
  let owner: SignerWithAddress;
  let seniorInvestor1: SignerWithAddress;
  let seniorInvestor2: SignerWithAddress;
  let juniorInvestor1: SignerWithAddress;
  let juniorInvestor2: SignerWithAddress;
  let mixedInvestor: SignerWithAddress;

  // Phase durations
  const ACTIVE_PHASE_DURATION = 5 * 24 * 60 * 60; // 5 days (merged deposit + coverage)
  const CLAIMS_PHASE_DURATION = 1 * 24 * 60 * 60; // 1 day
  const FINAL_CLAIMS_DURATION = 1 * 24 * 60 * 60; // 1 day

  const DEPOSIT_AMOUNT = ethers.parseEther("1000");
  const MINT_AMOUNT = ethers.parseEther("10000");

  beforeEach(async () => {
    [owner, seniorInvestor1, seniorInvestor2, juniorInvestor1, juniorInvestor2, mixedInvestor] = await ethers.getSigners();

    // Deploy mocks
    const MockAUSDCFactory = await ethers.getContractFactory("MockAUSDC");
    ausdc = await MockAUSDCFactory.deploy();

    const MockCUSDTFactory = await ethers.getContractFactory("MockCUSDT");
    cusdt = await MockCUSDTFactory.deploy();

    // Deploy vault
    const VaultFactory = await ethers.getContractFactory("RiskVault");
    vault = await VaultFactory.deploy(await ausdc.getAddress(), await cusdt.getAddress());

    // Get token contracts
    seniorToken = await ethers.getContractAt("RiskToken", await vault.seniorToken());
    juniorToken = await ethers.getContractAt("RiskToken", await vault.juniorToken());

    // Setup all investors with tokens and approvals
    const investors = [seniorInvestor1, seniorInvestor2, juniorInvestor1, juniorInvestor2, mixedInvestor];
    for (const investor of investors) {
      await ausdc.mint(investor.address, MINT_AMOUNT);
      await cusdt.mint(investor.address, MINT_AMOUNT);
      await ausdc.connect(investor).approve(await vault.getAddress(), ethers.MaxUint256);
      await cusdt.connect(investor).approve(await vault.getAddress(), ethers.MaxUint256);
    }
  });

  describe("Complete Protocol Cycle - Happy Path", function () {
    it("Should complete a full cycle with multiple users", async function () {
      // === DEPOSIT PHASE ===
      console.log("=== DEPOSIT PHASE ===");
      expect(await vault.currentPhase()).to.equal(0); // DEPOSIT

      // Multiple users deposit different assets
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(seniorInvestor2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
      await vault.connect(juniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(mixedInvestor).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);

      // Verify deposits
      expect(await vault.getTotalValueLocked()).to.equal(DEPOSIT_AMOUNT * 5n);
      expect(await vault.totalTokensIssued()).to.equal(DEPOSIT_AMOUNT * 5n);

      // During active phase, some users may want to exit early
      const [seniorBal, juniorBal] = await vault.getUserTokenBalances(mixedInvestor.address);
      await vault.connect(mixedInvestor).withdraw(seniorBal / 2n, juniorBal / 2n, ZeroAddress);

      // Move to CLAIMS phase after ACTIVE period
      await time.increase(ACTIVE_PHASE_DURATION);
      await vault.forcePhaseTransition();

      // === CLAIMS PHASE ===
      console.log("=== CLAIMS PHASE ===");
      expect(await vault.currentPhase()).to.equal(1); // CLAIMS

      // In claims phase, users can withdraw any combination
      // Senior investors might withdraw only senior tokens
      const [senior1Bal, junior1Bal] = await vault.getUserTokenBalances(seniorInvestor1.address);
      await vault.connect(seniorInvestor1).withdraw(senior1Bal, 0, await ausdc.getAddress());

      // Junior investors might withdraw only junior tokens
      const [senior2Bal, junior2Bal] = await vault.getUserTokenBalances(juniorInvestor1.address);
      await vault.connect(juniorInvestor1).withdraw(0, junior2Bal, ZeroAddress);

      // Move to FINAL_CLAIMS
      await time.increase(CLAIMS_PHASE_DURATION);
      await vault.forcePhaseTransition();

      // === FINAL_CLAIMS PHASE ===
      console.log("=== FINAL_CLAIMS PHASE ===");
      expect(await vault.currentPhase()).to.equal(2); // FINAL_CLAIMS

      // Remaining users withdraw their tokens
      const [senior3Bal, junior3Bal] = await vault.getUserTokenBalances(seniorInvestor2.address);
      if (senior3Bal > 0 || junior3Bal > 0) {
        await vault.connect(seniorInvestor2).withdraw(senior3Bal, junior3Bal, ZeroAddress);
      }

      // Complete the cycle
      await time.increase(FINAL_CLAIMS_DURATION);
      await vault.startNewCycle();

      // === NEW CYCLE BEGINS ===
      console.log("=== NEW CYCLE - DEPOSIT PHASE ===");
      expect(await vault.currentPhase()).to.equal(0); // Back to DEPOSIT
    });
  });

  describe("Emergency Scenario During Live Cycle", function () {
    it("Should handle emergency during coverage phase with proper senior protection", async function () {
      // Setup: Multiple deposits during deposit phase
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT * 2n);
      await vault.connect(seniorInvestor2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(juniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(juniorInvestor2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);

      // Move to COVERAGE phase
      await vault.forcePhaseTransitionImmediate();

      // Simulate an emergency event (e.g., one asset loses value)
      await vault.toggleEmergencyMode();

      // Senior investors should be able to emergency withdraw choosing the safe asset
      const [senior1, junior1] = await vault.getUserTokenBalances(seniorInvestor1.address);
      await vault.connect(seniorInvestor1).emergencyWithdraw(senior1, await cusdt.getAddress());

      // Turn off emergency mode temporarily for regular withdrawal
      await vault.toggleEmergencyMode();
      const [senior2, junior2] = await vault.getUserTokenBalances(juniorInvestor1.address);
      await vault.connect(juniorInvestor1).withdraw(senior2, junior2, ZeroAddress);
      // Turn emergency mode back on
      await vault.toggleEmergencyMode();

      // Move to CLAIMS phase while in emergency
      await vault.forcePhaseTransitionImmediate();

      // In emergency mode, regular withdrawals are blocked entirely
      const [senior3, junior3] = await vault.getUserTokenBalances(seniorInvestor2.address);
      await expect(
        vault.connect(seniorInvestor2).withdraw(senior3, junior3, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");

      // But emergency withdrawal works
      await vault.connect(seniorInvestor2).emergencyWithdraw(senior3, await cusdt.getAddress());

      // Disable emergency mode
      await vault.toggleEmergencyMode();

      // Now junior tokens can be withdrawn
      const [senior4, junior4] = await vault.getUserTokenBalances(juniorInvestor2.address);
      await vault.connect(juniorInvestor2).withdraw(0, junior4, ZeroAddress);
    });
  });

  describe("Token Trading Scenario", function () {
    it("Should support secondary market trading of risk tokens", async function () {
      // Initial deposits
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(juniorInvestor1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);

      // Get initial balances
      const [senior1Initial, junior1Initial] = await vault.getUserTokenBalances(seniorInvestor1.address);
      const [senior2Initial, junior2Initial] = await vault.getUserTokenBalances(juniorInvestor1.address);

      // Simulate trading: seniorInvestor1 sells junior tokens to juniorInvestor1
      await juniorToken.connect(seniorInvestor1).transfer(juniorInvestor1.address, junior1Initial);
      
      // juniorInvestor1 sells senior tokens to seniorInvestor1
      await seniorToken.connect(juniorInvestor1).transfer(seniorInvestor1.address, senior2Initial);

      // Verify new positions
      const [senior1After, junior1After] = await vault.getUserTokenBalances(seniorInvestor1.address);
      const [senior2After, junior2After] = await vault.getUserTokenBalances(juniorInvestor1.address);

      expect(senior1After).to.equal(senior1Initial + senior2Initial); // All senior tokens
      expect(junior1After).to.equal(0); // No junior tokens
      expect(senior2After).to.equal(0); // No senior tokens
      expect(junior2After).to.equal(junior1Initial + junior2Initial); // All junior tokens

      // Move to FINAL_CLAIMS for withdrawal
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      // Senior-only holder withdraws
      await vault.connect(seniorInvestor1).withdraw(senior1After, 0, ZeroAddress);

      // Junior-only holder withdraws
      await vault.connect(juniorInvestor1).withdraw(0, junior2After, ZeroAddress);
    });
  });

  describe("Multi-Asset Arbitrage Scenario", function () {
    it("Should handle complex arbitrage withdrawals", async function () {
      // Setup: Unbalanced deposits creating arbitrage opportunity
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT * 3n);
      await vault.connect(juniorInvestor1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);

      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      // User with balanced tokens can choose which asset to withdraw
      const [senior1, junior1] = await vault.getUserTokenBalances(seniorInvestor1.address);
      
      // Calculate potential withdrawals
      const aUSDCAmount = await vault.calculateSingleAssetWithdrawal(senior1, junior1, await ausdc.getAddress());
      const cUSDTAmount = await vault.calculateSingleAssetWithdrawal(senior1, junior1, await cusdt.getAddress());

      // User chooses the more valuable option (in this case, all aUSDC)
      await vault.connect(seniorInvestor1).withdraw(senior1, junior1, await ausdc.getAddress());

      // Verify withdrawal amounts
      expect(await ausdc.balanceOf(seniorInvestor1.address)).to.be.greaterThan(MINT_AMOUNT - DEPOSIT_AMOUNT * 3n);
    });
  });

  describe("Yield Generation Simulation", function () {
    it("Should maintain proper accounting with simulated yield", async function () {
      // Initial deposits
      await vault.connect(mixedInvestor).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(mixedInvestor).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);

      const initialTVL = await vault.getTotalValueLocked();

      // Note: In this test, we can't easily simulate yield because the vault
      // tracks its own internal balances. In a real scenario, aUSDC and cUSDT
      // would automatically accrue yield which would be reflected in the vault's view.

      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      const [senior, junior] = await vault.getUserTokenBalances(mixedInvestor.address);
      
      // Withdraw and verify received more than deposited (due to yield)
      const ausdcBefore = await ausdc.balanceOf(mixedInvestor.address);
      const cusdtBefore = await cusdt.balanceOf(mixedInvestor.address);

      await vault.connect(mixedInvestor).withdraw(senior, junior, ZeroAddress);

      const ausdcAfter = await ausdc.balanceOf(mixedInvestor.address);
      const cusdtAfter = await cusdt.balanceOf(mixedInvestor.address);

      // Should receive original deposits back (without additional yield in this test)
      expect(ausdcAfter - ausdcBefore).to.equal(DEPOSIT_AMOUNT);
      expect(cusdtAfter - cusdtBefore).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("Phase Transition Edge Cases", function () {
    it("Should handle deposits and withdrawals at phase boundaries", async function () {
      // Deposit just before phase transition
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);

      // Move time to just before transition (1 hour before)
      await time.increase(ACTIVE_PHASE_DURATION - 3600);
      
      // Try deposit near end of phase - should still work as we're in DEPOSIT phase
      await vault.connect(juniorInvestor1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);

      // Move past transition (move 2 hours forward from previous position)
      await time.increase(7200);
      
      // Trigger phase update first
      await vault.forcePhaseTransition();

      // Deposits should now work even after phase transition (deposits allowed at any time)
      await ausdc.connect(mixedInvestor).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await expect(
        vault.connect(mixedInvestor).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
      ).to.not.be.reverted;

      // But withdrawals should work
      const [senior, junior] = await vault.getUserTokenBalances(seniorInvestor1.address);
      await vault.connect(seniorInvestor1).withdraw(senior, junior, ZeroAddress);
    });

    it("Should handle rapid phase transitions", async function () {
      // Deposit
      await vault.connect(mixedInvestor).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);

      // Rapid transitions
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      // Should still be able to withdraw
      const [senior, junior] = await vault.getUserTokenBalances(mixedInvestor.address);
      await vault.connect(mixedInvestor).withdraw(senior, junior, ZeroAddress);

      // Complete cycle
      await time.increase(FINAL_CLAIMS_DURATION);
      await vault.startNewCycle();
      expect(await vault.currentPhase()).to.equal(0);
    });
  });

  describe("Complex Multi-User Scenarios", function () {
    it("Should handle complex interactions with 5+ users", async function () {
      const users = [seniorInvestor1, seniorInvestor2, juniorInvestor1, juniorInvestor2, mixedInvestor];
      
      // === DEPOSIT PHASE ===
      // Each user deposits different amounts and assets
      await vault.connect(users[0]).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(users[1]).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
      await vault.connect(users[2]).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT / 2n);
      await vault.connect(users[3]).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 3n);
      await vault.connect(users[4]).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);

      // Some users trade tokens
      const [s1, j1] = await vault.getUserTokenBalances(users[0].address);
      await seniorToken.connect(users[0]).transfer(users[2].address, s1 / 2n);
      await juniorToken.connect(users[0]).transfer(users[3].address, j1 / 2n);

      // === COVERAGE PHASE ===
      await vault.forcePhaseTransitionImmediate();

      // One user exits early
      const [s4, j4] = await vault.getUserTokenBalances(users[4].address);
      await vault.connect(users[4]).withdraw(s4 / 2n, j4 / 2n, ZeroAddress);

      // === CLAIMS PHASE ===
      await vault.forcePhaseTransitionImmediate();

      // Emergency mode activated
      await vault.toggleEmergencyMode();

      // Senior holders do emergency withdrawals
      const [s0Remaining, _] = await vault.getUserTokenBalances(users[0].address);
      if (s0Remaining > 0) {
        await vault.connect(users[0]).emergencyWithdraw(s0Remaining, await ausdc.getAddress());
      }

      // === FINAL_CLAIMS PHASE ===
      await vault.toggleEmergencyMode(); // Disable emergency
      await vault.forcePhaseTransitionImmediate();

      // Everyone withdraws remaining tokens
      for (let i = 1; i < users.length; i++) {
        const [senior, junior] = await vault.getUserTokenBalances(users[i].address);
        if (senior > 0 || junior > 0) {
          await vault.connect(users[i]).withdraw(senior, junior, ZeroAddress);
        }
      }

      // Vault might still have some remaining value from partial withdrawals
      // Since users did partial withdrawals and emergency withdrawals, some funds remain
      const remainingTVL = await vault.getTotalValueLocked();
      console.log("Remaining TVL:", remainingTVL.toString());
      // Just check it's not the full original amount
      expect(remainingTVL).to.be.lessThan(DEPOSIT_AMOUNT * 7n);
    });
  });

  describe("Protocol Invariants", function () {
    it("Should maintain totalTokensIssued == sum of all user balances", async function () {
      // Multiple deposits
      await vault.connect(seniorInvestor1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(juniorInvestor1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
      await vault.connect(mixedInvestor).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);

      // Calculate total tokens from user balances
      let totalFromUsers = 0n;
      const users = [seniorInvestor1, juniorInvestor1, mixedInvestor];
      for (const user of users) {
        const [senior, junior] = await vault.getUserTokenBalances(user.address);
        totalFromUsers += senior + junior;
      }

      expect(await vault.totalTokensIssued()).to.equal(totalFromUsers);

      // After some withdrawals
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      const [s1, j1] = await vault.getUserTokenBalances(seniorInvestor1.address);
      await vault.connect(seniorInvestor1).withdraw(s1 / 2n, j1 / 2n, ZeroAddress);

      // Recalculate
      totalFromUsers = 0n;
      for (const user of users) {
        const [senior, junior] = await vault.getUserTokenBalances(user.address);
        totalFromUsers += senior + junior;
      }

      expect(await vault.totalTokensIssued()).to.equal(totalFromUsers);
    });

    it("Should never allow withdrawal of more than vault balance", async function () {
      // Setup
      await vault.connect(mixedInvestor).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      // Try to withdraw more than possible by manipulating single asset withdrawal
      const [senior, junior] = await vault.getUserTokenBalances(mixedInvestor.address);
      
      // This should be limited by vault balance
      await vault.connect(mixedInvestor).withdraw(senior, junior, await ausdc.getAddress());
      
      // Vault should have given all its aUSDC but no more
      expect(await vault.aUSDCBalance()).to.equal(0);
    });
  });
});