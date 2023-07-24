const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StreamManager:", function () {
  before(async () => {
    const [admin, payer, payer2, payee1, payee2, payee3, payee4, payee5, payee6] = await ethers.getSigners();
    this.admin = admin
    this.payer = payer
    this.payer2 = payer2
    this.payee1 = payee1
    this.payee2 = payee2
    this.payee3 = payee3
    this.payee4 = payee4
    this.payee5 = payee5
    this.payee6 = payee6
    this.zero = ethers.constants.AddressZero
    this.amount = 1000
    this.rate = 1500
    this.decimals = 6
    this.terminationPeriod = 18 * 24 * 3600; // 18 days
    this.cliffPeriod = 24 * 3600; // 24 hrs

    // Deploy StreamManager
    const StreamManager = await ethers.getContractFactory("StreamManager")
    this.streamManager = await StreamManager.deploy(this.payer.address)

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT")
    this.mockUSDT = await MockUSDT.deploy(
      "Mock USDT",
      "USDT",
      6
    )
  })

  // Minting USDT(mock)
  it('Minting to payer succeed;', async () => {
    const amount = ethers.BigNumber.from("10000000000")

    await expect(this.mockUSDT.mint(this.payer.address, amount))
      .to.emit(this.mockUSDT, "Minted")
      .withArgs(this.payer.address, amount)
    
    await expect(this.mockUSDT.mint(this.payer.address, amount))
      .to.emit(this.mockUSDT, "Minted")
      .withArgs(this.payer.address, amount)
    expect(await this.mockUSDT.decimals()).to.equal(this.decimals)
    expect(await this.mockUSDT.balanceOf(this.payer.address)).to.equal(ethers.BigNumber.from("20000000000"))
  })

  // Tests for `createOpenStream();`
  // Creating stream
  it('Creating an open stream instance succeed;', async () => {
    await expect(this.streamManager.connect(this.payer).createOpenStream(
      this.payee1.address,
      this.mockUSDT.address,
      this.rate,
      this.terminationPeriod,
      this.cliffPeriod
    ))
    .to.emit(this.streamManager, "StreamCreated")
    .withArgs(this.payer.address, this.payee1.address)
  })

  // Expecting revert with NotPayer
  it('Creating open stream instance: fail if caller is not the payer', async () => {
    await expect(
      this.streamManager.connect(this.payer2).createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('NotPayer');
  })

  // Expecting revert with `InvalidAddress`
  it('Creating open stream instance: `_payee` is not set as address(0);', async () => {
    // Setting `_payee` = address(0)
    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.zero,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidAddress');
  })

   // Expecting revert with `InvalidAddress`
   it('Creating open stream instance: `_token` is not set as address(0);', async () => {
    // Setting `_token` = address(0)
    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.payee1.address,
        this.zero,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidAddress');
  })

  // Expecting revert with `InvalidValue`
  it('Creating an open stream instance: `_rate`, `_terminationPeriod`, `_cliffPeriod` not set how 0;', async () => {
    // Setting `_rate` = 0
    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        0,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidValue');
  })

  it('Creating an open stream instance: `_rate`, `_terminationPeriod`, `_cliffPeriod` not set how 0;', async () => {
    // Setting `_terminationPeriod` = 0
    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        0,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidValue');
  })

  it('Creating an open stream instance: `_rate`, `_terminationPeriod`, `_cliffPeriod` not set how 0;', async () => {
    // Setting `_cliffPeriod` = 0
    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        0
      )
    ).to.be.revertedWith('InvalidValue');
  })

  // Expecting revert with `OpenStreamExists`
  it('Creating open stream instance: Previous stream has not been ended', async () => {
    await expect(this.streamManager.connect(this.payer).createOpenStream(
      this.payee1.address,
      this.mockUSDT.address,
      this.rate,
      this.terminationPeriod,
      this.cliffPeriod
    )).to.be.revertedWith('OpenStreamExists');
  })

  // Tests for `deposit();`
  // Deposit USDT(mock)
  it('Deposit succeed;', async () => {

    await this.mockUSDT.mint(this.payer.address, this.amount)

    await this.mockUSDT.connect(this.payer).approve(this.streamManager.address, this.amount)

    await expect(
      this.streamManager.connect(this.payer).deposit(
      this.mockUSDT.address,
      this.amount
    ))
    .to.emit(this.streamManager, "TokensDeposited")
    .withArgs(this.mockUSDT.address, this.amount)

    expect(await this.mockUSDT.balanceOf(this.streamManager.address)).to.equal(this.amount)
  })

  // Expecting revert with `InvalidAddress`
  it('Deposit: `_token` not set how address(0);', async () => {
    // Setting `_token` = address(0)
    await expect(
      this.streamManager.connect(this.payer).deposit(
      this.zero,
      this.amount
    ))
    .to.be.revertedWith('InvalidAddress');
  })

  // Expecting revert with `InvalidValue`
  it('Deposit: `_amount` not set how 0;', async () => {
    // Setting `_amount` = 0
    await expect(
      this.streamManager.connect(this.payer).deposit(
      this.mockUSDT.address,
      0
    ))
    .to.be.revertedWith('InvalidValue');
  })

  // Expecting revert with `NotPayer`
  it('Deposit: only payer can call this function;', async () => {
    // Calling from other address
    await expect(
      this.streamManager.connect(this.payee1).deposit(
      this.mockUSDT.address,
      this.amount
    ))
    .to.be.revertedWith('NotPayer');
  })

  // Returning 0, because the current timestamp is less than the sum of the stream creation time and the "cliff" period 
  it('Accumulated: timestamp not less than the sum of the stream creation time and the "cliff" period;', async () => {
    // Calling the `accumulation();`
    const accumulatedAmount = await this.streamManager.accumulation(this.payee1.address)

    expect(accumulatedAmount).to.equal(0)
  });

  // Tests for `claim();`
  // Expect revert with NotPayee
  it('Claiming failed: caller should be a payee', async () => {
    await expect(
      this.streamManager.connect(this.payee3).claim()
    )
    .to.be.revertedWith("NotPayee")
  })

  // Claiming USDT
  it('Claiming succeed;', async () => {
    const currentTimestamp = 2 * 24 * 3600
    await time.increase(currentTimestamp)
    const claimablePeriod = currentTimestamp - this.cliffPeriod
    const expectedAmount = Math.floor(claimablePeriod * this.rate / 30 / 24 / 3600)

    await expect(
      this.streamManager.connect(this.payee1).claim()
    )
    .to.emit(this.streamManager, "TokensClaimed")
    .withArgs(this.payee1.address, expectedAmount)
  })

  // Expecting revert with `InsufficientBalance`
  it('Claiming failed: insufficient funds;', async () => {
    // Minting tokens to `StreamManager`
    await this.mockUSDT.mint(this.streamManager.address, 100)

    // Creating stream
    await this.streamManager.connect(this.payer).createOpenStream(
        this.payee2.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod)

    await time.increase(17 * 24 * 3600); // + 17 days
    // claimed after 17 days from terminated point
    await this.streamManager.connect(this.payee2).claim()

    // tried to claim after 2 days but insufficient funds
    await time.increase(4 * 24 * 3600); // + 4 days
    await expect(
      this.streamManager.connect(this.payee2).claim()
    ).to.be.revertedWith('InsufficientBalance')
  })

  it('Creating next open stream instance success', async () => {
    await time.increase(20 * 24 * 3600); // + 20 days

    await expect(
      this.streamManager.connect(this.payer).createOpenStream(
        this.payee6.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.emit(this.streamManager, "StreamCreated")
    .withArgs(this.payer.address, this.payee6.address);
  })

  // Expecting revert with `NotPayee`
  it('Claim: only payee can call this function;', async () => {
    await expect(this.streamManager.connect(this.admin).claim()).to.be.revertedWith("NotPayee");
  })

  // Expecting revert with `CliffPeriodIsNotEnded`
  it('Claim: cliff period is not ended;', async () => {
    // Creating stream
    await this.streamManager.connect(this.payer).createOpenStream(
        this.payee3.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod)

    await expect(this.streamManager.connect(this.payee3).claim()
    ).to.be.revertedWith("CliffPeriodIsNotEnded");
  })

  // Expecting revert with `ReentrancyGuardReentrantCall`
  it("Сlaim: if reentrant call is detected;", async () => {
    // Create the open stream
    await this.streamManager.connect(this.payer).createOpenStream(
      this.payee4.address,
      this.mockUSDT.address,
      this.amount,
      this.terminationPeriod,
      this.cliffPeriod
    );

    // Increase time
    await time.increase(2 * 24 * 3600) // + 2 days

    // Minting tokens
    await this.mockUSDT.mint(this.streamManager.address, this.amount)

    // The first call should succeed
    await expect(this.streamManager.connect(this.payee4).claim()).to.not.be.reverted
    // Recall should return an error
    expect(this.streamManager.connect(this.payee4).claim()).to.be.revertedWith('ReentrancyGuardReentrantCall')
  })
  
  // Tests for `accumulation();`
  // Amount is accumulated
  it('Return accumulated amount;', async () => {
    // Setting timestamp
    const currentTimestamp = 44 * 24 * 3600
    const claimablePeriod = currentTimestamp - this.cliffPeriod

    // Calling the `accumulation();`
    const accumulatedAmount = await this.streamManager.accumulation(this.payee1.address)
    // Calculating expected amount
    const expectedAmount = Math.floor(claimablePeriod * this.rate / 30 / 24 / 3600)
    expect(accumulatedAmount).to.equal(expectedAmount)
  });
  
  // Expecting revert with NotPayer
  it('Terminating failed: only payer can terminate;', async () => {
    await expect(
      this.streamManager.connect(this.payee2).terminate(this.payee1.address))
      .to.be.revertedWith('NotPayer')
  })
  
  // Expecting revert with NotPayee
  it('Terminating failed: payer can terminate for only payee;', async () => {
    await expect(
      this.streamManager.connect(this.payer).terminate(this.payee5.address))
      .to.be.revertedWith('NotPayee')
  })
  
  // Expecting success
  it('Terminating succeeding;', async () => {
    await expect(
      this.streamManager.connect(this.payer).terminate(this.payee1.address))
      .to.emit(this.streamManager, 'StreamTerminated')
      .withArgs(this.payee1.address)
    })
    
  // Expect revert with Terminating
  it('Terminating failed: stream is already terminated;', async () => {
    await expect(
      this.streamManager.connect(this.payer).terminate(this.payee1.address))
      .to.be.revertedWith('Terminating')
    })
  
  it('Claiming succeed;', async () => {
    const amount = this.amount * 100000
    await this.mockUSDT.mint(this.payer.address, amount)
    await this.mockUSDT.connect(this.payer).approve(this.streamManager.address, amount)
    await this.streamManager.connect(this.payer).deposit(
      this.mockUSDT.address,
      amount
    )

    const currentTimestamp = 20 * 24 * 3600
    await time.increase(currentTimestamp)
    const expectedAmount = Math.floor(61 * 24 * 3600 * this.rate / 30 / 24 / 3600)

    expect(await this.streamManager.accumulation(this.payee5.address)).to.equal(0)
    expect(await this.streamManager.accumulation(this.payee1.address)).to.equal(expectedAmount)

    await expect(
      this.streamManager.connect(this.payee1).claim()
    )
    .to.emit(this.streamManager, "TokensClaimed")
    .withArgs(this.payee1.address, expectedAmount)
  })

  // Expecting revert with `InsufficientBalance`
  it('Terminating succeed in the cliff period', async () => {
    // Creating stream
    await this.streamManager.connect(this.payer).createOpenStream(
      this.payee5.address,
      this.mockUSDT.address,
      this.rate,
      this.terminationPeriod,
      this.cliffPeriod
    )

    await this.streamManager.connect(this.payer).terminate(this.payee5.address)
    expect(await this.streamManager.accumulation(this.payee5.address)).to.equal(0)
    expect(await this.streamManager.isPayee(this.payee5.address)).to.equal(false)
  })

  // Tests for `changePayerAddress();`
  // Changing the address payer
  it('Change payer: address of the payer is changing', async () => {
    await expect(
      this.streamManager.connect(this.admin).changePayerAddress(this.payee1.address)
    ).to.emit(this.streamManager, "PayerAddressChanged")
    .withArgs(this.payee1.address);
  })

  // Expecting revert with `NotAdmin`
  it('Change payer: only the admin can call the function', async () => {
    await expect(
      this.streamManager.connect(this.payee4).changePayerAddress(this.payee1.address)
      ).to.be.revertedWith('NotAdmin')
  })

  // Expecting revert with `InvalidAddress`
  it('Change payer: not can setting address(0) how address of the payer', async () => {
    await expect(
      this.streamManager.connect(this.admin).changePayerAddress(this.zero)
      ).to.be.revertedWith('InvalidAddress')
  })

  // Expecting revert with `InvalidAddress`
  it('Change payer: existing address and new address must not match', async () => {
    await expect(
      this.streamManager.connect(this.admin).changePayerAddress(this.payee1.address)
      ).to.be.revertedWith('InvalidAddress')
  })

  // Tests for `changeCommissionAddress();`
  // Changing the address of the commission
  it('Chainge address fee: address of the admin is changing', async () => {
    await expect(
      this.streamManager.connect(this.admin).changeCommissionAddress(this.payee1.address)
    ).to.emit(this.streamManager, "CommissionAddressChanged")
    .withArgs(this.payee1.address);
  })

  // Expecting revert with `NotAdmin`
  it('Chainge address fee: only the admin can call the function', async () => {
    await expect(
      this.streamManager.connect(this.payee4).changeCommissionAddress(this.payee1.address)
      ).to.be.revertedWith('NotAdmin')
  })

  // Expecting revert with `InvalidAddress`
  it('Chainge address fee: not can setting address(0) how address of the admin', async () => {
    await expect(
      this.streamManager.connect(this.payee1).changeCommissionAddress(this.zero)
      ).to.be.revertedWith('InvalidAddress')
  })

  // Expecting revert with `InvalidAddress`
  it('Chainge address fee: existing address and new address must not match', async () => {
    await expect(
      this.streamManager.connect(this.payee1).changeCommissionAddress(this.payee1.address)
      ).to.be.revertedWith('InvalidAddress')
  })
});
