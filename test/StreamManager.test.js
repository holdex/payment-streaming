const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StreamManager", function () {
  before(async () => {
    const [admin, payer, payee1, payee2] = await ethers.getSigners();
    this.admin = admin
    this.payer = payer
    this.payee1 = payee1
    this.payee2 = payee2
    this.zero = ethers.constants.AddressZero
    this.amount = 1000
    this.rate = 1500

    this.terminationPeriod = 30 * 24 * 3600; // 30 days
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

    expect(await this.mockUSDT.balanceOf(this.payer.address)).to.equal(ethers.BigNumber.from("20000000000"))
  })

  // Tests for `createOpenStream();`
  // Creating stream
  it('Creating an open stream instance succeed;', async () => {
    await expect(this.streamManager.createOpenStream(
      this.payee1.address,
      this.mockUSDT.address,
      this.rate,
      this.terminationPeriod,
      this.cliffPeriod
    ))
    .to.emit(this.streamManager, "StreamCreated")
    .withArgs(this.admin.address, this.payee1.address)
  })

  // Expercing rever with `InvalidAddress`
  it('Creating open stream instance: `_payee` and `_token` are not set as address(0);', async () => {
    // Setting `_payee` = address(0)
    await expect(
      this.streamManager.createOpenStream(
        this.zero,
        this.mockUSDT.address,
        1500,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidAddress');

    // Setting `_token` = address(0)
    await expect(
      this.streamManager.createOpenStream(
        this.payee1.address,
        this.zero,
        1500,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidAddress');
  })

  // Expercing rever with `InvalidValue`
  it('Creating an open stream instance: `_rate`, `_terminationPeriod`, `_cliffPeriod` not set how 0;', async () => {
    // Setting `_rate` = 0
    await expect(
      this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        0,
        this.terminationPeriod,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidValue');

    // Setting `_terminationPeriod` = 0
    await expect(
      this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        1500,
        0,
        this.cliffPeriod
      )
    ).to.be.revertedWith('InvalidValue');

    // Setting `_cliffPeriod` = 0
    await expect(
      this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        1500,
        this.terminationPeriod,
        0
      )
    ).to.be.revertedWith('InvalidValue');
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

  // Expecing rever with `InvalidAddress`
  it('Deposit: `_token` not set how address(0);', async () => {
    // Setting `_token` = address(0)
    await expect(
      this.streamManager.connect(this.payer).deposit(
      this.zero,
      this.amount
    ))
    .to.be.revertedWith('InvalidAddress');
  })

  // Expecing rever with `InvalidValue`
  it('Deposit: `_amount` not set how 0;', async () => {
    // Setting `_amount` = 0
    await expect(
      this.streamManager.connect(this.payer).deposit(
      this.mockUSDT.address,
      0
    ))
    .to.be.revertedWith('InvalidValue');
  })

  // Expecing rever with `NotPayer`
  it('Deposit: only payer can call this function;', async () => {
    // Calling from other address
    await expect(
      this.streamManager.connect(this.payee1).deposit(
      this.mockUSDT.address,
      this.amount
    ))
    .to.be.revertedWith('NotPayer');
  })

  // Returning 0, because the current timestamp is less than the sum of the thread creation time and the "cliff" period 
  it('Accumulated: timestamp not less than the sum of the stream creation time and the "cliff" period;', async () => {
    // Calling the `accumulation();`
    const accumulatedAmount = await this.streamManager.connect(this.payee1).accumulation()

    expect(accumulatedAmount).to.equal(0)
  });

  // Tests for `accumulation();`
  // Amount is accumulated
  it('Return accumulated amount;', async () => {
    // Setting timestamp
    const currentTimestamp = 2 * 24 * 3600
    const claimablePeriod = currentTimestamp - this.cliffPeriod
    await time.increase(currentTimestamp); // + 2 days

    // Calling the `accumulation();`
    const accumulatedAmount = await this.streamManager.connect(this.payee1).accumulation()
    // Calculating expected amount
    const expectedAmount = Math.floor(claimablePeriod * this.rate / 30 / 24 / 3600)
    expect(accumulatedAmount).to.equal(expectedAmount)
  });

  // Expecing rever with `NotPayee`
  it('Accumulated: only payee can call this function;', async () => {
    // Calling from other address
    await expect(
      this.streamManager.connect(this.payer).accumulation()
    )
    .to.be.revertedWith('NotPayee');
  })

  // Expect revert with NotPayer
  it('Terminating failed: only payer can terminate;', async () => {
    await expect(
      this.streamManager.connect(this.payee2).terminate(this.payee1.address))
      .to.be.revertedWith('NotPayer')
  })
  
  // Expect success
  it('Terminating succeeding;', async () => {
    await expect(
      this.streamManager.connect(this.payer).terminate(this.payee1.address))
      .to.emit(this.streamManager, 'StreamTerminated')
      .withArgs(this.payee1.address)
    })
    
  // Expect revert with AlreadyTerminatedOrTerminating
  it('Terminating failed: stream is already terminated;', async () => {
    await expect(
      this.streamManager.connect(this.payer).terminate(this.payee1.address))
      .to.be.revertedWith('AlreadyTerminatedOrTerminating')
    })  

  // Tests for `claim();`
  // Claiming USDT
  it('Claiming is succeed;', async () => {
    const currentTimestamp = 2 * 24 * 3600
    const claimablePeriod = currentTimestamp - this.cliffPeriod
    const expectedAmount = Math.floor(claimablePeriod * this.rate / 30 / 24 / 3600)

    await expect(
      this.streamManager.connect(this.payee1).claim()
    )
    .to.emit(this.streamManager, "TokensClaimed")
    .withArgs(this.payee1.address, expectedAmount)
  })

  // Expecing rever with `NotPayee`
  it('Claim: only payee can call this function;', async () => {
    await expect(this.streamManager.connect(this.admin).claim()).to.be.revertedWith("NotPayee");
  })

  // Expecing rever with `CliffPeriodIsNotEnded`
  it('Claim: cliff period is not ended;', async () => {
    // Creating stream
    await this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod)

    await expect(this.streamManager.connect(this.payee1).claim()
    ).to.be.revertedWith("CliffPeriodIsNotEnded");
  })
  
  // Expecing rever with `InsufficientBalance`
  it.only("Claim: insufficient balance", async () =>  {
    // Creating stream
    await this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod)

    await time.increase(2 * 24 * 3600); // + 2 days

    await expect(this.streamManager.connect(this.payee1).claim()).to.be.revertedWith("InsufficientBalance")
  });

  // Expecing rever with `ReentrancyGuardReentrantCall`
  /*it("claim: if reentrant call is detected;", async () => {
    await this.streamManager.createOpenStream(
        this.payee1.address,
        this.mockUSDT.address,
        this.rate,
        this.terminationPeriod,
        this.cliffPeriod)
    const currentTimestamp = 2 * 24 * 3600
    await time.increase(currentTimestamp); // + 2 days

    // Call the claim function inside another claim function to make a recursive call
    async function recursiveClaim() {
      await this.streamManager.connect(this.payee1).claim();
    }

    await expect(recursiveClaim()).to.be.revertedWith("ReentrancyGuardReentrantCall");
  });*/

  /** TODO:
   *  1) fix: Claim: if reentrant call is detected;
   *  2) fix: Claim: insufficient balance // working when .only
   *  2) writing the test for `else` in `claim();`
   *  3) writing the test for `revert CanNotClaimAnyMore();`
   *  4) writing the test for `nonReentrant` (modifier)   
   */ 

});