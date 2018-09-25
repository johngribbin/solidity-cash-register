var CashRegister = artifacts.require("CashRegister");
var EIP20 = artifacts.require("EIP20");

module.exports = function(deployer) {
  
  deployer.deploy(EIP20, 1000000000000000000000, "gribcash", 18, "GRC").then((result) => {
    // get address of the token contract and passing cash registers contract constructor
    return deployer.deploy(CashRegister, result.address);
  });
};