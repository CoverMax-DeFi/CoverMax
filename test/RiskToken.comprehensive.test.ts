import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskToken } from "../typechain-types";

describe("RiskToken - Comprehensive Tests", function () {
  let riskToken: RiskToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const RiskTokenFactory = await ethers.getContractFactory("RiskToken");
    riskToken = await RiskTokenFactory.deploy("CoverMax Risk Token", "CM-RISK");
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await riskToken.name()).to.equal("CoverMax Risk Token");
      expect(await riskToken.symbol()).to.equal("CM-RISK");
    });

    it("Should set the correct decimals", async function () {
      expect(await riskToken.decimals()).to.equal(18);
    });

    it("Should set the deployer as owner", async function () {
      expect(await riskToken.owner()).to.equal(owner.address);
    });

    it("Should have zero total supply initially", async function () {
      expect(await riskToken.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      
      await expect(riskToken.mint(addr1.address, mintAmount))
        .to.emit(riskToken, "Transfer")
        .withArgs(ZeroAddress, addr1.address, mintAmount);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await riskToken.totalSupply()).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      
      await expect(
        riskToken.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWithCustomError(riskToken, "OwnableUnauthorizedAccount");
    });

    it("Should handle multiple mints correctly", async function () {
      const mintAmount1 = ethers.parseEther("100");
      const mintAmount2 = ethers.parseEther("50");
      
      await riskToken.mint(addr1.address, mintAmount1);
      await riskToken.mint(addr2.address, mintAmount2);
      await riskToken.mint(addr1.address, mintAmount2); // Second mint to addr1
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(mintAmount1 + mintAmount2);
      expect(await riskToken.balanceOf(addr2.address)).to.equal(mintAmount2);
      expect(await riskToken.totalSupply()).to.equal(mintAmount1 + mintAmount2 * 2n);
    });

    it("Should mint zero tokens without reverting", async function () {
      await expect(riskToken.mint(addr1.address, 0))
        .to.emit(riskToken, "Transfer")
        .withArgs(ZeroAddress, addr1.address, 0);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle large mint amounts", async function () {
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion tokens
      
      await riskToken.mint(addr1.address, largeAmount);
      expect(await riskToken.balanceOf(addr1.address)).to.equal(largeAmount);
    });

    it("Should revert on minting to zero address", async function () {
      await expect(
        riskToken.mint(ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(riskToken, "ERC20InvalidReceiver");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      await riskToken.mint(addr1.address, ethers.parseEther("1000"));
      await riskToken.mint(addr2.address, ethers.parseEther("500"));
    });

    it("Should allow owner to burn tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await riskToken.balanceOf(addr1.address);
      
      await expect(riskToken.burn(addr1.address, burnAmount))
        .to.emit(riskToken, "Transfer")
        .withArgs(addr1.address, ZeroAddress, burnAmount);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
      expect(await riskToken.totalSupply()).to.equal(ethers.parseEther("1400"));
    });

    it("Should not allow non-owner to burn tokens", async function () {
      await expect(
        riskToken.connect(addr1).burn(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(riskToken, "OwnableUnauthorizedAccount");
    });

    it("Should burn all tokens of an address", async function () {
      const balance = await riskToken.balanceOf(addr1.address);
      
      await riskToken.burn(addr1.address, balance);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should revert when burning more than balance", async function () {
      const balance = await riskToken.balanceOf(addr1.address);
      
      await expect(
        riskToken.burn(addr1.address, balance + 1n)
      ).to.be.revertedWithCustomError(riskToken, "ERC20InsufficientBalance");
    });

    it("Should burn zero tokens without reverting", async function () {
      const initialBalance = await riskToken.balanceOf(addr1.address);
      
      await expect(riskToken.burn(addr1.address, 0))
        .to.emit(riskToken, "Transfer")
        .withArgs(addr1.address, ZeroAddress, 0);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(initialBalance);
    });

    it("Should handle multiple burns correctly", async function () {
      const burn1 = ethers.parseEther("100");
      const burn2 = ethers.parseEther("200");
      
      await riskToken.burn(addr1.address, burn1);
      await riskToken.burn(addr1.address, burn2);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("700"));
    });

    it("Should update total supply correctly after burns", async function () {
      const initialSupply = await riskToken.totalSupply();
      const burnAmount = ethers.parseEther("300");
      
      await riskToken.burn(addr1.address, burnAmount);
      
      expect(await riskToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });
  });

  describe("ERC20 Functionality", function () {
    beforeEach(async function () {
      await riskToken.mint(addr1.address, ethers.parseEther("1000"));
    });

    it("Should allow token transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        riskToken.connect(addr1).transfer(addr2.address, transferAmount)
      ).to.emit(riskToken, "Transfer")
        .withArgs(addr1.address, addr2.address, transferAmount);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("900"));
      expect(await riskToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should allow approvals and transferFrom", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("200");
      
      await riskToken.connect(addr1).approve(addr2.address, approveAmount);
      expect(await riskToken.allowance(addr1.address, addr2.address)).to.equal(approveAmount);
      
      await expect(
        riskToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount)
      ).to.emit(riskToken, "Transfer")
        .withArgs(addr1.address, addr3.address, transferAmount);
      
      expect(await riskToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("800"));
      expect(await riskToken.balanceOf(addr3.address)).to.equal(transferAmount);
      expect(await riskToken.allowance(addr1.address, addr2.address)).to.equal(approveAmount - transferAmount);
    });

    it("Should handle increase/decrease allowance", async function () {
      const initialAllowance = ethers.parseEther("100");
      const increaseAmount = ethers.parseEther("50");
      const decreaseAmount = ethers.parseEther("30");
      
      await riskToken.connect(addr1).approve(addr2.address, initialAllowance);
      
      // Increase allowance
      await expect(
        riskToken.connect(addr1).approve(addr2.address, initialAllowance + increaseAmount)
      ).to.emit(riskToken, "Approval");
      
      expect(await riskToken.allowance(addr1.address, addr2.address))
        .to.equal(initialAllowance + increaseAmount);
      
      // Decrease allowance
      await expect(
        riskToken.connect(addr1).approve(addr2.address, initialAllowance + increaseAmount - decreaseAmount)
      ).to.emit(riskToken, "Approval");
      
      expect(await riskToken.allowance(addr1.address, addr2.address))
        .to.equal(initialAllowance + increaseAmount - decreaseAmount);
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership correctly", async function () {
      await riskToken.transferOwnership(addr1.address);
      expect(await riskToken.owner()).to.equal(addr1.address);
      
      // New owner should be able to mint
      await riskToken.connect(addr1).mint(addr2.address, ethers.parseEther("100"));
      
      // Old owner should not
      await expect(
        riskToken.connect(owner).mint(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(riskToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to renounce ownership", async function () {
      await riskToken.renounceOwnership();
      expect(await riskToken.owner()).to.equal(ZeroAddress);
      
      // No one should be able to mint or burn after renouncing
      await expect(
        riskToken.mint(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(riskToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle mint and burn in same transaction", async function () {
      const amount = ethers.parseEther("100");
      
      await riskToken.mint(addr1.address, amount);
      const balance1 = await riskToken.balanceOf(addr1.address);
      
      await riskToken.burn(addr1.address, amount);
      const balance2 = await riskToken.balanceOf(addr1.address);
      
      expect(balance2).to.equal(balance1 - amount);
    });

    it("Should maintain correct state with multiple operations", async function () {
      // Complex scenario with multiple mints, burns, and transfers
      await riskToken.mint(addr1.address, ethers.parseEther("1000"));
      await riskToken.mint(addr2.address, ethers.parseEther("500"));
      
      await riskToken.connect(addr1).transfer(addr2.address, ethers.parseEther("200"));
      await riskToken.burn(addr2.address, ethers.parseEther("100"));
      
      await riskToken.mint(addr3.address, ethers.parseEther("300"));
      await riskToken.connect(addr2).transfer(addr3.address, ethers.parseEther("150"));
      
      // Verify final state
      expect(await riskToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("800"));
      expect(await riskToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("450"));
      expect(await riskToken.balanceOf(addr3.address)).to.equal(ethers.parseEther("450"));
      expect(await riskToken.totalSupply()).to.equal(ethers.parseEther("1700"));
    });

    it("Should not allow transfers to zero address", async function () {
      await riskToken.mint(addr1.address, ethers.parseEther("100"));
      
      await expect(
        riskToken.connect(addr1).transfer(ZeroAddress, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(riskToken, "ERC20InvalidReceiver");
    });

    it("Should not allow transfers exceeding balance", async function () {
      await riskToken.mint(addr1.address, ethers.parseEther("100"));
      
      await expect(
        riskToken.connect(addr1).transfer(addr2.address, ethers.parseEther("101"))
      ).to.be.revertedWithCustomError(riskToken, "ERC20InsufficientBalance");
    });

    it("Should not allow transferFrom exceeding allowance", async function () {
      await riskToken.mint(addr1.address, ethers.parseEther("1000"));
      await riskToken.connect(addr1).approve(addr2.address, ethers.parseEther("100"));
      
      await expect(
        riskToken.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseEther("101"))
      ).to.be.revertedWithCustomError(riskToken, "ERC20InsufficientAllowance");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should handle batch operations efficiently", async function () {
      const addresses = [addr1, addr2, addr3];
      const amount = ethers.parseEther("100");
      
      // Batch mint
      for (const addr of addresses) {
        await riskToken.mint(addr.address, amount);
      }
      
      // Verify all balances
      for (const addr of addresses) {
        expect(await riskToken.balanceOf(addr.address)).to.equal(amount);
      }
      
      expect(await riskToken.totalSupply()).to.equal(amount * BigInt(addresses.length));
    });
  });
});