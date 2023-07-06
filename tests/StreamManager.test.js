const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StreamManager", function () {
  before(async () => {
    const [admin, payer, payee1, payee2] = await ethers.getSigners()
    this.admin = admin
    this.payer = payer
    this.payee1 = payee1
    this.payee2 = payee2
    this.token = '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832' // USDT on mumbai testnet

    // Deploy StreamManager
    const StreamManager = await ethers.getContractFactory("StreamManager")
    this.streamManager = await StreamManager.deploy(this.payer)
  })
});
