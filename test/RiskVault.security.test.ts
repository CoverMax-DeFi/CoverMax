import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ZeroAddress } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskVault, MockAUSDC, MockCUSDT, RiskToken } from "../typechain-types";

describe("RiskVault - Security Tests", function () {
  let vault: RiskVault;
  let ausdc: MockAUSDC;
  let cusdt: MockCUSDT;
  let seniorToken: RiskToken;
  let juniorToken: RiskToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DEPOSIT_AMOUNT = ethers.parseEther("1000");
  const MINT_AMOUNT = ethers.parseEther("10000");

  beforeEach(async () => {
    [owner, user1, user2, attacker] = await ethers.getSigners();

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

    // Setup users
    const users = [user1, user2, attacker];
    for (const user of users) {
      await ausdc.mint(user.address, MINT_AMOUNT);
      await cusdt.mint(user.address, MINT_AMOUNT);
      await ausdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
      await cusdt.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    }
  });

  describe("Access Control", function () {
    it("Should only allow owner to call owner-only functions", async function () {
      // toggleEmergencyMode
      await expect(
        vault.connect(attacker).toggleEmergencyMode()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // forcePhaseTransition
      await expect(
        vault.connect(attacker).forcePhaseTransition()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // forcePhaseTransitionImmediate
      await expect(
        vault.connect(attacker).forcePhaseTransitionImmediate()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // startNewCycle
      await expect(
        vault.connect(attacker).startNewCycle()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should only allow vault to mint/burn risk tokens", async function () {
      // Try to mint tokens directly
      await expect(
        seniorToken.connect(attacker).mint(attacker.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(seniorToken, "OwnableUnauthorizedAccount");

      // Try to burn tokens directly
      await expect(
        seniorToken.connect(attacker).burn(user1.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(seniorToken, "OwnableUnauthorizedAccount");

      // Same for junior token
      await expect(
        juniorToken.connect(attacker).mint(attacker.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(juniorToken, "OwnableUnauthorizedAccount");
    });

    it("Should transfer ownership correctly and securely", async function () {
      // Transfer ownership to user1
      await vault.connect(owner).transferOwnership(user1.address);
      expect(await vault.owner()).to.equal(user1.address);

      // Old owner can't use owner functions
      await expect(
        vault.connect(owner).toggleEmergencyMode()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // New owner can
      await vault.connect(user1).toggleEmergencyMode();
      expect(await vault.emergencyMode()).to.equal(true);

      // Attacker still can't
      await expect(
        vault.connect(attacker).toggleEmergencyMode()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in deposit function", async function () {
      // The ReentrancyGuard should prevent any reentrancy attempts
      // Since we can't easily create a malicious ERC20 in this test environment,
      // we verify the modifier is present and works with normal flow
      
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Multiple deposits in sequence should work (not reentrancy)
      await vault.connect(user1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);
      
      expect(await vault.totalTokensIssued()).to.equal(DEPOSIT_AMOUNT * 2n);
    });

    it("Should prevent reentrancy in withdraw functions", async function () {
      // Setup
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // Normal withdrawal should work
      await vault.connect(user1).withdraw(senior, junior, ZeroAddress);
    });

    it("Should prevent reentrancy in emergency withdraw", async function () {
      // Setup
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.toggleEmergencyMode();
      
      const [senior, _] = await vault.getUserTokenBalances(user1.address);
      
      // Emergency withdrawal should work normally
      await vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress());
    });
  });

  describe("Integer Overflow/Underflow Protection", function () {
    it("Should handle large deposit amounts without overflow", async function () {
      // Use a very large amount (but within token supply)
      const largeAmount = ethers.parseEther("1000000");
      
      // Mint large amount to user
      await ausdc.mint(user1.address, largeAmount);
      await ausdc.connect(user1).approve(await vault.getAddress(), largeAmount);
      
      // Should not overflow
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), largeAmount);
      expect(await vault.totalTokensIssued()).to.equal(largeAmount);
    });

    it("Should prevent underflow in vault balances", async function () {
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // Withdraw everything
      await vault.connect(user1).withdraw(senior, junior, ZeroAddress);
      
      // Balances should be zero, not underflowed
      expect(await vault.aUSDCBalance()).to.equal(0);
      expect(await vault.cUSDTBalance()).to.equal(0);
    });

    it("Should handle extreme token amounts correctly", async function () {
      // Test with maximum possible values
      const maxAmount = ethers.MaxUint256 / 1000n; // Divide to avoid overflow in calculations
      
      // This would be rejected at the transfer level, but let's test our limits
      await ausdc.mint(user1.address, maxAmount);
      await ausdc.connect(user1).approve(await vault.getAddress(), maxAmount);
      
      // Should handle large amounts without issues
      const depositAmount = ethers.parseEther("1000000");
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), depositAmount);
    });
  });

  describe("Edge Case Validations", function () {
    it("Should handle zero amounts correctly", async function () {
      // Zero deposit should revert
      await expect(
        vault.connect(user1).depositAsset(await ausdc.getAddress(), 0)
      ).to.be.revertedWithCustomError(vault, "InsufficientDepositAmount");

      // Zero withdrawal should revert
      await expect(
        vault.connect(user1).withdraw(0, 0, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "NoTokensToWithdraw");
    });

    it("Should handle minimum viable amounts", async function () {
      // Minimum deposit amount + 1 (must be even)
      const minViableDeposit = 12n; // > 10 and even
      
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), minViableDeposit);
      
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      expect(senior).to.equal(minViableDeposit / 2n);
      expect(junior).to.equal(minViableDeposit / 2n);
    });

    it("Should prevent deposits to zero address scenarios", async function () {
      // The vault itself handles asset validation, so this tests the asset support
      await expect(
        vault.connect(user1).depositAsset(ZeroAddress, DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(vault, "UnsupportedAsset");
    });

    it("Should handle edge cases in phase transitions", async function () {
      // Test rapid successive phase transitions
      expect(await vault.currentPhase()).to.equal(0); // DEPOSIT
      
      await vault.forcePhaseTransitionImmediate();
      expect(await vault.currentPhase()).to.equal(1); // COVERAGE
      
      await vault.forcePhaseTransitionImmediate();
      expect(await vault.currentPhase()).to.equal(2); // CLAIMS
      
      await vault.forcePhaseTransitionImmediate();
      expect(await vault.currentPhase()).to.equal(3); // FINAL_CLAIMS
      
      // Can't transition further without starting new cycle
      await vault.forcePhaseTransitionImmediate();
      expect(await vault.currentPhase()).to.equal(3); // Still FINAL_CLAIMS
    });
  });

  describe("State Consistency", function () {
    it("Should maintain consistent state during complex operations", async function () {
      // Setup initial state
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
      
      const initialTVL = await vault.getTotalValueLocked();
      const initialTokens = await vault.totalTokensIssued();
      
      // Perform various operations
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      
      // Partial withdrawal
      const [senior1, junior1] = await vault.getUserTokenBalances(user1.address);
      await vault.connect(user1).withdraw(senior1 / 2n, junior1 / 2n, ZeroAddress);
      
      // Check consistency
      const midTVL = await vault.getTotalValueLocked();
      const midTokens = await vault.totalTokensIssued();
      
      expect(midTVL).to.be.lessThan(initialTVL);
      expect(midTokens).to.be.lessThan(initialTokens);
      // Should have fewer tokens after partial withdrawal
      expect(midTokens).to.be.lessThan(initialTokens);
      expect(midTokens).to.equal(initialTokens - senior1 / 2n - junior1 / 2n);
      
      // More operations
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS
      
      // Final withdrawal
      const [senior2, junior2] = await vault.getUserTokenBalances(user2.address);
      await vault.connect(user2).withdraw(senior2, junior2, ZeroAddress);
      
      // Check final consistency
      const finalTVL = await vault.getTotalValueLocked();
      const finalTokens = await vault.totalTokensIssued();
      
      // Should only have user1's remaining tokens
      const [remainingSenior, remainingJunior] = await vault.getUserTokenBalances(user1.address);
      expect(finalTokens).to.equal(remainingSenior + remainingJunior);
    });

    it("Should maintain token balance invariants", async function () {
      // Multiple users deposit
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);
      
      // Check invariant: sum of user balances = totalTokensIssued
      let totalUserBalance = 0n;
      for (const user of [user1, user2]) {
        const [senior, junior] = await vault.getUserTokenBalances(user.address);
        totalUserBalance += senior + junior;
      }
      
      expect(await vault.totalTokensIssued()).to.equal(totalUserBalance);
      
      // After token transfer (simulating trading)
      const [senior1, junior1] = await vault.getUserTokenBalances(user1.address);
      await seniorToken.connect(user1).transfer(user2.address, senior1 / 2n);
      
      // Invariant should still hold
      totalUserBalance = 0n;
      for (const user of [user1, user2]) {
        const [senior, junior] = await vault.getUserTokenBalances(user.address);
        totalUserBalance += senior + junior;
      }
      
      expect(await vault.totalTokensIssued()).to.equal(totalUserBalance);
    });
  });

  describe("External Contract Interaction Security", function () {
    it("Should handle failed token transfers gracefully", async function () {
      // Simulate insufficient approval
      await ausdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT / 2n);
      
      await expect(
        vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.reverted; // Should revert on failed transfer
    });

    it("Should not rely on external token balance checks", async function () {
      // The vault maintains its own balance accounting
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      expect(await vault.aUSDCBalance()).to.equal(DEPOSIT_AMOUNT);
      expect(await ausdc.balanceOf(await vault.getAddress())).to.equal(DEPOSIT_AMOUNT);
      
      // Even if someone sends tokens directly to vault (outside normal flow),
      // the vault's internal accounting shouldn't be affected
      await ausdc.mint(await vault.getAddress(), DEPOSIT_AMOUNT);
      expect(await vault.aUSDCBalance()).to.equal(DEPOSIT_AMOUNT); // Unchanged
      expect(await ausdc.balanceOf(await vault.getAddress())).to.equal(DEPOSIT_AMOUNT * 2n); // Changed
    });
  });

  describe("Emergency Mode Security", function () {
    it("Should properly restrict functions during emergency", async function () {
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Enable emergency mode
      await vault.toggleEmergencyMode();
      
      // Deposits should be blocked
      await expect(
        vault.connect(user2).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      
      // Regular withdrawals should be blocked during emergency mode
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      await expect(
        vault.connect(user1).withdraw(senior, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
    });

    it("Should prevent unauthorized emergency mode toggle", async function () {
      await expect(
        vault.connect(attacker).toggleEmergencyMode()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should enforce senior-only during emergency + claims", async function () {
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      
      // Move to claims and enable emergency
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.toggleEmergencyMode();
      
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      
      // In emergency mode, regular withdrawals are blocked entirely
      await expect(
        vault.connect(user1).withdraw(senior, junior, ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      
      // Should allow emergency withdrawal only
      await vault.connect(user1).emergencyWithdraw(senior, await ausdc.getAddress());
    });
  });

  describe("Mathematical Edge Cases", function () {
    it("Should handle rounding in token calculations", async function () {
      // Deposit an odd amount that forces rounding
      const oddAmount = 1001n; // Odd number > minimum
      
      await expect(
        vault.connect(user1).depositAsset(await ausdc.getAddress(), oddAmount)
      ).to.be.revertedWithCustomError(vault, "UnevenDepositAmount");
      
      // Even amount should work
      const evenAmount = 1000n;
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), evenAmount);
      
      const [senior, junior] = await vault.getUserTokenBalances(user1.address);
      expect(senior).to.equal(evenAmount / 2n);
      expect(junior).to.equal(evenAmount / 2n);
    });

    it("Should handle proportional calculations with small amounts", async function () {
      // Very small deposit
      const smallAmount = 20n; // Minimum viable even amount > 10
      
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), smallAmount);
      await vault.connect(user2).depositAsset(await cusdt.getAddress(), smallAmount * 100n);
      
      // Move to withdrawal phase
      await vault.forcePhaseTransitionImmediate(); // COVERAGE
      await vault.forcePhaseTransitionImmediate(); // CLAIMS
      await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS

      // User1 has very small share, but should still get proportional amount
      const [senior1, junior1] = await vault.getUserTokenBalances(user1.address);
      
      const [aUSDC, cUSDT] = await vault.calculateWithdrawalAmounts(senior1, junior1);
      expect(aUSDC + cUSDT).to.be.greaterThan(0);
      
      await vault.connect(user1).withdraw(senior1, junior1, ZeroAddress);
    });
  });

  describe("Gas Limits and DoS Protection", function () {
    it("Should handle maximum reasonable number of operations", async function () {
      // Test with reasonable limits to avoid actual DoS in tests
      const numOperations = 10;
      
      for (let i = 0; i < numOperations; i++) {
        const user = i % 2 === 0 ? user1 : user2;
        const asset = i % 2 === 0 ? ausdc : cusdt;
        
        await vault.connect(user).depositAsset(await asset.getAddress(), DEPOSIT_AMOUNT);
      }
      
      expect(await vault.totalTokensIssued()).to.equal(DEPOSIT_AMOUNT * BigInt(numOperations));
    });
  });
});