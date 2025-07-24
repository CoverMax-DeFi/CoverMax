// test/RiskToken.test.ts

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ZeroAddress } = require("ethers");

describe("RiskToken", function () {
  let riskToken;
  let owner, addr1;

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    const RiskTokenFactory = await ethers.getContractFactory("RiskToken");
    riskToken = await RiskTokenFactory.deploy("RiskToken", "RTKN");
  });

  it("should have correct name and symbol", async () => {
    expect(await riskToken.name()).to.equal("RiskToken");
    expect(await riskToken.symbol()).to.equal("RTKN");
  });

  it("should have 18 decimals", async () => {
    expect(await riskToken.decimals()).to.equal(18);
  });

  it("only owner can mint", async () => {
    await expect(riskToken.connect(addr1).mint(addr1.address, 100)).to.be.reverted;
    await expect(riskToken.mint(addr1.address, 100)).to.emit(riskToken, "Transfer").withArgs(ZeroAddress, addr1.address, 100);
    expect(await riskToken.balanceOf(addr1.address)).to.equal(100);
  });

  it("only owner can burn", async () => {
    await riskToken.mint(addr1.address, 100);
    await expect(riskToken.connect(addr1).burn(addr1.address, 50)).to.be.reverted;
    await expect(riskToken.burn(addr1.address, 50)).to.emit(riskToken, "Transfer").withArgs(addr1.address, ZeroAddress, 50);
    expect(await riskToken.balanceOf(addr1.address)).to.equal(50);
  });

});