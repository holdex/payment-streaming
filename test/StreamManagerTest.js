const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getSigners, getDeployContracts } = require("./fixtures");

// TODO: rewrite tests
describe.only("StreamManager:", async () => {
	const amount = 1000
    const rate = 1500
    const terminationPeriod = 18 * 24 * 3600; // 18 days
    const cliffPeriod = 24 * 3600; // 24 hrs 

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
		it('Change address payer: address of the admin is changing', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

		    await expect(
		      streamManager.connect(admin).changePayerAddress(payee1.address)
		    ).to.emit(streamManager, "PayerAddressChanged")
		    .withArgs(payee1.address);
		})

		// Expecting revert with `NotAdmin`
		it('Change address payer: only the admin can call the function', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(payee1).changePayerAddress(payee2.address)
			).to.be.revertedWith('NotAdmin')
		  })

		// Expecting revert with `InvalidAddress`
		it('Change address payer: not can setting address(0) how address of the admin', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)
	    	const zero = ethers.constants.AddressZero

			await expect(
				streamManager.connect(admin).changePayerAddress(zero)
			).to.be.revertedWith('InvalidAddress')
		})

		// Expecting revert with `InvalidAddress`
		it('Change address payer: existing address and new address must not match', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await expect(
				streamManager.connect(admin).changePayerAddress(payer.address)
			).to.be.revertedWith('InvalidAddress')
		})
	})

	describe("deposit();", async () => {
		// Tests for `deposit();`
  		// Deposit USDT(mock)
		it('Deposit succeed;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			await mockUSDT.mint(payer.address, amount)

			await mockUSDT.connect(payer).approve(streamManager.address, amount)

			await expect(
			  	streamManager.connect(payer).deposit(
			  	mockUSDT.address,
			  	amount
			))
			.to.emit(streamManager, "TokensDeposited")
			.withArgs(mockUSDT.address, amount)

			expect(await mockUSDT.balanceOf(streamManager.address)).to.equal(amount)
		})

		// Expecting revert with `InvalidAddress`
		it('Deposit: `_token` not set how address(0);', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)
	    	const zero = ethers.constants.AddressZero

		    // Setting `_token` = address(0)
		    await expect(
				streamManager.connect(payer).deposit(
		    	zero,
		      	amount
		    ))
		    .to.be.revertedWith('InvalidAddress');
		})

		// Expecting revert with `InvalidValue`
		it('Deposit: `_amount` not set how 0;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			// Setting `_amount` = 0
			await expect(
			  	streamManager.connect(payer).deposit(
			  	mockUSDT.address,
			  	0
			))
			.to.be.revertedWith('InvalidValue');
		})

		// Expecting revert with `NotPayer`
		it('Deposit: only payer can call this function;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			// Calling from other address
			await expect(
				streamManager.connect(payee1).deposit(
				mockUSDT.address,
				amount
			))
		    .to.be.revertedWith('NotPayer');
		})
	})

	describe("terminate();", async () => {
		// Tests for `terminate();`
		// Expecting success
		it('Terminating succeeding;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	// Creating stream
		    await streamManager.connect(payer).createOpenStream(
		        payee1.address,
		        mockUSDT.address,
		        rate,
		        terminationPeriod,
		        cliffPeriod)

			await expect(
				streamManager.connect(payer).terminate(payee1.address))
			.to.emit(streamManager, 'StreamTerminated')
			.withArgs(payee1.address)
		})
		// Expecting revert with `NotPayer``
	  	it('Terminate: only payer can terminate;', async () => {

	  		const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	await expect(
	      		streamManager.connect(payee2).terminate(payee1.address))
	      	.to.be.revertedWith('NotPayer')
	  	})  
		// Expect revert with `Terminating``
		it('Terminate: stream is already terminated;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	// Creating stream
		    await streamManager.connect(payer).createOpenStream(
		        payee1.address,
		        mockUSDT.address,
		        rate,
		        terminationPeriod,
		        cliffPeriod)

		    await time.increase(4 * 24 * 3600); // + 4 days

		    // First terminating
		    await streamManager.connect(payer).terminate(payee1.address)

		    // Second terminating for `revert`
		    await expect(
	      		streamManager.connect(payer).terminate(payee1.address))
	      	.to.be.revertedWith('Terminating')
		})

		// Expecting revert with `NotPayee``
	  	it('Terminate: payee address only;', async () => {

	  		const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	await expect(
	      		streamManager.connect(payer).terminate(admin.address))
	      	.to.be.revertedWith('NotPayee')
	  	})

	  	// Expecting revert with `InsufficientBalance`
		it('Terminate: succeed in the cliff period', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			// Creating stream
		    await streamManager.connect(payer).createOpenStream(
		    	payee1.address,
		    	mockUSDT.address,
		    	rate,
		    	terminationPeriod,
		    	cliffPeriod
		    )

		    await streamManager.connect(payer).terminate(payee1.address)
		    expect(await streamManager.accumulation(payee1.address)).to.equal(0)
		    expect(await streamManager.isPayee(payee1.address)).to.equal(false)
		  })
	})

	describe("accumulation();", async () => {
		// Tests for `accumulation();`
		// Amount is accumulated
		it('Accumulation: returning the amount;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	// Creating stream
		    await streamManager.connect(payer).createOpenStream(
		    	payee1.address,
		    	mockUSDT.address,
		    	rate,
		    	terminationPeriod,
		    	cliffPeriod
		    )

		    await time.increase(44 * 24 * 3600); // + 44 days

		    // Setting timestamp
			const currentTimestamp = 44 * 24 * 3600
		    const claimablePeriod = currentTimestamp - cliffPeriod

		    // Calling the `accumulation();`
		    const accumulatedAmount = await streamManager.accumulation(payee1.address)
		    // Calculating expected amount
		    const expectedAmount = Math.floor(claimablePeriod * rate / 30 / 24 / 3600)
		    expect(accumulatedAmount).to.equal(expectedAmount)
		});

		// Returning 0, because the current timestamp is less than the sum of the stream creation time and the "cliff" period 
		it('Accumulation: timestamp not less than the sum of the stream creation time and the "cliff" period;', async () => {
		    
		    const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	// Creating stream
		    await streamManager.connect(payer).createOpenStream(
		    	payee1.address,
		    	mockUSDT.address,
		    	rate,
		    	terminationPeriod,
		    	cliffPeriod
		    )

		    // Calling the `accumulation();`
		    const accumulatedAmount = await streamManager.accumulation(payee1.address)

		    expect(accumulatedAmount).to.equal(0)
		}); 

		// Stream must be created to return the correct amount
		it('Accumulation: stream must be created for the return amount;', async () => {

			const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
	    	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

	    	// Calling the `accumulation();`
		    const accumulatedAmount = await streamManager.accumulation(payee1.address)

		    expect(accumulatedAmount).to.equal(0)
		})

		// Returning the amount if stream to not terminated
		it('Accumulation: stream not terminated', async () => {
		  	const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
		  	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			// Creating stream
			await streamManager.connect(payer).createOpenStream(
			    payee1.address,
			    mockUSDT.address,
			    rate,
			    terminationPeriod,
			    cliffPeriod
			);

			  
			await time.increase(44 * 24 * 3600); // + 44 days

			// Setting timestamp
			const currentTimestamp = 44 * 24 * 3600
		    const claimablePeriod = currentTimestamp - cliffPeriod

		    // Calling the `accumulation();`
		    const accumulatedAmount = await streamManager.accumulation(payee1.address)
		    // Calculating expected amount
		    const expectedAmount = Math.floor(claimablePeriod * rate / 30 / 24 / 3600)
		    expect(accumulatedAmount).to.equal(expectedAmount)
		})

		// Returning the amount if stream to terminated
		it('Accumulation: stream terminated', async () => {
		  	const { admin, payer, payee1, payee2 } = await loadFixture(getSigners)
		  	const { streamManager, mockUSDT } = await loadFixture(getDeployContracts)

			// Creating stream
			await streamManager.connect(payer).createOpenStream(
			    payee1.address,
			    mockUSDT.address,
			    rate,
			    terminationPeriod,
			    cliffPeriod
			);

			  
			await time.increase(44 * 24 * 3600); // + 44 days

			// Terminate the stream
			await streamManager.connect(payer).terminate(payee1.address);

			await time.increase(10 * 24 * 3600); // + 10 days

			// Setting timestamp
			const currentTimestamp = 54 * 24 * 3600
		    const claimablePeriod = currentTimestamp - cliffPeriod

		    // Calling the `accumulation();`
		    const accumulatedAmount = await streamManager.accumulation(payee1.address)
		    // Calculating expected amount
		    const expectedAmount = Math.floor(claimablePeriod * rate / 30 / 24 / 3600)
		    expect(accumulatedAmount).to.equal(expectedAmount)
		})
	})
});
