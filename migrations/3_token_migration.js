const Link = artifacts.require("Link");

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(Link);
};