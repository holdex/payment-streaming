const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getSigners, getDeployContracts } = require("./fixtures");

// TODO: rewrite tests
describe.only("StreamManager:", async () => {

	it("Checking fixtures", async () => {
		await loadFixture(getSigners)

	    await loadFixture(getDeployContracts)
  	});
	
	describe("changeCommissionAddress();", async () => {
		// Tests for `changeCommissionAddress();`
		// Changing the address of the commission
		it('Chainge address fee: address of the admin is changing', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

		    await expect(
		      streamManager.connect(admin).changeCommissionAddress(payee1.address)
		    ).to.emit(streamManager, "CommissionAddressChanged")
		    .withArgs(payee1.address);
		})

		// Expecting revert with `NotAdmin`
		it('Chainge address fee: only the admin can call the function', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(payee1).changeCommissionAddress(payee2.address)
			).to.be.revertedWith('NotAdmin')
		  })

		// Expecting revert with `InvalidAddress`
		it('Chainge address fee: not can setting address(0) how address of the admin', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)
	    	const zero = ethers.constants.AddressZero

			await expect(
				streamManager.connect(admin).changeCommissionAddress(zero)
			).to.be.revertedWith('InvalidAddress')
		})

		// Expecting revert with `InvalidAddress`
		it('Chainge address fee: existing address and new address must not match', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(admin).changeCommissionAddress(admin.address)
			).to.be.revertedWith('InvalidAddress')
		})
	})

	describe("changePayerAddress();", async () => {
		// Tests for `changePayerAddress();`
		// Changing the address payer
		it('Chainge address fee: address of the admin is changing', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

		    await expect(
		      streamManager.connect(admin).changePayerAddress(payee1.address)
		    ).to.emit(streamManager, "PayerAddressChanged")
		    .withArgs(payee1.address);
		})

		// Expecting revert with `NotAdmin`
		it('Chainge address fee: only the admin can call the function', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(payee1).changePayerAddress(payee2.address)
			).to.be.revertedWith('NotAdmin')
		  })

		// Expecting revert with `InvalidAddress`
		it('Chainge address fee: not can setting address(0) how address of the admin', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)
	    	const zero = ethers.constants.AddressZero

			await expect(
				streamManager.connect(admin).changePayerAddress(zero)
			).to.be.revertedWith('InvalidAddress')
		})

		// Expecting revert with `InvalidAddress`
		it('Chainge address fee: existing address and new address must not match', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(admin).changePayerAddress(payer.address)
			).to.be.revertedWith('InvalidAddress')
		})
	})
});
