pragma solidity ^0.4.23;

import "tokens/eip20/EIP20Interface.sol";

contract CashRegister {

    // ------
    // EVENTS
    // ------

    // An event which will be emitted by the newReceipt function and contain key/value pairs named _purchaser (of type address) and _receiptID (of type uint)
    event NewReceipt(
        address indexed _purchaser,
        uint indexed _receiptID
    );


    // Owner of the physical 'store' that will utilize the cash register contract
    address public owner;
    // mapping of items in the stores inventory which receives itemName (of type 'bytes32' - as strings cannot be used as keys in a mapping) as an argument 
    // and returns the price of the item (of type 'uint')
    mapping(bytes32 => uint) public items; 
    // mapping of individual receipts which accepts receiptID (of type uint) as an argument and returns the receipt (of type 'struct')
    mapping(uint => Receipt) public receipts;
    // receiptNonce is incremented by newReceipt function and used to assign a unique receiptID to each receipt created
    uint receiptNonce;
    // Each individual receipt is of type 'struct' has keys of 'purchaser' (of type 'address'), 'receiptID (of type 'uint'), totalPrice (of type 'uint') 
    // and finished (of type 'boolean')
    struct Receipt {
        address purchaser;
        uint receiptID;
        uint totalPrice;
        bool finished;
    }


    EIP20Interface public token; 

    // Sets the value of 'owner' to the address of the person who initialized the contract
    constructor() public {
        owner = msg.sender;
    }

    // When 'restricted' modifier is added to a contract function - the function can only be called by the manager
    modifier restricted() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Used by the owner to add items to the stores inventory which will make the items available to a purchaser
    function addItem(string _itemName, uint _itemPrice) public restricted {
        // Any item added must have a price more than 0
        // When a key has a value of 0 in a mapping, solidity will assume the items doesn't exist as 0 will return from the mapping as false 
        require(_itemPrice > 0, "itemPrice must be more than 0"); 
        // Adding the item to the items mapping
        // The _itemName is the key and the _itemPrice is the value 
        items[keccak256(abi.encodePacked(_itemName))] = _itemPrice;
    }

    // Used by the owner to create a new receipt, and in the process emit a NewReceipt event
    function newReceipt(address _purchaser) public restricted {
        // Incrementing receiptNonce by 1 to create a unique receiptID for the receipt
        receiptNonce += 1;
        // Create new receipt by assigning values to the keys a Receipt struct, then add the receipt to the receipts mapping by utilizing the receiptNonce
        receipts[receiptNonce] = Receipt({ purchaser: _purchaser, receiptID: receiptNonce, totalPrice: 0, finished: false });
        // emit a NewReceipt event by passing arguments of purchasers address (assigned to _purchaser key in the event logs) 
        // and incremented receiptNonce (assigned to receiptID key in the event logs)
        emit NewReceipt(_purchaser, receiptNonce);
    }

    // Used by the purchaser, i.e. the receipt owner, to add items to their receipt
    function ringUpItem(uint _receiptID, string _itemName) public {
        // Get the specific receipt (of type struct) by passing _receiptID to the receipts mapping and then assign the receipt to a storage variable named 'r'
        Receipt storage r = receipts[_receiptID];
        // Check that the address which called ringUpItem() is the same as the address assigned purchaser key on the receipt
        require(r.purchaser == msg.sender, "only the receipt owner can call this function");
        // Check that the item that the purchaser wishes to add to their receipt is found in the items mapping
        require(items[keccak256(abi.encodePacked(_itemName))] != 0, "only items found in the store inventory can be added to receipts");
        // Check that the purchasers receipt is not marked as 'finished'
        require(r.finished == false, "only receipts that are not deemed to be finished can be updated");
        // Update the value of the totalPrice key on the receipt by pulling the price of the item from the items mapping 
        r.totalPrice += items[keccak256(abi.encodePacked(_itemName))];
    }

    // Used by the owner to finalize a receipt
    function finishReceipt(uint _receiptID) public restricted {
        // Get the receipt (of type struct) the owner wishes to finalize and assign it to a storage variable named 'r' 
        Receipt storage r = receipts[_receiptID];
        // Change the value of the 'finished' key from 'false' to 'true' on the receipt
        r.finished = true;
    }

    // A read only public function that returns the total price of all items rung up in a given receipt, and the purchasers address
    function viewReceipt(uint _receiptID) public view returns (uint totalPrice, address purchaser) {
        // Get the specific receipt (of type struct) by passing _receiptID to the receipts mapping and then assign the receipt to a storage variable named 'r'
        Receipt storage r = receipts[_receiptID];
        // Return the totalPrice rung up on the receipt and the purchasers address 
        return (r.totalPrice, r.purchaser);
    }
}