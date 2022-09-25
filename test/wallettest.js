const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require('truffle-assertions');


contract.skip("Dex", accounts => {
  // let dex;
  // let link;

  // before(async function () {
  //   dex = await Dex.deployed();
  //   link = await Link.deployed();
  // });

  it("should only be possible for owner to add tokens", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.passes(
      dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[0]
      })
    );
    await truffleAssert.reverts(
      dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[9]
      })
    );
  });
  it("should handle deposit correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await link.approve(dex.address, 500);
    await dex.deposit(100, web3.utils.fromUtf8("LINK"));
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 100);
    let linkBalance = await link.balanceOf(accounts[0]);
    assert.equal(linkBalance.toNumber(), 99900);
  });
  it("should handle faulty withdrawals correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.reverts(
      dex.withdraw(500, web3.utils.fromUtf8("LINK"))
    )
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 100);
  });
  it("should handle withdrawals correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.passes(
      dex.withdraw(100, web3.utils.fromUtf8("LINK"))
    )
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(balance.toNumber(), 0);
    let linkBalance = await link.balanceOf(accounts[0]);
    assert.equal(linkBalance.toNumber(), 100000);
  });
})