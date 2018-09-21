const CashRegister = artifacts.require('CashRegister');

contract('CashRegister', async(accounts) => {
    let instance;
    let manager;
    let purchaser;

    // the tests are ran on a single instance of our contract
    // The manager and purchaser addresses are made avilable to us in each test
    before(async() => {
        instance = await CashRegister.deployed();
        manager = accounts[0];
        purchaser = accounts[1];
    });

    it('should allow the owner to add an item to the stores inventory', async() => {
        const itemName = "apple";
        const setPrice = 3;
        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager });
        // retrive the price of the apple from the items mapping
        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.equal(setPrice, actualPrice, 'setPrice is not the same as actualPrice');
    })

    it('should not allow someone who is not the owner to add an item to the stores inventory', async() => {
        const itemName = "orange";
        const setPrice = 4;
        // Try adding the orange and its price to the items mapping
        try {
            // and sending the transaction from purchasers account
            await instance.addItem(itemName, setPrice, {from: purchaser });
        } catch (err) {
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'item was added to the stores inventory by the purchaser');
    })
    
    it('should creates a new receipt that includes the purchasers address and a unique ID', async() => {
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // retrieve address and receiptID from the struct
        const purchaserAddressInStruct = receiptStruct[0].toString();
        const receiptIDInStruct = Number(receiptStruct[1]);
        
        assert.equal(receiptID, receiptIDInStruct, 'receiptID taken from transaction logs is not the same as receiptID found in receipts mapping');
        assert.equal(purchaser, purchaserAddressInStruct, 'purchaser address taken from accounts is not the same as purchaserAddress found in receipts mapping');
    });
 
    it('should allow the purchaser to add an item to their receipt', async() => {
        const itemName = 'banana';
        const setPrice = 5;
        // add the banana and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // add a banana to the purchasers receipt from the purchasers address
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });
        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // find the totalPrice on the receipt
        const totalPrice = Number(receiptStruct[2]);

        assert.equal(setPrice, totalPrice, 'setPrice variable is not the same as totalPrice variable found on the receipt');
    })

    it('should allow the purchaser to add multiple items to their receipt', async() => {
        // a shopping list 
        const groceries = [
            { 'apple': 3 },
            { 'orange': 4 },
            { 'banana': 5 },
            { 'mango': 6} ,
            { 'grapefruit': 7 }
        ]
        // the total cost of the groceries on the shopping list
        const expectedCost = 25;
        // map over all the items in grocery list
        groceries.map(async item => {
            for(let itemName in item) {
                // add all the grocery items to the items mapping, using the managers address
                await instance.addItem(itemName, item[itemName], { from: manager }); 
            }
        })
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // map over all the items in the grocery list
        groceries.map(async item => {
            for(let itemName in item) {
                // add all the grocery items to the purchasers recipt, using the purchasers address
                await instance.ringUpItem(receiptID, itemName, { from: purchaser });
            }
        })
        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // find the totalPrice on the receipt
        const totalPrice = Number(receiptStruct[2]);

        assert.equal(expectedCost, totalPrice, 'the expected cost of the shopping list is not the same as the totalPrice found on the receipt');
    })

    it('should not allow anyone other than the purchaser to add an item to the purchasers receipt', async() => {
        const itemName = 'mango';
        const setPrice = 6;
        // add the mango and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // try sending transaction from the managers address
        try {
            await instance.ringUpItem(receiptID, itemName, { from: manager });
        } catch(err) {
            // check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'allows the manager to add an item to the purchasers receipt');
    })

    it('should allow the manager to finalize a receipt', async() => {
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // call finish receipt from the managers address
        await instance.finishReceipt(receiptID, { from: manager } );
        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // pull the value from the finished variable on the receipt struct
        const finishedValue = receiptStruct[3].toString();

        assert(finishedValue, true, 'did not allow the manager to finalize a receipt');
    })
    
    it('should not all anyone other than the manager to finalize a receipt', async() => {
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        try {
            // call finish receipt from the purchasers address
            await instance.finishReceipt(receiptID, { from: purchaser } );
        } catch (err) {
            // check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

       assert(false, 'allows the purchaser to finalize their own receipt');
    })
    
    it('should return the purchasers address and total price found on a given receipt when viewReceipt is called', async() => {
        const itemName = 'grapefruit';
        const setPrice = 7;
        // add the grapefruit and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        // add the grapefuit to the receipt, from the purchasers address
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });
        // call viewReceipt and get the return values
        const returnValues = await instance.viewReceipt.call(receiptID);
        // pull the returned values from the array
        const [returnedTotalPrice, returnedPurchaser] = returnValues;
        
        assert.equal(returnedTotalPrice, setPrice, 'totalPrice returned from viewReceipt is not the same as setPrice');
        assert.equal(returnedPurchaser, purchaser, 'purchaser returned from viewReceipt is not the same as purchaser');
    }) 
});