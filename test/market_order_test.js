const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require('truffle-assertions');


contract("Dex", accounts => {
  let dex;
  let link;

  before(async function () {
    dex = await Dex.deployed();
    link = await Link.deployed();
    await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
      from: accounts[0]
    })
    // deposit ETH to account[0] in dex balances
    await dex.depositEth({
      from: accounts[0],
      value: 500
    })
    //Send 500 LINK to three accounts
    await link.transfer(accounts[1], 500)
    await link.transfer(accounts[2], 500)
    await link.transfer(accounts[3], 500)

    //Approve dex contract to use LINK in three accounts
    await link.approve(dex.address, 500, {
      from: accounts[1]
    });
    await link.approve(dex.address, 500, {
      from: accounts[2]
    });
    await link.approve(dex.address, 500, {
      from: accounts[3]
    });

    //Deposit LINK to dex
    await dex.deposit(500, web3.utils.fromUtf8("LINK"), {
      from: accounts[1]
    });
    await dex.deposit(500, web3.utils.fromUtf8("LINK"), {
      from: accounts[2]
    });
    await dex.deposit(500, web3.utils.fromUtf8("LINK"), {
      from: accounts[3]
    });
  });

  it("Initial contract should have 500 Eth and 1500 Link balance", async () => {
    let dexEthBalance = await web3.eth.getBalance(dex.address);
    assert.equal(dexEthBalance, 500, "Contract should have 500 ETH");

    let dexLinkBalance = await link.balanceOf(dex.address);
    assert.equal(dexLinkBalance, 1500, "Contract should have 1500 LINK");
  })

  it("Initial accounts should have 500 Link and 0 ETH balance each", async () => {
    let accountLinkBalance;
    let accountEthBalance;

    accountLinkBalance = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
    assert.equal(accountLinkBalance.toNumber(), 500, "account[1] should have 500 LINK");

    accountLinkBalance = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));
    assert.equal(accountLinkBalance.toNumber(), 500, "account[2] should have 500 LINK");

    accountLinkBalance = await dex.balances(accounts[3], web3.utils.fromUtf8("LINK"));
    assert.equal(accountLinkBalance.toNumber(), 500, "account[3] should have 500 LINK");

    accountEthBalance = await dex.balances(accounts[1], web3.utils.fromUtf8("ETH"));
    assert.equal(accountEthBalance.toNumber(), 0, "account[1] should have 0 ETH");

    accountEthBalance = await dex.balances(accounts[2], web3.utils.fromUtf8("ETH"));
    assert.equal(accountEthBalance.toNumber(), 0, "account[2] should have 0 ETH");

    accountEthBalance = await dex.balances(accounts[3], web3.utils.fromUtf8("ETH"));
    assert.equal(accountEthBalance.toNumber(), 0, "account[3] should have 0 ETH");
  })

  it("Should throw an error when creating SELL MARKET order without adequate token balance", async () => {
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 0, "Initial buyer (accounts[0] LINK balance is not 0");

    await truffleAssert.reverts(
      dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
    )
  })

  it("BUY Market orders should be filled exactly to SELL limit order amount", async () => {
    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert.equal(orderBook.length, 0, "Sell side order book is not empty at start of test");

    // console.log(`dex LINK balance of account[1] is ${await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"))}`);

    //Create sell limit orders by the three accounts
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 50, 2, {
      from: accounts[1]
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 50, 1, {
      from: accounts[2]
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 50, 3, {
      from: accounts[3]
    });

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert.equal(orderBook.length, 3, "Sell side order book should have 3 orders");

    //Create market order
    // console.log(`dex ETH balance of account[0] is ${await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))}`);
    let userEthBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
    let userLinkBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));

    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 100);

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert.equal(orderBook.length, 1, "Sell side order book should left 1 order unfilled");
    assert.equal(orderBook[0].filled, 0, "First order of Sell side order should have 0 filled");

    let userEthBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
    assert.equal(userEthBalanceAfter.toNumber(), userEthBalanceBefore.toNumber() - 150, "User new ETH balance is not match");
    let userLinkBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(userLinkBalanceAfter.toNumber(), userLinkBalanceBefore.toNumber() + 100, "User new LINK balance is not match");
  })

  it("Market orders should be filled until order book is empty", async () => {
    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert(orderBook.length == 1, "Sell side order book should left 1 order unfilled");

    let userLinkBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));

    await truffleAssert.passes(
      dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 100)
    )

    let userLinkBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert(userLinkBalanceAfter.toNumber() == userLinkBalanceBefore.toNumber() + 50, "Buyer result balance not matched with filled market order");

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert(orderBook.length == 0, "Sell side order book should be empty");
  })

  it("The ETH balance of the buyer should decrease with the filled amount", async () => {
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 50, 2, {
      from: accounts[1]
    });

    let userEthBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50);
    let userEthBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

    assert.equal(userEthBalanceAfter.toNumber(), userEthBalanceBefore.toNumber() - 100, "Decreased ETH is not match");
  })

  it("Limit orders filled property should be set correctly after a trade", async () => {
    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) // Get sell side order book
    assert(orderBook.length == 0, "Sell side order book should be empty at start of test");

    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 50, 1, {
      from: accounts[1]
    });
    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 20);

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) // Get sell side order book
    assert.equal(orderBook[0].filled, 20);
    assert.equal(orderBook[0].amount, 50);
  })

  it("Market orders can be submitted even if the order book is empty", async () => {
    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0) //Get buy orderbook
    assert.equal(orderBook.length, 0, "Buy side orderbook is not empty");

    await truffleAssert.passes(
      dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
    )
  })

  //TODO create BUY Limit order and match with SELL market order
  it("SELL Market orders should be filled exactly to BUY limit order amount", async () => {
    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
    assert.equal(orderBook.length, 0, "BUY side order book is not empty at start of test");

    // console.log(`dex LINK balance of account[1] is ${await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"))}`);

    //Create sell limit orders by the three accounts
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 50, 2, {
      from: accounts[1]
    });
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 50, 1, {
      from: accounts[2]
    });
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 50, 3, {
      from: accounts[3]
    });

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
    assert.equal(orderBook.length, 3, "BUY side order book should have 3 orders");

    //Create market order
    // console.log(`dex ETH balance of account[0] is ${await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))}`);
    let userEthBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
    let userLinkBalanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));

    await dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 100);

    orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
    assert.equal(orderBook.length, 1, "BUY side order book should left 1 order unfilled");
    assert.equal(orderBook[0].filled, 0, "First order of BUY side order should have 0 filled");

    let userEthBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
    assert.equal(userEthBalanceAfter.toNumber(), userEthBalanceBefore.toNumber() + 250, "User new ETH balance is not match");
    let userLinkBalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(userLinkBalanceAfter.toNumber(), userLinkBalanceBefore.toNumber() - 100, "User new LINK balance is not match");
  })
})