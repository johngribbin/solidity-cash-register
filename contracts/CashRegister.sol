pragma solidity ^0.4.23;

contract CashRegister {

    event NewReceipt(
        address indexed _purchaser,
        uint indexed _receiptID
    );

    // Owner of the physical 'store' that will utilize the cash register contract
    address public owner;
    // mapping of items in the stores inventory which accepts itemName as a string and returns the price of the item as a uint
    mapping(bytes32 => uint) public items; 
    // mapping of individual receipts which accepts receiptID as a unint and returns the receipt of type 'struct'
    mapping(uint => Receipt) public receipts;
    // receiptNonce is incremented by newReceipt function and used to assign a unique receiptID to each receipt
    uint receiptNonce;
    // Each individual receipt takes the form of a struct
    struct Receipt {
        address purchaser;
        uint receiptID;
        uint totalPrice;
        bool finished;
    }

    // Sets the value of 'owner' to be the address of the person who initializes the contract
    constructor() public {
        owner = msg.sender;
    }

    // When added to a function, it can only be called by the owner
    modifier restricted() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Used by owner to add items to the stores inventory which will make the items available to a purchaser
    function addItem(string _itemName, uint _itemPrice) public restricted {
        // any item added must have a price more than 0, otherwise it will not be found in the items mapping
        require(_itemPrice > 0, "itemPrice must be more than 0"); 
        // adding the item to the items mapping
        // The _itemName is the key, and the _itemPrice will be the value returned when the a
        items[keccak256(abi.encodePacked(_itemName))] = _itemPrice;
    }

    // Used by the owner to create a new receipt, and in the process emit a NewReceipt event
    function newReceipt(address _purchaser) public restricted {
        // create a unique receiptID for the receipt by incrementing receiptNonce by 1
        receiptNonce += 1;
        // Create new receipt by assigning values to the keys in the Receipt struct, then add the receipt to the receipts mapping by utilizing the receiptNonce
        receipts[receiptNonce] = Receipt({ purchaser: _purchaser, receiptID: receiptNonce, totalPrice: 0, finished: false });
        // emit a NewReceipt event by passing in the purchaser and the incremented receiptNonce (assigned to receiptID key in the event logs)
        emit NewReceipt(_purchaser, receiptNonce);
    }

    // Used by the purchaser, i.e. the receipt owner, to add items to their receipt
    function ringUpItem(uint _receiptID, string _itemName) public {
        // Get the specific receipt (struct) by passing receiptID to the receipts mapping and assign it in a storage variable named 'r'
        Receipt storage r = receipts[_receiptID];
        // Only the purchaser is allowed to add items
        require(r.purchaser == msg.sender, "only the receipt owner can call this function");
        // Only items found in the store can be added to the receipt
        require(items[keccak256(abi.encodePacked(_itemName))] != 0, "only items found in the store inventory can be added");
        // Only receipts not marked as 'finished' can have items items added to them
        require(r.finished == false, "only receipts that are not deemed finished can be updated");
        // Update totalPrice variable on the receipt struct by finding the price of the item in the items mapping 
        r.totalPrice += items[keccak256(abi.encodePacked(_itemName))];
    }

    // Used by the owner to finalize a receipt
    function finishReceipt(uint _receiptID) public restricted {
        // Get the receipt (struct) the owner wants to finish and assign to storage variable named 'r'
        Receipt storage r = receipts[_receiptID];
        // Change 'finished' variable from 'false' to 'true' on the receipt struct
        r.finished = true;
    }

    // returns the total price of all items rung up in a given receipt, and the purchasers address
    // this function only reads from the state - and anyone can call it
    function viewReceipt(uint _receiptID) public view returns (uint totalPrice, address purchaser) {
        // get the specific receipt
        Receipt storage r = receipts[_receiptID];
        // return the totalPrice rung up on the receipt and the purchasers address
        return (r.totalPrice, r.purchaser);
    }
}