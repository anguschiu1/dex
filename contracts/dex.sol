pragma solidity >=0.8.0;

import "./wallet.sol";

contract Dex is Wallet {
    enum Side {
        BUY,
        SELL
    }
    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
        uint256 filled;
    }

    uint256 public nextOrderId = 0;

    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;

    event orderPopped(Order);
    event orderBeforeProcessed(Order);
    event orderAfterProcessed(Order);

    function getOrderBook(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    function createLimitOrder(
        Side side,
        bytes32 ticker,
        uint256 amount,
        uint256 price
    ) external {
        if (side == Side.BUY) {
            require(balances[msg.sender]["ETH"] >= amount * price);
        }
        if (side == Side.SELL) {
            require(balances[msg.sender]["LINK"] >= amount);
        }
        Order[] storage orders = orderBook[ticker][uint256(side)];
        orders.push(
            Order(nextOrderId, msg.sender, side, ticker, amount, price, 0)
        );
        nextOrderId++;

        //Bubble sort
        if (side == Side.BUY) {
            for (uint256 i = 0; i < orders.length; i++) {
                for (uint256 j = i + 1; j < orders.length; j++) {
                    if (orders[i].price < orders[j].price) {
                        Order memory tmpOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = tmpOrder;
                    }
                }
            }
        } else if (side == Side.SELL) {
            for (uint256 i = 0; i < orders.length; i++) {
                for (uint256 j = i + 1; j < orders.length; j++) {
                    if (orders[i].price > orders[j].price) {
                        Order memory tmpOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = tmpOrder;
                    }
                }
            }
        }
    }

    function createMarketOrder(
        Side side,
        bytes32 ticker,
        uint256 amount
    ) external {
        uint256 orderBookSide;
        // require enough ETH for market buy orders
        if (side == Side.BUY) {
            require(
                balances[msg.sender]["ETH"] > 0,
                "Fund is zero: cannot create market order with 0 ETH"
            );
            orderBookSide = 1;
        }
        // require enough token for market sell orders
        if (side == Side.SELL) {
            require(amount > 0, "Cannot create 0 amount market order");
            require(
                balances[msg.sender][ticker] >= amount,
                "Insufficient token balance"
            );
            orderBookSide = 0;
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];
        uint256 totalFilled = 0; //amount of token filled in market order

        for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
            emit orderBeforeProcessed(orders[i]);
            uint256 leftToFill = amount - totalFilled;
            uint256 availableToFill = orders[i].amount - orders[i].filled;
            uint256 filled = 0;
            uint256 cost;
            if (availableToFill < leftToFill) {
                // Sweep the limit order
                filled = availableToFill;
            } else {
                //Buy only the amount need
                filled = leftToFill;
            }
            totalFilled += filled;
            orders[i].filled += filled;
            cost = filled * orders[i].price;

            //Execute the trade & shift balances between buyer/seller
            if (side == Side.BUY) {
                //Verify that buyer has enough ETH to cover the purchase
                require(
                    cost <= balances[msg.sender]["ETH"],
                    "Insufficient ETH to cover the buy market order"
                );
                balances[msg.sender][ticker] += filled;
                balances[msg.sender]["ETH"] -= cost;
                balances[orders[i].trader][ticker] -= filled;
                balances[orders[i].trader]["ETH"] += cost;
            } else if (side == Side.SELL) {
                //Verify that buyer has enough ETH to cover the purchase
                require(
                    cost <= balances[orders[i].trader]["ETH"],
                    "Owner of buy limit order has insufficient ETH to cover the sell market order"
                );
                balances[msg.sender][ticker] -= filled;
                balances[msg.sender]["ETH"] += cost;
                balances[orders[i].trader][ticker] += filled;
                balances[orders[i].trader]["ETH"] -= cost;
            }
            emit orderAfterProcessed(orders[i]);
        }

        //TODO Loop through the orderbook and remove 100% filled orders
        while (orders.length > 0 && orders[0].filled == orders[0].amount) {
            for (uint256 i = 0; i < orders.length - 1; i++) {
                orders[i] = orders[i + 1];
            }
            emit orderPopped(orders[orders.length - 1]);
            orders.pop();
        }
    }
}
