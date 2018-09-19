var CashRegister = artifacts.require("CashRegister");

module.exports = function(deployer) {
  // deployment steps
  deployer.deploy(CashRegister);
};