const CashRegister = artifacts.require('CashRegister');

contract('CashRegister', async(accounts) => {
    let instance;
    let manager;
    let purchaser;
    
    before(async() => {
        // The tests are ran on a single instance of the contract
        instance = await CashRegister.deployed();
        // The manager and purchaser addresses are made avilable to each test
        manager = accounts[0];
        purchaser = accounts[1];
    });

    it('should allow the owner to add an item to the stores inventory', async() => {
        const itemName = "apple";
        const setPrice = 3;
        // Add the apple and its price to the items mapping, sending the transaction from the managers address
        await instance.addItem(itemName, setPrice, { from: manager });
        // Retrive the price of the apple from the items mapping (returns a value of type Big Number)
        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.strictEqual(setPrice, Number(actualPrice), 'setPrice is not the same as actualPrice');
    })

    it('should not allow someone who is not the owner to add an item to the stores inventory', async() => {
        const itemName = "orange";
        const setPrice = 4;
        // Try adding the orange and its price to the items mapping, sending the transaction from the purchasers address
        try {
            await instance.addItem(itemName, setPrice, {from: purchaser });
        } catch (err) {
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'item was added to the stores inventory by the purchaser');
    })
    
    it('should creates a new receipt that includes the purchasers address and a unique ID', async() => {
        // Create a store receipt by passing the purchasers address as an argument to the newReceipt function to obtain the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the purchaser (of type address) and receiptID (of type uint) from the event logs
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = Number(transReceipt.logs[0].args._receiptID);
        // Retrive the receipt (of type struct) from the receipts mapping by passing the receiptID taken from logs
        const receiptStruct = await instance.receipts.call(receiptIDFromLogs);
        // Retrieve purchaser (of type address) and receiptID (of type uint) from the receipt struct obtained from receipts mapping
        const purchaserAddressInStruct = receiptStruct[0].toString();
        const receiptIDInStruct = Number(receiptStruct[1]);
        
        assert.strictEqual(purchaserFromLogs, purchaserAddressInStruct, 'purchaser address taken from transaction logs is not the same as purchaser address found in receipts mapping');
        assert.strictEqual(receiptIDFromLogs, receiptIDInStruct, 'receiptID taken from transaction logs is not the same as receiptID found in receipts mapping');
    });
 
    it('should allow the purchaser to add an item to their receipt', async() => {
        const itemName = 'banana';
        const setPrice = 5;
        // Add banana and its price to the items mapping and send transaction from the managers address
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // Create a store receipt and assign the transaction receipt to 'transReceipt'
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // Add ONE banana to the purchasers receipt and send the transaction from the purchasers address
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });
        // Find the item price in the items mapping by wrapping itemName in a web3 helper to convert it from type string to bytes32
        const itemPriceInMapping = await instance.items.call(web3.sha3(itemName));
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // Find the totalPrice on the receipt
        const totalPriceOnReceipt = Number(receiptStruct[2]);

        assert.strictEqual(Number(itemPriceInMapping), totalPriceOnReceipt, 'setPrice variable is not the same as totalPrice variable found on the receipt');
    })

    it('should allow the purchaser to add multiple items to their receipt', async() => {
        // A shopping list of 5 items
        const groceries = [
            { 'apple': 3 },
            { 'orange': 4 },
            { 'banana': 5 },
            { 'mango': 6 } ,
            { 'grapefruit': 7 }
        ]
        // The total cost of the groceries on the shopping list
        const expectedCost = 25;
        // Map over all the items in grocery list
        groceries.map(async item => {
            for(let itemName in item) {
                // Add all the grocery items to the items mapping, sending the transactions from the managers address
                await instance.addItem(itemName, item[itemName], { from: manager }); 
            }
        })
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // Map over all the items in the grocery list
        groceries.map(async item => {
            for(let itemName in item) {
                // Add all the grocery items to the purchasers recipt, sending the transaction from the purchasers address
                await instance.ringUpItem(receiptID, itemName, { from: purchaser });
            }
        })
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // Find the totalPrice on the receipt
        const totalPrice = Number(receiptStruct[2]);

        assert.strictEqual(expectedCost, totalPrice, 'the expected cost of the shopping list is not the same as the totalPrice found on the receipt');
    })

    it('should not allow anyone other than the purchaser to add an item to the purchasers receipt', async() => {
        const itemName = 'mango';
        const setPrice = 6;
        // add the mango and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // Try add an item to the receipt and send the transaction from the managers address
        try {
            await instance.ringUpItem(receiptID, itemName, { from: manager });
        } catch(err) {
            // Check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'allows the manager to add an item to the purchasers receipt');
    })

    it('should allow the manager to finalize a receipt', async() => {
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // Send a transaction from the managers address to the 'finishReceipt' function 
        await instance.finishReceipt(receiptID, { from: manager } );
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // Obtain the value for the 'finished' variable on the receipt struct
        const finishedValue = receiptStruct[3].toString();

        assert(finishedValue, true, 'did not allow the manager to finalize a receipt');
    })
    
    it('should not all anyone other than the manager to finalize a receipt', async() => {
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by 'newReceipt' function
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        try {
            // Send a transaction from the purchasers address to the 'finishReceipt' function
            await instance.finishReceipt(receiptID, { from: purchaser } );
        } catch (err) {
            // Check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'allows the purchaser to finalize their own receipt');
    })
    
    it('should return the purchasers address and total price found on a given receipt when viewReceipt is called', async() => {
        const itemName = 'grapefruit';
        const setPrice = 7;
        // add the grapefruit and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // Create a receipt 
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // Add the grapefuit to the receipt, sending the transaction from the purchasers address
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });
        // Call viewReceipt and get the return values
        const returnValues = await instance.viewReceipt.call(receiptID);
        // Pull the returned values from the array
        const [returnedTotalPrice, returnedPurchaser] = returnValues;
        
        assert.strictEqual(setPrice, Number(returnedTotalPrice), 'totalPrice returned from viewReceipt is not the same as setPrice');
        assert.strictEqual(returnedPurchaser, purchaser, 'purchaser returned from viewReceipt is not the same as purchaser');
    }) 
});