//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IStreamManager.sol";
import "./OpenStream.sol";

contract StreamManager is IStreamManager {
    event OpenStreamCreated(address _payer, address _itself);

    constructor() {}

    function createOpenStream(address _payee, address _token, uint256 _rate) external payable {
        require(_payee != address(0), "Stream Manager: invalid address");
        require(_token != address(0), "Stream Manager: invalid address");
        require(_rate > 0, "Stream Manager: montly reate must be greater than zero");
        require(msg.value > 0, "Stream Manager: payer can't send non-zero tokens");

        OpenStream openStreamInstance = new OpenStream(
            _payee,
            _token,
            _rate
        );

        address streamInstance = address(openStreamInstance);

        (bool sent, ) = payable(streamInstance).call{value: msg.value}("");
        require(sent, "Stream Manager: it sent tokens successfully");

        emit OpenStreamCreated(msg.sender, streamInstance);
    }
}