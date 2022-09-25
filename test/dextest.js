const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require('truffle-assertions');


contract.skip("Dex", accounts => {
  let dex;
  let link;

  before(async function () {
    dex = await Dex.deployed();
    link = await Link.deployed();
    await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
      from: accounts[0]
    })
  });

  it("Initial contract should have zero Eth and Link balance", async () => {
    let dexEthBalance = await web3.eth.getBalance(dex.address);
    assert.equal(dexEthBalance, 0);

    let dexLinkBalance = await link.balanceOf(dex.address);
    assert.equal(dexLinkBalance, 0);
  })

  it("User must have enough ETH deposited s.t. deposited ETH >= buy order value", async () => {
    await truffleAssert.reverts(
      dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1)
    )
    await dex.depositEth({
      from: accounts[0],
      value: 10
    })
    await truffleAssert.passes(
      dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1)
    )

    dexEthBalance = await web3.eth.getBalance(dex.address);
    assert.equal(dexEthBalance, 10);
  })

  it("User must have enough tokens deposited s.t. token balance >= sell order amount", async () => {

    let userDexLinkBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(userDexLinkBalance.toNumber(), 0);

    await truffleAssert.reverts(
      dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 1)
    )

    await link.approve(dex.address, 500);
    await dex.deposit(100, web3.utils.fromUtf8("LINK"));
    balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 100);


    await truffleAssert.passes(
      dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 100, 1)
    )
  })
  it("The buy order in the BUY order book should ordered from highest to lowest", async () => {
    await link.approve(dex.address, 600);
    await dex.depositEth({
      value: 600
    });
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 300);
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 100);
    await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200);

    let buyOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
    assert.equal(buyOrders.length, 4);
    for (let i = 1; i < buyOrders.length; i++) {
      assert(buyOrders[i - 1].price > buyOrders[i].price, "not right order in buy book");
    }
  })
  it("The sell order in the SELL order book should ordered from lowest to highest", async () => {
    await link.approve(dex.address, 600);
    await dex.deposit(600, web3.utils.fromUtf8("LINK"));
    balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 700);

    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 300, 3);
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 100, 1);
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 200, 2);
    let sellOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert.equal(sellOrders.length, 4);
    for (let i = 1; i < sellOrders.length; i++) {
      assert(sellOrders[i - 1].price <= sellOrders[i].price);
    }
  })
})