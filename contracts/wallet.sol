pragma solidity >=0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

// interface TokenContract {
//     function totalSupply() external view returns (uint256);

//     function transferFrom(
//         address _from,
//         address _to,
//         uint256 _amount
//     ) external returns (bool);
// }

contract Wallet is Ownable {
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }
    mapping(bytes32 => Token) public tokenMapping;
    bytes32[] public tokenList;

    // multiple mapping to store token balances for each address
    mapping(address => mapping(bytes32 => uint256)) public balances;

    modifier tokenExist(bytes32 ticker) {
        // verify if the token address is leigt and initialized (zero if uninitalized)
        require(
            tokenMapping[ticker].tokenAddress != address(0),
            "Token does not exist"
        );
        _;
    }

    // constructor() {
    //     addToken(bytes32("ETH"), address(this));
    // }

    function addToken(bytes32 ticker, address tokenAddress) public onlyOwner {
        //external because not necessary to call within contract
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function depositEth() external payable {
        balances[msg.sender][bytes32("ETH")] += msg.value;
    }

    function deposit(uint256 amount, bytes32 ticker)
        external
        tokenExist(ticker)
    {
        require(amount >= 0, "Depositing amount is zero");

        // check balance of token on msg.sender
        require(
            IERC20(tokenMapping[ticker].tokenAddress).balanceOf(msg.sender) >=
                amount,
            "Infficient amount to deposit"
        );

        // Check approve limit?

        // transfer token from msg.sender to contract address
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        // update balance
        balances[msg.sender][ticker] += amount;
    }

    function withdraw(uint256 amount, bytes32 ticker)
        external
        tokenExist(ticker)
    {
        require(
            balances[msg.sender][ticker] >= amount,
            "Balance not sufficient"
        );
        balances[msg.sender][ticker] -= amount;
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }
}
