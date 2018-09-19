pragma solidity ^0.4.23;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/CashRegister.sol";

contract TestCashRegister {
    function testOwnerCanAddItemsToRegister() public {

        //CashRegister instance = CashRegister(DeployedAddresses.CashRegister());
        CashRegister instance = new CashRegister();

        string memory itemName = "apple";
        uint itemPrice = 5;      

        instance.addItem(itemName, itemPrice);

        uint expectedPrice = instance.items(keccak256(abi.encodePacked(itemName)));

        Assert.equal(expectedPrice, itemPrice, "Owner can add an item to the store");
    }
}