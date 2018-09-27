pragma solidity ^0.4.23;

import "./EIP20Interface.sol"; 

contract CashRegister {

    // ------
    // EVENTS
    // ------

    // Event emitted by 'newReceipt' function 
    event NewReceipt(
        address indexed _purchaser,
        uint indexed _receiptID
    );

    /* Event emitted by 'ringUpItem' function
    event NewItemRungUp(
        uint indexed _receiptID,
        string indexed _itemName,
        uint indexed _totalPrice
    );
    */

    // Owner of the physical 'store' that will utilize the cash register contract
    address public owner;
    // mapping of items in the stores inventory which maps itemName (of type 'bytes32' - as strings cannot be used as keys in a mapping) to price (of type 'uint')
    mapping(bytes32 => uint) public items; 
    // mapping of individual receipts which maps receiptID (of type uint) to a receipt (of type 'struct')
    mapping(uint => Receipt) public receipts;
    // receiptNonce is incremented by newReceipt function and used to assign a unique receiptID to each receipt created
    uint receiptNonce;
    // Each individual receipt is of type 'struct' 
    struct Receipt {
        address purchaser;
        uint receiptID; // redundant
        uint totalPrice;
        bool finished;
    }

    // Global variable 'token' of type EIP20Interface
    EIP20Interface public token; 

    constructor(address _token) public {
        // Sets the value of 'owner' to the address of the person who initialized the contract
        owner = msg.sender;
        // pass the deployed address of gribcash token to EIP20Interface
        token = EIP20Interface(_token);
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
        // keccak256 is a hanshing function 
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
        // Emit a NewItemRungUp event that contains purchasers address, receipt ID, the item just added, the item price, and the new total price of the receipt
        // emit NewItemRungUp(_receiptID, _itemName, r.totalPrice);
    }

    // A read only public function that returns the total price of all items rung up in a given receipt, and the purchasers address
    function viewReceipt(uint _receiptID) public view returns (uint totalPrice, address purchaser) {
        // Get the specific receipt (of type struct) by passing _receiptID to the receipts mapping and then assign the receipt to a storage variable named 'r'
        Receipt storage r = receipts[_receiptID];
        // Return the totalPrice rung up on the receipt and the purchasers address 
        return (r.totalPrice, r.purchaser);
    }

    // Used by the owner to finalize a receipt
    function finishReceipt(uint _receiptID) public restricted {
        // Get the receipt (of type struct) the owner wishes to finalize and assign it to a storage variable named 'r' 
        Receipt storage r = receipts[_receiptID];
        // Transfers tokens from receipt owner to CashRegister contract
        require(token.transferFrom(r.purchaser, this, r.totalPrice), "transfer from receipt owner to CashRegister contract did not complete");
        // Change the value of the 'finished' key from 'false' to 'true' on the receipt
        r.finished = true;
    }

    // Used by the owner to view the token balance of the Cash Register
    function viewContractBalance() public view restricted returns (uint tokenBalanceOfContract) {
        return token.balanceOf(this);
    }

    // Used by the owner to claim tokens 
    function claimTokens() public restricted {
        // transfer full balance of tokens in CashRegister contract to managers address 
        require(token.transfer(msg.sender, token.balanceOf(this)), "transfer of cash register tokens to manager did not complete");
    }
} 

// To Do
// add the event that isaac suggested
// remove 'receiptId' from the recipt struct - we dont need it as we cant get the receipt without the receipt ID
// dont do any hashing of strings insdie the contract functions, do those off chain to save gas