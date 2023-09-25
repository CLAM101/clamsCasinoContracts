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
    event RequestSent(uint256 requestId, uint32 numwords, uint256 gameId);
    event RequestFulfilled(
        uint256 requestId,
        uint256[] randomWords,
        uint256 gameId
    );
    struct RequestStatus {
        uint256[] _randomWords;
        bool exists;
        bool fulfilled;
        uint256 gameId;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) public pastWinners;

    //game related variables
    event GameStarted(uint gameId, uint maxPlayers, uint entryfee);
    event PlayerJoined(uint gameId, address player);
    event GameEnded(uint gameId, address recentWinner);
    uint256 gameCount;
    struct Game {
        uint256 gameId;
        address creator;
        bool isActive;
        uint256 maxPlayers;
        uint256 entryFee;
        address[] players;
        uint256 currentPot;
    }

    mapping(uint256 => Game) public games;

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

    function startGame(uint _maxPlayers, uint _entryfee) public {
        gameCount++;

        uint256 gameId = gameCount;

        games[gameId] = Game(
            gameId,
            msg.sender,
            true,
            _maxPlayers,
            _entryfee,
            new address[](0),
            0
        );

        emit GameStarted(gameId, _maxPlayers, _entryfee);
    }

    function joinGame(uint256 _amount, uint256 _gameId) external {
        Game storage fetchedGame = games[_gameId];

        require(fetchedGame.isActive == true, "Game is not active");

        require(
            fetchedGame.players.length < fetchedGame.maxPlayers,
            "Maximum players already joined"
        );
        require(
            _amount == fetchedGame.entryFee,
            "Bet amount does not equal entry fee"
        );

        fetchedGame.players.push(msg.sender);
        fetchedGame.currentPot += _amount;

        clamsToken.transferFrom(msg.sender, address(this), _amount);

        emit PlayerJoined(_gameId, msg.sender);

        if (fetchedGame.players.length == fetchedGame.maxPlayers) {
            getRandomWinner(_gameId);
            return;
        }
    }

    function getRandomWinner(uint256 gameId) internal {
        requestRandomWords(gameId);
    }

    /**
     * @notice Requests randomness
     * Assumes the subscription is funded sufficiently; "Words" refers to unit of data in Computer Science
     */
    function requestRandomWords(
        uint256 _gameId
    ) internal returns (uint256 requestId) {
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
            fulfilled: false,
            gameId: _gameId
        });

        emit RequestSent(requestId, numWords, _gameId);
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

        RequestStatus storage fetchedRequest = s_requests[_requestId];
        fetchedRequest.fulfilled = true;
        fetchedRequest._randomWords = _randomWords;
        randomWordsNum = _randomWords[0]; // Set array-index to variable, easier to play with
        emit RequestFulfilled(_requestId, _randomWords, fetchedRequest.gameId);

        Game storage fetchedGame = games[fetchedRequest.gameId];

        uint256 winnerIndex = randomWordsNum % fetchedGame.players.length;

        address recentWinner = fetchedGame.players[winnerIndex];
        clamsToken.approve(address(this), fetchedGame.currentPot);

        bool success = clamsToken.transferFrom(
            address(this),
            recentWinner,
            fetchedGame.currentPot
        );
        require(success, "Could not send winnings");

        fetchedGame.isActive = false;
        fetchedGame.currentPot = 0;

        pastWinners[fetchedGame.gameId] = recentWinner;
        emit GameEnded(fetchedGame.gameId, recentWinner);
    }

    function getPotById(uint256 _gameId) public view returns (uint256) {
        return games[_gameId].currentPot;
    }

    function getPlayersById(
        uint256 _gameId
    ) public view returns (address[] memory) {
        return games[_gameId].players;
    }

    function checkForActiveSession(
        uint256 _gameId
    ) public view returns (Game memory) {
        return games[_gameId];
    }

    function currentTime() public view returns (uint) {
        return block.timestamp;
    }

    function getRequestStatus(
        uint256 _requestId
    )
        external
        view
        returns (bool fulfilled, uint256[] memory randomWords, uint256 gameId)
    {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request._randomWords, request.gameId);
    }
}
