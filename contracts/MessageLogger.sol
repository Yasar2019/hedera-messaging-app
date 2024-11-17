// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MessageLogger {
    struct Message {
        address sender;
        string messageHash;
        uint256 timestamp;
    }

    Message[] public messages;

    event MessageLogged(address sender, string messageHash, uint256 timestamp);

    function logMessage(string memory messageHash) public {
        messages.push(Message(msg.sender, messageHash, block.timestamp));
        emit MessageLogged(msg.sender, messageHash, block.timestamp);
    }

    function getMessage(uint256 index) public view returns (address, string memory, uint256) {
        Message storage msgData = messages[index];
        return (msgData.sender, msgData.messageHash, msgData.timestamp);
    }

    function getTotalMessages() public view returns (uint256) {
        return messages.length;
    }
}
