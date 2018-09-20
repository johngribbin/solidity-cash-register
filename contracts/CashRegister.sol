pragma solidity ^0.4.23;

contract CashRegister {

    event NewReceipt(
        address indexed _purchaser,
        uint indexed _receiptID
    );

    // Owner of the 'store' that operates the cash register
    address public owner;
    // Receives itemName as a string and returns the price of the item as a uint
    mapping(bytes32 => uint) public items; 
    // Receives receiptID as a unint and returns the specific Receipt struct
    mapping(uint => Receipt) public receipts;
    // receiptNonce is incremented and used to assign a unique receiptID to each receipt
    uint receiptNonce;
    // Each individual receipt takes the form of a struct
    struct Receipt {
        address purchaser;
        uint receiptID;
        uint totalPrice;
        bool finished;
    }

    // Set the address of the 'owner' to be the person who initializes the contract
    constructor() public {
        owner = msg.sender;
    }

    // When added to a function, it can only be called by the owner
    modifier restricted() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // used by owner to add items to his/her store to make them available to a purchaser
    function addItem(string _itemName, uint _itemPrice) public restricted {
        // any item added must have a price more than 0, otherwise it will not be found in the items mapping 
        require(_itemPrice > 0, "itemPrice must be more than 0"); 
        // adding the item to the items mapping
        // The itemName is the key, and the itemPrice is the value returned
        items[keccak256(abi.encodePacked(_itemName))] = _itemPrice;
    }

    // used by the owner to create a new receipt, and in the process emit a NewReceipt event
    function newReceipt(address _purchaser) public restricted {
        // create a unique receiptID for the receipt by incrementing receiptNonce by 1
        receiptNonce += 1;
        // emit a NewReceipt event, passing in the purchaser and the incremented receiptNonce 
        emit NewReceipt(_purchaser, receiptNonce);
        // create new receipt utilizing the Receipt struct
        // add the receipt to the receipts smapping, passing the values assigned to be assigned to the variables
        receipts[receiptNonce] = Receipt({purchaser: _purchaser, receiptID: receiptNonce, totalPrice: 0, finished: false});
    }

    // used by the purchaser (receipt owner) to add items to their specifc receipt
    function ringUpItem(uint _receiptID, string _itemName) public {
        // get the receipt (struct) by passing receiptID
        Receipt storage r = receipts[_receiptID];
        // only purchaser is allowed to add items
        require(r.purchaser == msg.sender, "only the receipt owner can call this function");
        // only items found in the store can be added to the receipt
        require(items[keccak256(abi.encodePacked(_itemName))] != 0, "only items found in the store inventory can be added");
        // check that the receipt is not marked as 'finished' 
        require(r.finished == false, "only receipts that are not deemed finished can be updated");
        // update total price by finding price of the item in items mapping 
        r.totalPrice += items[keccak256(abi.encodePacked(_itemName))];
    }

    // used by the owner to finalize a receipt
    function finishReceipt(uint _receiptID) public restricted {
        // get the receipt the owner wants to finish
        Receipt storage r = receipts[_receiptID];
        // change 'false' to 'true' - meaning no new items can be added to this receipt
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