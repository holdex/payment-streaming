const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getSigners, getDeployContracts } = require("./fixtures");

// TODO: rewrite tests
describe.only("StreamManager:", async () => {
	it("Checking fixtures", async () => {
	await loadFixture(getSigners)

    await loadFixture(getDeployContracts)

    //const { admin, payer, payee1, payee2 } = await loadFixture(getSigners);
    //const { streamManager, mockUSDT } = await loadFixture(getDeployContracts);
  	});
});