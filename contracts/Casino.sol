// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

//remember to remove before deployment
import "hardhat/console.sol";

contract Casino is VRFConsumerBaseV2, Ownable {
    //general contract variables
    using SafeERC20 for IERC20;
    uint256 public currentPot;
    IERC20 private clamsToken;

    //chainlink VRF variables
    VRFCoordinatorV2Interface immutable COORDINATOR;
    uint64 immutable s_subscriptionId;
    bytes32 immutable s_keyHash;
    uint32 constant CALLBACK_GAS_LIMIT = 100000000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;
    uint32 constant numWords = 1;
    uint256[] public requestIds;
    uint256 public lastRequestId;
    uint public randomWordsNum;
    event RequestSent(uint256 requestId, uint32 numwords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        uint256[] _randomWords;
        bool exists;
        bool fulfilled;
    }
    mapping(uint256 => RequestStatus) public s_requests;

    //game related variables
    uint public maxPlayers;
    event GameStarted(uint gameId, uint maxPlayers, uint entryfee);
    event PlayerJoined(uint gameId, address player);
    event GameEnded(uint gameId, address recentWinner);
    mapping(address => uint32) public s_playerNumbers;
    address[] public players;
    bool public gameStarted;
    uint public gameId;
    uint public entryfee;
    address public recentWinner;

    constructor(
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        address token
    ) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_keyHash = keyHash;
        s_subscriptionId = subscriptionId;
        clamsToken = IERC20(token);
    }

    receive() external payable {}

    fallback() external payable {}

    function startGame(uint _maxPlayers, uint _entryfee) public onlyOwner {
        require(!gameStarted, "Game already started");

        players = new address[](0);

        maxPlayers = _maxPlayers;

        gameStarted = true;
        entryfee = _entryfee;

        gameId += 1;
        emit GameStarted(gameId, maxPlayers, entryfee);
    }

    function joinGame(uint256 _amount) external {
        require(gameStarted, "The Game has not started");
        require(players.length < maxPlayers, "Maximum players already joined");
        require(_amount == entryfee, "Bet amount does not equl entry fee");

        players.push(msg.sender);
        currentPot += _amount * 10 ** 18;

        clamsToken.transferFrom(msg.sender, address(this), _amount * 10 ** 18);

        emit PlayerJoined(gameId, msg.sender);

        if (players.length == maxPlayers) {
            getRandomWinner();
            return;
        }
    }

    function getRandomWinner() internal {
        requestRandomWords();
    }

    /**
     * @notice Requests randomness
     * Assumes the subscription is funded sufficiently; "Words" refers to unit of data in Computer Science
     */
    function requestRandomWords() internal returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            numWords
        );

        s_requests[requestId] = RequestStatus({
            _randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });

        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, numWords);
        return requestId; // requestID is a uint.
    }

    /**
     * @notice Callback function used by VRF Coordinator
     *
     * @param _requestId - id of the request
     * @param _randomWords - array of random results from VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId]._randomWords = _randomWords;
        randomWordsNum = _randomWords[0]; // Set array-index to variable, easier to play with
        emit RequestFulfilled(_requestId, _randomWords);

        uint256 winnerIndex = randomWordsNum % players.length;

        recentWinner = players[winnerIndex];
        clamsToken.approve(address(this), currentPot);

        bool success = clamsToken.transferFrom(
            address(this),
            recentWinner,
            currentPot
        );
        require(success, "Could not send winnings");

        gameStarted = false;
        currentPot = 0;
        emit GameEnded(gameId, recentWinner);
    }

    function getCurrentPot() public view returns (uint256) {
        return currentPot;
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    function currentTime() public view returns (uint) {
        return block.timestamp;
    }

    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request._randomWords);
    }
}
