// SPDX-License-Identifier: UNLICENSED 
pragma solidity ^0.8.18;

import "hardhat/console.sol";

contract RapidLotto {

    struct Entry {
        address player;
        uint8[] picks;
    }

    struct Previous {
        address[] winners;
        uint8[] lotto;
        uint256 prize;
    }

    address private _banker;
    address private _gameMaster;
    address private _owner;
    address private _rate_oracle;

    bool private _active;

    string private _name;
    string private _symbol;

    uint private _pool;
    uint private _rate;
    uint private _ticketCount;

    Entry[] private _entries;
    Previous private _result;

    mapping(address => uint) private _balances;

    event Rate(uint rate);
    event Sale(address player, uint8[] picks);
    event Status(bool active);
    event Winners(Previous result);

    constructor(address banker, address gameMaster, address rate_oracle, uint ticketCount) {
        _active = false;
        _name = "Rapid Lotto";
        _banker = banker;
        _gameMaster = gameMaster;
        _owner = msg.sender;
        _rate_oracle = rate_oracle;
        _symbol = "RLT";
        _ticketCount = ticketCount;
    }

    function buyTicket(address webmaster, uint8[] memory picks) public {
        require(_active == true, "The game must be active");
        require(msg.sender != _banker, "Admin accounts cannot play");
        require(msg.sender != _owner, "The owner cannot play");
        require(msg.sender != _rate_oracle, "Admin accounts cannot play");

        _balances[msg.sender] -= 100;
        _balances[_banker] += 15;
        _balances[webmaster] += 10;
        _pool += 75;

        _entries.push(Entry({
            player: msg.sender,
            picks: picks
        }));

        emit Sale(msg.sender, picks);
    }

    function deposit() public {
        // require(_rate > 0, "The rate must be higher than zero");
        require(msg.sender != _owner, "The owner cannot make a deposit");
        require(msg.sender != _rate_oracle, "The rate oracle cannot make a deposit");
        require(_balances[msg.sender] < 1, "There is already tokens on the account");

        _balances[msg.sender] += 1000;
    }

    function getBalance(address player) external view returns(uint256) {
        return _balances[player];
    }

    function getEntries() external view returns(Entry[] memory) {
        return _entries;
    }

    function getName() external view returns(string memory) {
        return _name;
    }

    function getPoolValue() external view returns(uint) {
        return _pool;
    }

    function getPreviousResult() external view returns(Previous memory) {
        return _result;
    }

    function getRate() external view returns(uint) {
        return _rate;
    }

    function getStatus() external view returns(bool) {
        return _active;
    }

    function getSymbol() external view returns(string memory) {
        return _symbol;
    }

    function getMaxTickets() external view returns(uint) {
        return _ticketCount;
    }

    function setMaximumTickets(uint maximumTickets) public {
        require(msg.sender == _gameMaster, "Only the game master can set the maximum tickets");

        _ticketCount = maximumTickets;
    }

    function setRate(uint rate) external {
        require(msg.sender == _rate_oracle, "The rate can only be set by the oracle");
    
        _rate = rate;

        emit Rate(_rate);
    }

    function setStatus(bool status) public {
        require(msg.sender == _owner, "Only the owner can set the status");

        _active = status;

        emit Status(_active);
    }

    function withdraw() public {
        require(_balances[msg.sender] > 0, "Not enough tokens to withdraw");

        _balances[msg.sender] = 0;
    }

    function winners(address[] memory winners_, uint8[] memory lotto_) public {
        require(msg.sender == _gameMaster, "Only the game master can control the game");
        require(_entries.length >= _ticketCount, "Must sell the minimum tickets");

        uint prize = _pool / winners_.length;
        for (uint i=0; i < winners_.length; i++) {
            _balances[winners_[i]] += prize;
        }

        _result = Previous({
            winners: winners_,
            lotto: lotto_,
            prize: _pool / winners_.length
        });
        emit Winners(_result);

        _pool = 0;
        delete _entries;
    }

}
