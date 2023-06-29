//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IOpenStream.sol";

contract OpenStream is ReentrancyGuard, IOpenStream {
    address payee;
    address token;
    uint256 rate;

    constructor(
        address _payee,
        address _token,
        uint256 _rate
    ) ReentrancyGuard() {
        payee = _payee;
        token = _token;
        rate = _rate;
    }

}
