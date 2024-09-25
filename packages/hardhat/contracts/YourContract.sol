// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourContract is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint256 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    uint256 public treasuryBalance;
    uint256 public minBetAmount;
    uint256 public maxPayoutPercentage;
    uint256 public constant PERCENTAGE_BASE = 10000; // 100.00%

    mapping(uint256 => address) private s_requestIdToPlayer;
    mapping(uint256 => uint256) private s_requestIdToBetAmount;

    event CoinFlipRequested(uint256 indexed requestId, address indexed player, uint256 betAmount);
    event CoinFlipResult(uint256 indexed requestId, address indexed player, bool won, uint256 payout);
    event TreasuryFunded(uint256 amount);
    event TreasuryWithdrawn(uint256 amount);

    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint256 _minBetAmount,
        uint256 _maxPayoutPercentage
    ) VRFConsumerBaseV2(vrfCoordinatorV2) Ownable(msg.sender) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        minBetAmount = _minBetAmount;
        maxPayoutPercentage = _maxPayoutPercentage;
    }

    function betAndFlipCoin() external payable {
        require(msg.value >= minBetAmount, "Bet amount too low");
        require(treasuryBalance + msg.value >= treasuryBalance, "Treasury overflow");

        treasuryBalance += msg.value;

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId), // Cast to uint64 for VRF Coordinator
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        s_requestIdToPlayer[requestId] = msg.sender;
        s_requestIdToBetAmount[requestId] = msg.value;

        emit CoinFlipRequested(requestId, msg.sender, msg.value);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address player = s_requestIdToPlayer[requestId];
        uint256 betAmount = s_requestIdToBetAmount[requestId];
        bool won = randomWords[0] % 2 == 0;

        if (won) {
            uint256 payout = calculatePayout(betAmount);
            require(treasuryBalance >= payout, "Insufficient treasury funds");
            treasuryBalance -= payout;
            (bool success, ) = player.call{value: payout}("");
            require(success, "Transfer failed");
            emit CoinFlipResult(requestId, player, true, payout);
        } else {
            emit CoinFlipResult(requestId, player, false, 0);
        }

        delete s_requestIdToPlayer[requestId];
        delete s_requestIdToBetAmount[requestId];
    }

    function calculatePayout(uint256 betAmount) public view returns (uint256) {
        uint256 payoutPercentage = (treasuryBalance * PERCENTAGE_BASE) / (betAmount * 100);
        payoutPercentage = payoutPercentage > maxPayoutPercentage ? maxPayoutPercentage : payoutPercentage;
        return betAmount + (betAmount * payoutPercentage) / PERCENTAGE_BASE;
    }

    function fundTreasury() public payable onlyOwner {
        _fundTreasury(msg.value);
    }

    function _fundTreasury(uint256 amount) internal {
        require(treasuryBalance + amount >= treasuryBalance, "Treasury overflow");
        treasuryBalance += amount;
        emit TreasuryFunded(amount);
    }

    function withdrawTreasury(uint256 amount) external onlyOwner {
        require(amount <= treasuryBalance, "Insufficient treasury funds");
        treasuryBalance -= amount;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
        emit TreasuryWithdrawn(amount);
    }

    function setMinBetAmount(uint256 _minBetAmount) external onlyOwner {
        minBetAmount = _minBetAmount;
    }

    function setMaxPayoutPercentage(uint256 _maxPayoutPercentage) external onlyOwner {
        require(_maxPayoutPercentage <= PERCENTAGE_BASE, "Invalid percentage");
        maxPayoutPercentage = _maxPayoutPercentage;
    }

    receive() external payable {
        _fundTreasury(msg.value);
    }
}