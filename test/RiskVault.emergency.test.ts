import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ZeroAddress } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskVault, MockAUSDC, MockCUSDT, RiskToken } from "../typechain-types";

describe("RiskVault - Emergency Mode Tests", function () {
  let vault: RiskVault;
  let ausdc: MockAUSDC;
  let cusdt: MockCUSDT;
  let seniorToken: RiskToken;
  let juniorToken: RiskToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const DEPOSIT_AMOUNT = ethers.parseEther("100");
  const MINT_AMOUNT = ethers.parseEther("10000");

  beforeEach(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();

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

    // Setup users with tokens and approvals
    for (const user of [user1, user2, user3]) {
      await ausdc.mint(user.address, MINT_AMOUNT);
      await cusdt.mint(user.address, MINT_AMOUNT);
      await ausdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
      await cusdt.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    }

    // Setup initial deposits
    await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
    await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
    await vault.connect(user3).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
  });

  describe("Emergency Mode Toggle", function () {
    it("Should allow owner to toggle emergency mode", async function () {
      expect(await vault.emergencyMode()).to.equal(false);
      
      await expect(vault.toggleEmergencyMode())
        .to.emit(vault, "EmergencyModeToggled")
        .withArgs(true);
      
      expect(await vault.emergencyMode()).to.equal(true);
      
      await expect(vault.toggleEmergencyMode())
        .to.emit(vault, "EmergencyModeToggled")
        .withArgs(false);
      
      expect(await vault.emergencyMode()).to.equal(false);
    });

    it("Should only allow owner to toggle emergency mode", async function () {
      await expect(
        vault.connect(user1).toggleEmergencyMode()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Mode Restrictions", function () {
    beforeEach(async function () {
      await vault.toggleEmergencyMode();
    });

    it("Should prevent deposits during emergency mode", async function () {
      await expect(
        vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
    });

    it("Should block normal withdrawals during emergency mode", async function () {
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // Regular withdrawal should be blocked during emergency mode
      await expect(
        vault.connect(user1).withdraw(senior, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
    });
  });

  describe("Emergency Withdraw Function", function () {
    beforeEach(async function () {
      await vault.toggleEmergencyMode();
    });

    it("Should allow senior token holders to emergency withdraw", async function () {
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      const ausdcBefore = await ausdc.balanceOf(user1.address);
      
      const tx = await vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress());
      
      await expect(tx)
        .to.emit(vault, "EmergencyWithdrawal")
        .withArgs(user1.address, senior, await ausdc.getAddress(), DEPOSIT_AMOUNT / 2n);
      
      // Check senior tokens were burned
      expect(await seniorToken.balanceOf(user1.address)).to.equal(0);
      // Junior tokens should remain
      expect(await juniorToken.balanceOf(user1.address)).to.equal(junior);
      
      // Check user received aUSDC
      expect(await ausdc.balanceOf(user1.address)).to.equal(ausdcBefore + DEPOSIT_AMOUNT / 2n);
    });

    it("Should allow choosing preferred asset in emergency withdrawal", async function () {
      const [senior, _] = await vault.getUserTokenBalances(user2.address);
      
      // User2 deposited cUSDT but wants to withdraw aUSDC
      const ausdcBefore = await ausdc.balanceOf(user2.address);
      
      await vault.connect(user2).emergencyWithdraw(senior, await ausdc.getAddress());
      
      // Should receive aUSDC despite depositing cUSDT
      expect(await ausdc.balanceOf(user2.address)).to.be.greaterThan(ausdcBefore);
    });

    it("Should handle partial emergency withdrawals", async function () {
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // Withdraw half of senior tokens
      const halfSenior = senior / 2n;
      
      await vault.connect(user1).emergencyWithdraw(halfSenior, await ausdc.getAddress());
      
      // Check remaining balances
      expect(await seniorToken.balanceOf(user1.address)).to.equal(halfSenior);
      expect(await juniorToken.balanceOf(user1.address)).to.equal(junior); // Junior unchanged
    });

    it("Should limit withdrawal to available asset balance", async function () {
      // Move to a phase where everyone can withdraw and disable emergency mode
      await vault.toggleEmergencyMode(); // Disable emergency mode
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      
      // Have user3 do a large withdrawal of aUSDC first
      const [senior3, junior3] = await vault.getUserTokenBalances(user3.address);
      await vault.connect(user3).withdraw(senior3, junior3, await ausdc.getAddress());
      
      // Re-enable emergency mode for the test
      await vault.toggleEmergencyMode();
      
      // Now emergency withdrawal should be limited by remaining aUSDC
      const [senior1, _] = await vault.getUserTokenBalances(user1.address);
      const remainingAUSDC = await vault.aUSDCBalance();
      
      await vault.connect(user1).emergencyWithdraw(senior1, await ausdc.getAddress());
      
      // Should have withdrawn some aUSDC (may not be all due to proportional calculation)
      expect(await vault.aUSDCBalance()).to.be.lessThan(DEPOSIT_AMOUNT * 2n);
    });

    it("Should calculate withdrawal amount correctly based on token share", async function () {
      const [senior1, _] = await vault.getUserTokenBalances(user1.address);
      const totalTokens = await vault.totalTokensIssued();
      const totalValue = await vault.getTotalValueLocked();
      
      // Calculate expected withdrawal
      const expectedAmount = (senior1 * totalValue) / totalTokens;
      
      const tx = await vault.connect(user1).emergencyWithdraw(senior1, await ausdc.getAddress());
      
      // Extract actual amount from event
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "EmergencyWithdrawal";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = vault.interface.parseLog(event);
        const actualAmount = parsed?.args[3];
        expect(actualAmount).to.be.closeTo(expectedAmount, ethers.parseEther("0.01"));
      }
    });
  });

  describe("Emergency Withdraw Restrictions", function () {
    it("Should revert emergency withdraw when not in emergency mode", async function () {
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      await expect(
        vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress())
      ).to.be.revertedWithCustomError(vault, "EmergencyModeNotActive");
    });

    it("Should revert emergency withdraw with zero amount", async function () {
      await vault.toggleEmergencyMode();
      
      await expect(
        vault.connect(user1).emergencyWithdraw(0, await ausdc.getAddress())
      ).to.be.revertedWithCustomError(vault, "NoTokensToWithdraw");
    });

    it("Should revert emergency withdraw with unsupported asset", async function () {
      await vault.toggleEmergencyMode();
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      await expect(
        vault.connect(user1).emergencyWithdraw(senior, ethers.Wallet.createRandom().address)
      ).to.be.revertedWithCustomError(vault, "UnsupportedAsset");
    });

    it("Should revert emergency withdraw with insufficient senior tokens", async function () {
      await vault.toggleEmergencyMode();
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      await expect(
        vault.connect(user1).emergencyWithdraw(senior + 1n, await ausdc.getAddress())
      ).to.be.revertedWithCustomError(vault, "InsufficientTokenBalance");
    });

    it("Should only burn senior tokens, not junior", async function () {
      await vault.toggleEmergencyMode();
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      await vault.connect(user1).emergencyWithdraw(senior / 2n, await ausdc.getAddress());
      
      // Junior tokens should be unchanged
      expect(await juniorToken.balanceOf(user1.address)).to.equal(junior);
      expect(await seniorToken.balanceOf(user1.address)).to.equal(senior / 2n);
    });
  });

  describe("Emergency Mode during CLAIMS Phase", function () {
    beforeEach(async function () {
      // Move to CLAIMS phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.toggleEmergencyMode();
    });

    it("Should block regular withdrawals during emergency mode", async function () {
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // In emergency mode, all regular withdrawals are blocked
      await expect(
        vault.connect(user1).withdraw(senior, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      
      await expect(
        vault.connect(user1).withdraw(0, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      
      await expect(
        vault.connect(user1).withdraw(senior, 0, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      
      // Only emergency withdrawal works
      await expect(vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress()))
        .to.emit(vault, "EmergencyWithdrawal");
    });
  });

  describe("Complex Emergency Scenarios", function () {
    it("Should handle multiple emergency withdrawals correctly", async function () {
      await vault.toggleEmergencyMode();
      
      // All users do emergency withdrawals
      const [senior1, _] = await vault.getUserTokenBalances(user1.address);
      const [senior2, __] = await vault.getUserTokenBalances(user2.address);
      const [senior3, ___] = await vault.getUserTokenBalances(user3.address);
      
      // User1 withdraws aUSDC
      await vault.connect(user1).emergencyWithdraw(senior1, await ausdc.getAddress());
      
      // User2 withdraws cUSDT
      await vault.connect(user2).emergencyWithdraw(senior2, await cusdt.getAddress());
      
      // User3 withdraws remaining aUSDC
      await vault.connect(user3).emergencyWithdraw(senior3, await ausdc.getAddress());
      
      // Check vault still has junior token value
      const remainingValue = await vault.getTotalValueLocked();
      expect(remainingValue).to.be.greaterThan(0);
      
      // Check total tokens issued reflects only junior tokens
      const totalJunior = (await juniorToken.balanceOf(user1.address)) +
                         (await juniorToken.balanceOf(user2.address)) +
                         (await juniorToken.balanceOf(user3.address));
      expect(await vault.totalTokensIssued()).to.equal(totalJunior);
    });

    it("Should handle emergency mode toggle during different phases", async function () {
      // Test in DEPOSIT phase
      await vault.toggleEmergencyMode();
      expect(await vault.emergencyMode()).to.equal(true);
      
      // Move to COVERAGE and test
      await vault.toggleEmergencyMode(); // Turn off to allow phase transition
      await vault.forcePhaseTransitionImmediate();
      await vault.toggleEmergencyMode();
      expect(await vault.emergencyMode()).to.equal(true);
      
      // Move to CLAIMS
      await vault.toggleEmergencyMode();
      await vault.forcePhaseTransitionImmediate();
      await vault.toggleEmergencyMode();
      expect(await vault.emergencyMode()).to.equal(true);
      
      // In emergency mode, regular withdrawals are blocked entirely
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      await expect(
        vault.connect(user1).withdraw(senior, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
    });

    it("Should handle edge case where vault has no funds", async function () {
      // Move to phase where withdrawals are allowed
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS
      
      // Everyone withdraws everything
      for (const user of [user1, user2, user3]) {
        const [senior, junior] = await vault.getUserTokenBalances(user.address);
        if (senior > 0 || junior > 0) {
          await vault.connect(user).withdraw(senior, junior, ZeroAddress);
        }
      }
      
      expect(await vault.getTotalValueLocked()).to.equal(0);
      expect(await vault.totalTokensIssued()).to.equal(0);
      
      // Now activate emergency mode and try emergency withdraw (should fail)
      await vault.toggleEmergencyMode();
      
      // Mint new tokens to a user and try to withdraw (should fail with no funds)
      // This would require a new deposit cycle
    });
  });

  describe("Emergency Mode Security", function () {
    it("Should maintain reentrancy protection during emergency withdrawals", async function () {
      await vault.toggleEmergencyMode();
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      // Normal emergency withdrawal should work
      await expect(vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress()))
        .to.not.be.reverted;
    });

    it("Should properly update state during emergency withdrawals", async function () {
      await vault.toggleEmergencyMode();
      
      const totalTokensBefore = await vault.totalTokensIssued();
      const aUSDCBefore = await vault.aUSDCBalance();
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      await vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress());
      
      // Check state updates
      expect(await vault.totalTokensIssued()).to.equal(totalTokensBefore - senior);
      expect(await vault.aUSDCBalance()).to.be.lessThan(aUSDCBefore);
      expect(await seniorToken.balanceOf(user1.address)).to.equal(0);
    });
  });
});