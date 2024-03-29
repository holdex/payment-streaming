//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IStreamManager.sol";
import "./StreamManagerStorageV1.sol";

contract StreamManager is
    Initializable,
    IStreamManager,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    StreamManagerStorage
{
    using SafeERC20 for IERC20;

    /**
     * @dev New open stream event
     * @param _payer payer address
     * @param _payee payee address
     */
    event StreamCreated(address _payer, address _payee);
    /**
     * @dev Cancel open stream event
     * @param _payer payer address
     * @param _payee payee address
     */
    event StreamCancelled(address _payer, address _payee);
    /**
     * @dev Claim tokens
     * @param _payee payee address
     * @param _amount claimable amount
     */
    event TokensClaimed(address _payee, uint256 _amount);
    /**
     * @dev Terminated stream
     * @param _payee payee address
     */
    event StreamTerminated(address _payee);
    /**
     * @dev Deposit tokens
     * @param _token token address
     * @param _amount amount
     */
    event TokensDeposited(address _token, uint256 _amount);
    /**
     * @dev Payer changing
     * @param _payer new address
     */
    event PayerAddressChanged(address _payer);
    /**
     * @dev Changing address of fee
     * @param _feeAddress new address of the fee
     */
    event CommissionAddressChanged(address _feeAddress);

    ///@dev errors
    error InvalidAddress();
    error InvalidValue();
    error CliffPeriodIsNotEnded();
    error NotPayer();
    error NotPayee();
    error NotAdmin();
    error InsufficientBalance();
    error Terminating();
    error AlreadyTerminated();
    error OpenStreamExists();

    ///@dev check if the caller is payer
    modifier onlyPayer() {
        if (payer != msg.sender) revert NotPayer();
        _;
    }

    ///@dev check if the payee is
    modifier onlyPayee() {
        if (!isPayee[msg.sender]) revert NotPayee();
        _;
    }

    ///@dev check if the cliff period is ended
    modifier onlyAfterCliffPeriod() {
        uint256 createdAt = streamInstances[msg.sender].createdAt;
        uint256 cliffPeriod = streamInstances[msg.sender].cliffPeriod;
        if (block.timestamp <= createdAt + cliffPeriod)
            revert CliffPeriodIsNotEnded();
        _;
    }

    ///@dev check if the admin is
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    ///@dev proxy initializer
    function initialize(address _admin, address _payer) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        admin = _admin;
        payer = _payer;
    }

    ///@dev it calculates claimable amount.
    function calculate(
        address _payee,
        uint256 _claimedAt
    ) private view returns (uint256) {
        unchecked {
            uint256 elapsed = _claimedAt -
                streamInstances[_payee].lastClaimedAt;
            return (elapsed * streamInstances[_payee].rate) / 30 / 24 / 3600;
        }
    }

    ///@dev it gets token balance of the smart contract.
    function getTokenBalance(address _token) private view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @dev Payer can create open stream instance with the params paying amounts of USDT or USDC
     * @param _payee payee address
     * @param _token token address; USDC or USDT
     * @param _rate monthly rate
     * @param _terminationPeriod termination period
     * @param _cliffPeriod cliff period
     */
    function createOpenStream(
        address _payee,
        address _token,
        uint256 _rate,
        uint256 _terminationPeriod,
        uint256 _cliffPeriod
    ) external onlyPayer {
        if (_payee == address(0) || _token == address(0))
            revert InvalidAddress();
        if (_rate == 0 || _terminationPeriod == 0 || _cliffPeriod == 0)
            revert InvalidValue();
        if (isPayee[_payee]) revert OpenStreamExists();

        /// @dev create a new open stream instance
        streamInstances[_payee] = OpenStream(
            _payee,
            _token,
            _rate,
            _terminationPeriod,
            _cliffPeriod,
            block.timestamp,
            block.timestamp + _cliffPeriod, // lastly claimed at
            0, // terminated at
            false // isTerminated
        );
        isPayee[_payee] = true;

        emit StreamCreated(msg.sender, _payee);
    }

    ///@dev payee can claim tokens which is proportional to elapsed time (exactly seconds).
    function claim() external nonReentrant onlyPayee onlyAfterCliffPeriod {
        uint256 claimedAt = block.timestamp;
        OpenStream storage streamInstance = streamInstances[msg.sender];
        uint256 terminatedAt = streamInstance.terminatedAt;
        address token = streamInstance.token;
        uint256 terminationPeriod = streamInstance.terminationPeriod;
        bool isTerminated = streamInstance.isTerminated;
        uint256 claimableAmount;

        if (
            !isTerminated ||
            (isTerminated && claimedAt < terminatedAt + terminationPeriod)
        ) {
            claimableAmount = calculate(msg.sender, claimedAt);
        } else {
            ///@dev after the stream finished, payee can claim tokens which is accumulated until the termination period and can't claim anymore.
            claimableAmount = calculate(
                msg.sender,
                terminatedAt + terminationPeriod
            );
            isPayee[msg.sender] = false;
        }

        uint256 balance = getTokenBalance(token);
        uint256 protocolFee = claimableAmount / 10;
        if (balance < claimableAmount + protocolFee)
            revert InsufficientBalance();

        /// @dev send claimable tokens to payee
        IERC20(token).safeTransfer(msg.sender, claimableAmount);
        /// @dev send 10% commission to manager contract
        IERC20(token).safeTransfer(admin, protocolFee);
        streamInstance.lastClaimedAt = claimedAt;

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    /**
     * @dev terminate the stream instance
     * @param _payee payee's address
     */
    function terminate(address _payee) external onlyPayer {
        uint256 terminatedAt = block.timestamp;
        OpenStream storage streamInstance = streamInstances[_payee];
        if (!isPayee[_payee]) revert NotPayee();
        if (streamInstance.terminatedAt != 0) revert Terminating();
        /// Terminate in cliff period
        if (
            streamInstance.createdAt + streamInstance.cliffPeriod >=
            block.timestamp
        ) isPayee[_payee] = false;
        streamInstance.isTerminated = true;
        streamInstance.terminatedAt = terminatedAt;

        emit StreamTerminated(_payee);
    }

    /**
     * @dev deposit tokens
     * @param _token token's address
     * @param _amount token amount to deposit
     */
    function deposit(address _token, uint256 _amount) external onlyPayer {
        if (_token == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidValue();

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        emit TokensDeposited(_token, _amount);
    }

    ///@dev shows accumulated amount in USDT or USDC
    function accumulation(address _payee) public view returns (uint256 amount) {
        OpenStream memory streamInstance = streamInstances[_payee];
        if (!isPayee[_payee]) return 0;
        if (
            block.timestamp <=
            streamInstance.createdAt + streamInstance.cliffPeriod
        ) return 0;
        bool isTerminated = streamInstance.isTerminated;
        uint256 terminatedAt = streamInstance.terminatedAt;
        uint256 terminationPeriod = streamInstance.terminationPeriod;
        if (
            !isTerminated ||
            (isTerminated && block.timestamp < terminatedAt + terminationPeriod)
        ) {
            amount = calculate(_payee, block.timestamp);
        } else {
            amount = calculate(_payee, terminatedAt + terminationPeriod);
        }
    }

    ///@dev changing address of the payer
    function changePayerAddress(address _payer) public onlyAdmin {
        if (_payer == address(0)) revert InvalidAddress();
        if (_payer == payer) revert InvalidAddress();

        payer = _payer;
        emit PayerAddressChanged(_payer);
    }

    ///@dev changing address of the commission
    function changeCommissionAddress(address _feeAddress) public onlyAdmin {
        if (_feeAddress == address(0)) revert InvalidAddress();
        if (_feeAddress == admin) revert InvalidAddress();

        admin = _feeAddress;
        emit CommissionAddressChanged(admin);
    }

    ///@dev default override for uups proxies
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyAdmin {}

    ///@dev version
    function version() public pure virtual returns (string memory) {
        return "1.0.0";
    }
}
