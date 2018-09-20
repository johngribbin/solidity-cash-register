const CashRegister = artifacts.require('CashRegister');

contract('CashRegister', async(accounts) => {
    let instance;
    let manager;
    let purchaser;

    before(async() => {
        instance = await CashRegister.deployed();
        manager = accounts[0];
        purchaser = accounts[1];
    });

    it('Prevents someone who is not the owner from adding an item to the store', async() => {
        const itemName = "apple";
        const setPrice = 5;
        // Try adding the apple and its price to the items mapping
        try {
            // Sending the transaction from account 1 (not the manager)
            await instance.addItem(itemName, setPrice, {from: purchaser });
        } catch (err) {
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }
        assert(false, 'item was added to the stores register by someone other than the manager');
    })

    it('Allows the owner to add items to the stores register', async() => {
        const itemName = "apple";
        const setPrice = 5;
        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice );
        // retrive the price of the apple from the items mapping
        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.equal(setPrice, actualPrice, 'setPrice is not the same as actualPrice');
    })

    
    it('Creates a new receipt that includes the purchasers address and a unique receiptID', async() => {
        // create a new receipt using account 1
        await instance.newReceipt(purchaser);
        // the receiptNonce will incremented from 0 to 1, so we expect receiptID to be 1
        const testID = 1;
        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(testID);

        // retrieve address and receiptID from the struct
        const purchaserAddress = receiptStruct[0].toString();
        const receiptID = receiptStruct[1].toString();
        
        assert.equal(testID, receiptID, 'testId is not the same as receiptID found on receipt');
        assert.equal(purchaser, purchaserAddress, 'account 1 address is not the same as purchaserAddress found on receipt');
    });

    
    it('Allow the purchaser to add items to their receipt', async() => {
        const itemName = 'apple';
        const setPrice = 5;

        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a new receipt using account 1
        await instance.newReceipt(purchaser);
        // the receiptNonce will incremented from 0 to 1, so we expect receiptID to be 1
        const testID = 1;

        await instance.ringUpItem(testID, itemName, { from: purchaser });

        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(testID);
        const totalPrice = receiptStruct[2].toString();

        assert.equal(setPrice, totalPrice, 'setPrice is not the same as totalPrice on the receipt');
    })

    it('Prevents anyone other than the purchaser from adding items to their receipt', async() => {
        const itemName = 'apple';
        const setPrice = 5;
        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a new receipt using account 1
        await instance.newReceipt(purchaser);
        // the receiptNonce will incremented from 0 to 1, so we expect receiptID to be 1
        const testID = 1;
        // try sending transaction from the managers address
        try {
            await instance.ringUpItem(testID, itemName, { from: manager });
        } catch(err) {
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }
        assert(false, 'allows the manager to add an item to the purchasers receipt');
    })

    it('Allows the manager to finalize a receipt', async() => {
        // create a receipt
        await instance.newReceipt(purchaser);

        const testID = 1;

        await instance.finishReceipt(testID);

        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(testID);

        const finished = receiptStruct[3].toString();

        assert(finished, true, 'did not change finished variable to true');
    })

    it('Should return purchasers address and total price of a given receipt when viewReceipt is called', async() => {
        const itemName = 'apple';
        const setPrice = 5;

        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a new receipt using account 1
        const transReceipt = await instance.newReceipt(purchaser);

        let _receiptID = transReceipt.logs[0].args._receiptID.toString();
        
        await instance.ringUpItem(_receiptID, itemName, { from: purchaser });

        const returnValues = await instance.viewReceipt.call(_receiptID);

        const [returnedTotalPrice, returnedPurchaser] = returnValues;
        
        assert.equal(returnedTotalPrice, setPrice, 'totalPrice returned from viewReceipt is not the same as setPrice');
        assert.equal(returnedPurchaser, purchaser, 'purchaser returned from viewReceipt is not the same as purchaser');
    })
    
});