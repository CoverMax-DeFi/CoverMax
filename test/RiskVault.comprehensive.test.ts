import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ZeroAddress } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskVault, MockAUSDC, MockCUSDT, RiskToken } from "../typechain-types";

describe("RiskVault - Comprehensive Tests", function () {
  let vault: RiskVault;
  let ausdc: MockAUSDC;
  let cusdt: MockCUSDT;
  let seniorToken: RiskToken;
  let juniorToken: RiskToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  // Phase durations
  const ACTIVE_PHASE_DURATION = 5 * 24 * 60 * 60; // 5 days (was DEPOSIT + COVERAGE)
  const CLAIMS_PHASE_DURATION = 1 * 24 * 60 * 60; // 1 day
  const FINAL_CLAIMS_DURATION = 1 * 24 * 60 * 60; // 1 day

  // Test amounts
  const MINT_AMOUNT = ethers.parseEther("10000");
  const DEPOSIT_AMOUNT = ethers.parseEther("100");
  const MIN_DEPOSIT = 10n;

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

    // Get token addresses
    const seniorTokenAddress = await vault.seniorToken();
    const juniorTokenAddress = await vault.juniorToken();
    seniorToken = await ethers.getContractAt("RiskToken", seniorTokenAddress);
    juniorToken = await ethers.getContractAt("RiskToken", juniorTokenAddress);

    // Mint tokens to users
    await ausdc.mint(user1.address, MINT_AMOUNT);
    await ausdc.mint(user2.address, MINT_AMOUNT);
    await ausdc.mint(user3.address, MINT_AMOUNT);
    await cusdt.mint(user1.address, MINT_AMOUNT);
    await cusdt.mint(user2.address, MINT_AMOUNT);
    await cusdt.mint(user3.address, MINT_AMOUNT);

    // Approve vault
    await ausdc.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
    await ausdc.connect(user2).approve(await vault.getAddress(), ethers.MaxUint256);
    await ausdc.connect(user3).approve(await vault.getAddress(), ethers.MaxUint256);
    await cusdt.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
    await cusdt.connect(user2).approve(await vault.getAddress(), ethers.MaxUint256);
    await cusdt.connect(user3).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await vault.aUSDC()).to.equal(await ausdc.getAddress());
      expect(await vault.cUSDT()).to.equal(await cusdt.getAddress());
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.emergencyMode()).to.equal(false);
      expect(await vault.totalTokensIssued()).to.equal(0);
      expect(await vault.currentPhase()).to.equal(0); // ACTIVE phase
    });

    it("Should create and own the risk tokens", async function () {
      expect(await seniorToken.owner()).to.equal(await vault.getAddress());
      expect(await juniorToken.owner()).to.equal(await vault.getAddress());
      expect(await seniorToken.name()).to.equal("CoverMax Senior Token");
      expect(await seniorToken.symbol()).to.equal("CM-SENIOR");
      expect(await juniorToken.name()).to.equal("CoverMax Junior Token");
      expect(await juniorToken.symbol()).to.equal("CM-JUNIOR");
    });

    it("Should start in ACTIVE phase with correct timestamps", async function () {
      const phaseInfo = await vault.getPhaseInfo();
      const currentTime = await time.latest();
      expect(phaseInfo.phase).to.equal(0); // ACTIVE
      expect(phaseInfo.phaseStart).to.be.closeTo(currentTime, 50);
      expect(phaseInfo.cycleStart).to.be.closeTo(currentTime, 50);
    });

    it("Should revert deployment with zero addresses", async function () {
      const VaultFactory = await ethers.getContractFactory("RiskVault");
      await expect(VaultFactory.deploy(ZeroAddress, await cusdt.getAddress())).to.be.revertedWithCustomError(vault, "InvalidAssetAddress");
      await expect(VaultFactory.deploy(await ausdc.getAddress(), ZeroAddress)).to.be.revertedWithCustomError(vault, "InvalidAssetAddress");
    });
  });

  describe("Phase Management", function () {
    describe("Automatic Phase Transitions", function () {
      it("Should transition from ACTIVE to CLAIMS after 5 days", async function () {
        expect(await vault.currentPhase()).to.equal(0); // ACTIVE
        
        // Move time forward by 5 days
        await time.increase(ACTIVE_PHASE_DURATION);
        
        // Trigger phase update manually
        await vault.forcePhaseTransition();
        
        expect(await vault.currentPhase()).to.equal(1); // CLAIMS
      });

      it("Should transition through all phases with correct timing", async function () {
        // Start in ACTIVE
        expect(await vault.currentPhase()).to.equal(0);
        
        // Move to CLAIMS
        await time.increase(ACTIVE_PHASE_DURATION);
        await vault.forcePhaseTransition();
        expect(await vault.currentPhase()).to.equal(1); // CLAIMS
        
        // Move to FINAL_CLAIMS
        await time.increase(CLAIMS_PHASE_DURATION);
        await vault.forcePhaseTransition();
        expect(await vault.currentPhase()).to.equal(2); // FINAL_CLAIMS
      });

      it("Should emit PhaseTransitioned events", async function () {
        await time.increase(ACTIVE_PHASE_DURATION);
        await expect(vault.forcePhaseTransition())
          .to.emit(vault, "PhaseTransitioned")
          .withArgs(0, 1, await time.latest() + 1);
      });
    });

    describe("Manual Phase Transitions", function () {
      it("Should allow owner to force immediate phase transition", async function () {
        expect(await vault.currentPhase()).to.equal(0); // ACTIVE
        
        await vault.connect(owner).forcePhaseTransitionImmediate();
        expect(await vault.currentPhase()).to.equal(1); // CLAIMS
        
        await vault.connect(owner).forcePhaseTransitionImmediate();
        expect(await vault.currentPhase()).to.equal(2); // FINAL_CLAIMS
      });

      it("Should only allow owner to force transitions", async function () {
        await expect(vault.connect(user1).forcePhaseTransition()).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        await expect(vault.connect(user1).forcePhaseTransitionImmediate()).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });
    });

    describe("Cycle Management", function () {
      it("Should start new cycle after FINAL_CLAIMS phase ends", async function () {
        // Move through all phases
        await vault.forcePhaseTransitionImmediate(); // CLAIMS
        await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS
        
        // Wait for final claims duration
        await time.increase(FINAL_CLAIMS_DURATION);
        
        // Start new cycle
        await expect(vault.startNewCycle())
          .to.emit(vault, "CycleStarted")
          .to.emit(vault, "PhaseTransitioned")
          .withArgs(2, 0, await time.latest() + 1);
        
        expect(await vault.currentPhase()).to.equal(0); // Back to ACTIVE
      });

      it("Should not allow new cycle if not in FINAL_CLAIMS", async function () {
        await expect(vault.startNewCycle()).to.be.revertedWithCustomError(vault, "PhaseTransitionNotReady");
      });

      it("Should not allow new cycle if FINAL_CLAIMS hasn't ended", async function () {
        // Move to FINAL_CLAIMS
        await vault.forcePhaseTransitionImmediate(); // CLAIMS
        await vault.forcePhaseTransitionImmediate(); // FINAL_CLAIMS
        
        // Try to start new cycle immediately
        await expect(vault.startNewCycle()).to.be.revertedWithCustomError(vault, "PhaseTransitionNotReady");
      });

      it("Should only allow owner to start new cycle", async function () {
        await expect(vault.connect(user1).startNewCycle()).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });
    });

    describe("Phase Information", function () {
      it("Should return correct phase info", async function () {
        const phaseInfo = await vault.getPhaseInfo();
        expect(phaseInfo.phase).to.equal(0); // ACTIVE
        expect(phaseInfo.timeRemaining).to.be.closeTo(ACTIVE_PHASE_DURATION, 50);
      });

      it("Should return correct protocol status", async function () {
        const status = await vault.getProtocolStatus();
        const currentTime = await time.latest();
        expect(status.emergency).to.equal(false);
        expect(status.totalTokens).to.equal(0);
        expect(status.phase).to.equal(0);
        expect(status.phaseEndTime).to.be.closeTo(currentTime + ACTIVE_PHASE_DURATION, 50);
      });

      it("Should update time remaining correctly", async function () {
        await time.increase(ACTIVE_PHASE_DURATION / 2);
        const phaseInfo = await vault.getPhaseInfo();
        expect(phaseInfo.timeRemaining).to.be.closeTo(ACTIVE_PHASE_DURATION / 2, 50);
      });

      it("Should show zero time remaining when phase should transition", async function () {
        await time.increase(ACTIVE_PHASE_DURATION + 100);
        const phaseInfo = await vault.getPhaseInfo();
        expect(phaseInfo.timeRemaining).to.equal(0);
      });
    });
  });

  describe("Deposit Functionality", function () {
    describe("Basic Deposits", function () {
      it("Should allow deposits during ACTIVE phase", async function () {
        const tx = await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        
        await expect(tx)
          .to.emit(vault, "AssetDeposited")
          .withArgs(user1.address, await ausdc.getAddress(), DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);
        
        expect(await vault.totalTokensIssued()).to.equal(DEPOSIT_AMOUNT);
        expect(await vault.aUSDCBalance()).to.equal(DEPOSIT_AMOUNT);
        
        const [senior, junior] = await vault.getUserTokenBalances(user1.address);
        expect(senior).to.equal(DEPOSIT_AMOUNT / 2n);
        expect(junior).to.equal(DEPOSIT_AMOUNT / 2n);
      });

      it("Should allow deposits of both aUSDC and cUSDT", async function () {
        await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);
        
        expect(await vault.aUSDCBalance()).to.equal(DEPOSIT_AMOUNT);
        expect(await vault.cUSDTBalance()).to.equal(DEPOSIT_AMOUNT);
        expect(await vault.getTotalValueLocked()).to.equal(DEPOSIT_AMOUNT * 2n);
      });

      it("Should issue equal amounts of senior and junior tokens", async function () {
        await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        
        const seniorBalance = await seniorToken.balanceOf(user1.address);
        const juniorBalance = await juniorToken.balanceOf(user1.address);
        
        expect(seniorBalance).to.equal(DEPOSIT_AMOUNT / 2n);
        expect(juniorBalance).to.equal(DEPOSIT_AMOUNT / 2n);
        expect(seniorBalance).to.equal(juniorBalance);
      });
    });

    describe("Deposit Restrictions", function () {
      it("Should revert deposits below minimum amount", async function () {
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), MIN_DEPOSIT)
        ).to.be.revertedWithCustomError(vault, "InsufficientDepositAmount");
        
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), MIN_DEPOSIT - 1n)
        ).to.be.revertedWithCustomError(vault, "InsufficientDepositAmount");
      });

      it("Should revert deposits with odd amounts", async function () {
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), 101)
        ).to.be.revertedWithCustomError(vault, "UnevenDepositAmount");
        
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), 999)
        ).to.be.revertedWithCustomError(vault, "UnevenDepositAmount");
      });

      it("Should revert deposits of unsupported assets", async function () {
        const randomAddress = ethers.Wallet.createRandom().address;
        await expect(
          vault.connect(user1).depositAsset(randomAddress, DEPOSIT_AMOUNT)
        ).to.be.revertedWithCustomError(vault, "UnsupportedAsset");
      });

      it("Should allow deposits during any phase", async function () {
        // Move to CLAIMS phase
        await vault.forcePhaseTransitionImmediate();
        
        // Should allow deposit during CLAIMS phase
        await ausdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
        ).to.not.be.reverted;
        
        // Move to FINAL_CLAIMS phase
        await vault.forcePhaseTransitionImmediate();
        
        // Should allow deposit during FINAL_CLAIMS phase
        await ausdc.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
        await expect(
          vault.connect(user2).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
        ).to.not.be.reverted;
      });

      it("Should revert deposits during emergency mode", async function () {
        await vault.toggleEmergencyMode();
        
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
        ).to.be.revertedWithCustomError(vault, "EmergencyModeActive");
      });

      it("Should revert if transfer fails", async function () {
        // Approve less than deposit amount
        await ausdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT / 2n);
        
        await expect(
          vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT)
        ).to.be.reverted;
      });
    });

    describe("Multiple Deposits", function () {
      it("Should handle multiple deposits from same user", async function () {
        await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        await vault.connect(user1).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT);
        
        const [senior, junior] = await vault.getUserTokenBalances(user1.address);
        expect(senior).to.equal(DEPOSIT_AMOUNT); // Total from both deposits
        expect(junior).to.equal(DEPOSIT_AMOUNT);
      });

      it("Should handle deposits from multiple users", async function () {
        await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
        await vault.connect(user3).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
        
        expect(await vault.totalTokensIssued()).to.equal(DEPOSIT_AMOUNT * 4n);
        expect(await vault.aUSDCBalance()).to.equal(DEPOSIT_AMOUNT * 2n);
        expect(await vault.cUSDTBalance()).to.equal(DEPOSIT_AMOUNT * 2n);
      });
    });
  });

  describe("Asset Support", function () {
    it("Should correctly identify supported assets", async function () {
      expect(await vault.isAssetSupported(await ausdc.getAddress())).to.equal(true);
      expect(await vault.isAssetSupported(await cusdt.getAddress())).to.equal(true);
      expect(await vault.isAssetSupported(ethers.Wallet.createRandom().address)).to.equal(false);
      expect(await vault.isAssetSupported(ZeroAddress)).to.equal(false);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Setup some deposits
      await vault.connect(user1).depositAsset(await ausdc.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).depositAsset(await cusdt.getAddress(), DEPOSIT_AMOUNT * 2n);
    });

    it("Should return correct vault balances", async function () {
      const [aUSDCBalance, cUSDTBalance] = await vault.getVaultBalances();
      expect(aUSDCBalance).to.equal(DEPOSIT_AMOUNT);
      expect(cUSDTBalance).to.equal(DEPOSIT_AMOUNT * 2n);
    });

    it("Should return correct total value locked", async function () {
      expect(await vault.getTotalValueLocked()).to.equal(DEPOSIT_AMOUNT * 3n);
    });

    it("Should return correct user token balances", async function () {
      const [senior1, junior1] = await vault.getUserTokenBalances(user1.address);
      expect(senior1).to.equal(DEPOSIT_AMOUNT / 2n);
      expect(junior1).to.equal(DEPOSIT_AMOUNT / 2n);
      
      const [senior2, junior2] = await vault.getUserTokenBalances(user2.address);
      expect(senior2).to.equal(DEPOSIT_AMOUNT);
      expect(junior2).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should calculate withdrawal amounts correctly", async function () {
      const [aUSDC, cUSDT] = await vault.calculateWithdrawalAmounts(DEPOSIT_AMOUNT / 2n, DEPOSIT_AMOUNT / 2n);
      // User has 1/3 of total tokens, should get 1/3 of each asset
      expect(aUSDC).to.equal(DEPOSIT_AMOUNT / 3n);
      expect(cUSDT).to.equal((DEPOSIT_AMOUNT * 2n) / 3n);
    });

    it("Should calculate single asset withdrawal correctly", async function () {
      const amountAUSDC = await vault.calculateSingleAssetWithdrawal(
        DEPOSIT_AMOUNT / 2n, 
        DEPOSIT_AMOUNT / 2n, 
        await ausdc.getAddress()
      );
      // User has 1/3 of total tokens, wants all in aUSDC
      // But vault only has DEPOSIT_AMOUNT of aUSDC, which is exactly 1/3 of total
      expect(amountAUSDC).to.equal(DEPOSIT_AMOUNT);
    });
  });
});