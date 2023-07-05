//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStreamManager.sol";
import "../interfaces/IOpenStream.sol";

contract StreamManager is IStreamManager, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @dev New open stream event
     * @param _payer payer address
     * @param _payee payee address
     */
    event OpenStreamCreated(address _payer, address _payee);
    /**
     * @dev Cancel open stream event
     * @param _payer payer address
     * @param _payee payee address
     */
    event CancelStream(address _payer, address _payee);
    event TokensClaimed(address _payee, uint256 _amount);
    event StreamTerminated(address _payee);

    error InvalidAddress();
    error InvalidValue();
    error CliffPeriodIsNotEnded();
    error NotPayee();
    error NotPayer();
    error UnClaimable();
    error CanNotClaimAnyMore();
    error InsufficientBalance();
    error AlreadyTerminatedOrTerminating();

    ///@dev admin address
    address public admin;
    /// @dev Mapping for addresses of streams instance 
    mapping(address => address) public streams;

    struct OpenStream {
        address payer;
        address payee;
        address token;
        uint256 amount;
        uint256 rate;
        uint256 terminationPeriod;
        uint256 cliffPeriod;
        uint256 createdAt;
        uint256 lastClaimedAt;
        uint256 terminatedAt;
        bool isClaimable;
    }

    /// @dev payee's address => instance
    mapping(address => OpenStream) public streamInstances;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyClaimable {
        if (!streamInstances[msg.sender].isClaimable) revert UnClaimable();
        _;
    }

    // ///@dev check if the caller is payee
    // modifier onlyPayee {
    //     if (streamInstances[msg.sender]) revert NotPayee();
    //     _;
    // }

    // ///@dev check if the caller is payer
    // modifier onlyPayer {
    //     if (payer != msg.sender) revert NotPayer();
    //     _;
    // }

    ///@dev check if the cliff period is ended
    modifier onlyAfterCliffPeriod {
        if (block.timestamp <= streamInstances[msg.sender].createdAt  + streamInstances[msg.sender].cliffPeriod)
            revert CliffPeriodIsNotEnded();
        _;
    }

    /**
     * @dev Payer can create open stream instance with the params paying amounts of USDT or USDC
     * @param _payee payee address
     * @param _token token address; USDC or USDT
     * @param _amount USDC or USDT amount
     * @param _rate monthly rate
     * @param _terminationPeriod termination period
     * @param _cliffPeriod cliff period
     */
    function createOpenStream(
        address _payee,
        address _token,
        uint256 _amount,
        uint256 _rate,
        uint256 _terminationPeriod,
        uint256 _cliffPeriod
    ) external {
        if (_payee == address(0) || _token == address(0)) revert InvalidAddress();
        if (_rate == 0 || _amount == 0 || _terminationPeriod == 0 || _cliffPeriod == 0)
            revert InvalidValue();

        /// @dev create a new open stream instance
        streamInstances[_payee] = OpenStream(
            msg.sender,
            _payee,
            _token,
            _amount,
            _rate,
            _terminationPeriod,
            _cliffPeriod,
            block.timestamp, // created at
            block.timestamp, // lastly claimed at
            0,               // terminated at
            true             // isClaimable
        );

        emit OpenStreamCreated(msg.sender, _payee);
    }

    /**
     * @dev Payer can cancel open stream instance
     * @param _payee payee address
     */
    function cancelOpenStream(address _payee) external {
        if (_payee != address(0)) revert InvalidAddress();

        /// @dev change `isClaimable` in OpenStream contract to `false` in order to cancel a stream
        setClaimable(_payee, false);

        emit CancelStream(msg.sender, _payee);
    }

    ///@dev changes `isClaimable` status into `false/true`.
    function setClaimable(address _payee, bool _isClaimable) public {
        streamInstances[_payee].isClaimable = _isClaimable;
    }

    ///@dev it calculates redeemed amount.
    function calculate( address _payee, uint256 _claimedAt) public view returns (uint256) {
        uint256 elapsed = _claimedAt - streamInstances[_payee].lastClaimedAt;
        return elapsed * streamInstances[_payee].rate / 30 / 24 / 3600;
    }

    ///@dev it gets token balance of the smart contract.
    function getTokenBanance(address _token) public view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    ///@dev payee can claim tokens which is proportional to elapsed time (exactly seconds).
    function claim()
        onlyClaimable
        // onlyPayee
        onlyAfterCliffPeriod
        nonReentrant
        external
    {
        uint256 claimedAt = block.timestamp;
        uint256 terminatedAt = streamInstances[msg.sender].terminatedAt;
        uint256 lastClaimedAt = streamInstances[msg.sender].lastClaimedAt;
        address token = streamInstances[msg.sender].token;
        uint256 terminationPeriod = streamInstances[msg.sender].terminationPeriod;
        uint256 claimableAmount;

        if (terminatedAt == 0 || terminatedAt != 0 && claimedAt <= terminatedAt + terminationPeriod) {
            claimableAmount = calculate(msg.sender, claimedAt);
        } else {
            ///@dev after the stream finished, payee can claim tokens which is accumulated until the termination period and can't claim anymore.
            if (terminatedAt + terminationPeriod <= lastClaimedAt) revert CanNotClaimAnyMore();
            claimableAmount = calculate(msg.sender, terminatedAt + terminationPeriod);
        }

        uint256 balance = getTokenBanance(token);
        uint256 protocolFee = claimableAmount / 10;
        if (balance < claimableAmount + protocolFee) revert InsufficientBalance();

        /// @dev send claimable tokens to payee
        IERC20(token).safeTransferFrom(address(this), msg.sender, claimableAmount);
        /// @dev send 10% commission to manager contract
        IERC20(token).safeTransferFrom(address(this), admin, protocolFee);
        lastClaimedAt = claimedAt;

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    ///@dev terminate the stream instance
    function terminate(address _payee) external {
        if (streamInstances[_payee].terminatedAt != 0) revert AlreadyTerminatedOrTerminating();
        streamInstances[_payee].terminatedAt = block.timestamp;
        emit StreamTerminated(_payee);
    }
}
