// to do
// write test to check no one other than manager can finalize a receipt
// think about other tests
// if test suite is done, ask mike to review

const CashRegister = artifacts.require('CashRegister');

contract('CashRegister', async(accounts) => {
    let instance;
    let manager;
    let purchaser;

    // ran before each test so that our tests are ran on a single instance of our contract
    before(async() => {
        instance = await CashRegister.deployed();
        manager = accounts[0];
        purchaser = accounts[1];
    });

    it('should allow the owner to add items to the stores inventory', async() => {
        const itemName = "apple";
        const setPrice = 3;
        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice );
        // retrive the price of the apple from the items mapping
        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.equal(setPrice, actualPrice, 'setPrice is not the same as actualPrice');
    })

    it('should prevent someone who is not the owner from adding an item to the stores inventory', async() => {
        const itemName = "orange";
        const setPrice = 4;
        // Try adding the apple and its price to the items mapping
        try {
            // and sending the transaction from purchasers account
            await instance.addItem(itemName, setPrice, {from: purchaser });
        } catch (err) {
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }
        assert(false, 'item was added to the stores inventory by someone other than the manager');
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
        
        assert.equal(receiptID, receiptIDInStruct, 'testId is not the same as receiptID found on receipt');
        assert.equal(purchaser, purchaserAddressInStruct, 'account 1 address is not the same as purchaserAddress found on receipt');
    });
 
    it('should allow the purchaser to add items to their receipt', async() => {
        const itemName = 'banana';
        const setPrice = 5;
        // add the apple and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);

        await instance.ringUpItem(receiptID, itemName, { from: purchaser });

        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        const totalPrice = receiptStruct[2].toString();

        assert.equal(setPrice, totalPrice, 'setPrice is not the same as totalPrice on the receipt');
    })

    it('should prevent anyone other than the purchaser from adding items to the purchasers receipt', async() => {
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
            // check the error includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }
        assert(false, 'allows the manager to add an item to the purchasers receipt');
    })

    it('should allows the manager to finalize a receipt', async() => {
        // create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);

        await instance.finishReceipt(receiptID);

        // retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);

        const finished = receiptStruct[3].toString();

        assert(finished, true, 'did not change finished variable to true');
    })
    
    /*
    it('should prevent anyone other than the manager from finalizing a receipt', async() => {

    })
    */

    it('should return the purchasers address and total price found on a given receipt when viewReceipt is called', async() => {
        const itemName = 'grapefruit';
        const setPrice = 7;
        // add the grapefruit and its price to the items mapping
        await instance.addItem(itemName, setPrice ); 
        // create a receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // get the receiptID from the logs, i.e. the event that is emitted
        const receiptID = Number(transReceipt.logs[0].args._receiptID);
        
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });

        const returnValues = await instance.viewReceipt.call(receiptID);

        const [returnedTotalPrice, returnedPurchaser] = returnValues;
        
        assert.equal(returnedTotalPrice, setPrice, 'totalPrice returned from viewReceipt is not the same as setPrice');
        assert.equal(returnedPurchaser, purchaser, 'purchaser returned from viewReceipt is not the same as purchaser');
    })
    
});