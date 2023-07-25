const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers } = require("hardhat");

// Gitting addresses and return addresses
async function getSigners() {
	const [ admin, payer, payee1, payee2 ] = await ethers.getSigners();
	
	return { admin, payer, payee1, payee2 };
}

// Deploying contracts and return addresses
async function getDeployContracts() {

	const { admin, payer } = await loadFixture(getSigners);

	// Deploy StreamManager
    const StreamManager = await ethers.getContractFactory("StreamManager");
    const streamManager = await StreamManager.deploy(payer.address);

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy(
      "Mock USDT",
      "USDT",
      6
    );

    // Deploy MaliciousToken
    const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
    const maliciousToken = await MaliciousToken.deploy(streamManager.address);

    return { streamManager, mockUSDT, maliciousToken };
}

module.exports = { getSigners, getDeployContracts }