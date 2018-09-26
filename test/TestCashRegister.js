const CashRegister = artifacts.require('CashRegister');
const Token = artifacts.require('EIP20');

contract('CashRegister', async(accounts) => {
    let instance;
    let manager;
    let purchaser;
    let token;
    
    before(async() => {
        // The tests are ran on a single instance of the contract
        instance = await CashRegister.deployed();

        token = await Token.deployed();

        // The manager and purchaser addresses are made avilable to each test
        manager = accounts[0];
        purchaser = accounts[1];

        // Bankroll the purchaser with 10k of gribcash
        await token.transfer(purchaser, 10000, { from: manager })
        // approve the contract to debit tokens from the manager 
        await token.approve(instance.address, 1000000000, { from: manager });
        // approve the contract to debit tokens from the purchaser
        await token.approve(instance.address, 1000000000, { from: purchaser });
        // approve the manager to debit tokens from the contract
        // await token.approve(manager, 1000000000, { from: instance.address });
    });

    it('should allow the owner to add an item to the stores inventory', async() => {
        const itemName = "apple";
        const setPrice = 3;
        // Add the apple and its price to the items mapping, sending the transaction from the managers address
        await instance.addItem(itemName, setPrice, { from: manager });
        // Find the actual price in the items mapping by wrapping itemName in a web3 helper to convert it from type string to bytes32
        // This returns a big number
        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.strictEqual(setPrice, actualPrice.toNumber(), 'setPrice is not the same as actualPrice');
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
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber()
        // Retrive the receipt (of type struct) from the receipts mapping by passing the receiptID taken from logs
        const receiptStruct = await instance.receipts.call(receiptIDFromLogs);
        // Retrieve purchaser (of type address) and receiptID (of type uint) from the receipt struct obtained from receipts mapping
        const purchaserAddressInStruct = receiptStruct[0].toString();
        const receiptIDInStruct = receiptStruct[1].toNumber();
        
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
        const receiptID = transReceipt.logs[0].args._receiptID.toNumber();
        // Add ONE banana to the purchasers receipt and send the transaction from the purchasers address
        await instance.ringUpItem(receiptID, itemName, { from: purchaser });
        // Find the item price in the items mapping by wrapping itemName in a web3 helper to convert it from type string to bytes32
        const itemPriceInMapping = await instance.items.call(web3.sha3(itemName));
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptID);
        // Find the totalPrice on the receipt
        const totalPriceOnReceipt = receiptStruct[2].toNumber();

        assert.strictEqual(itemPriceInMapping.toNumber(), totalPriceOnReceipt, 'setPrice variable is not the same as totalPrice variable found on the receipt');
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
        // Get the puchasers address receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber();
        // Map over all the items in the grocery list
        groceries.map(async item => {
            for(let itemName in item) {
                // Add all the grocery items to the purchasers recipt, sending the transaction from the purchasers address
                await instance.ringUpItem(receiptIDFromLogs, itemName, { from: purchaserFromLogs });
            }
        })
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptIDFromLogs);
        // Retrieve the totalPrice from the receipt
        const totalPrice = receiptStruct[2].toNumber();

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
        const receiptID = transReceipt.logs[0].args._receiptID.toNumber();
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

    it('should return the purchasers address and total price found on a given receipt when viewReceipt is called', async() => {
        const itemName = 'grapefruit';
        const setPrice = 7;
        // add the grapefruit and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // Create a receipt 
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the purchasers address and receiptID from the logs, i.e. the event that is emitted
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber();
        // Add the grapefuit to the receipt, sending the transaction from the purchasers address
        await instance.ringUpItem(receiptIDFromLogs, itemName, { from: purchaserFromLogs });
        // Call viewReceipt and get the return values
        const returnValues = await instance.viewReceipt.call(receiptIDFromLogs);
        // Pull the returned values from the array returned from 'viewReceipt' function
        const [returnedTotalPrice, returnedPurchaser] = returnValues;
        
        assert.strictEqual(setPrice, returnedTotalPrice.toNumber(), 'totalPrice returned from viewReceipt is not the same as setPrice');
        assert.strictEqual(purchaserFromLogs, returnedPurchaser, 'purchaser address returned from viewReceipt is not the same as purchaser address found in logs');
    }) 

    it('should allow the manager to finalize a receipt', async() => {
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the receiptID from the logs, i.e. the event that is emitted by the 'newReceipt' function
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber();
        // Send a transaction from the managers address to the 'finishReceipt' function 
        await instance.finishReceipt(receiptIDFromLogs, { from: manager } );
        // Retrive the receipt struct from the receipts mapping
        const receiptStruct = await instance.receipts.call(receiptIDFromLogs);
        // Obtain the value for the 'finished' variable on the receipt struct
        const finishedValue = receiptStruct[3].toString();

        assert(finishedValue, true, 'did not allow the manager to finalize a receipt');
    })
    
    it('should not allow anyone other than the manager to finalize a receipt', async() => {
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the purchasers address and receiptID from the logs, i.e. the event that is emitted by 'newReceipt' function
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber();

        try {
            // Send a transaction from the purchasers address to the 'finishReceipt' function
            await instance.finishReceipt(receiptIDFromLogs, { from: purchaserFromLogs } );
        } catch (err) {
            // Check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'allows the purchaser to finalize their own receipt');
    })

    it('should debit tokens from the purchaser and credit them to the contract when the manager finalizes a receipt', async() => {
        const itemName = 'watermelon';
        const setPrice = 8;
        // Add the watermelon and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the purchasers address and receiptID from the logs, i.e. the event that is emitted by 'newRecipt'
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber()
        // Add the grapefuit to the receipt, sending the transaction from the purchasers address
        await instance.ringUpItem(receiptIDFromLogs, itemName, { from: purchaserFromLogs });
        // Get purchasers token balance before receipt is finalized
        const purchaserBalanceBeforeTransfer = await token.balanceOf.call(purchaser); 
        // Get contracts token balance before receipt is finalized
        const contractBalanceBeforeTransfer = await instance.viewContractBalance.call({ from: manager }); 
        // Finalize receipt using managers address to transfer receipt total in tokens from purchaser to the contract
        await instance.finishReceipt(receiptIDFromLogs, { from: manager });
        // Get purchasers token balance after receipt is finalized
        const purchaserBalanceAfterTransfer = await token.balanceOf.call(purchaser);
        // Get contracts token balance after receipt is finalized
        const contractBalanceAfterTransfer = await instance.viewContractBalance.call({ from: manager });
        // Calculate amount of tokens debited from the purchaser
        const tokensDebitedFromPurchaser = purchaserBalanceBeforeTransfer.toNumber() - purchaserBalanceAfterTransfer.toNumber();
        // Calculate amount of tokens credited to the Contract
        const tokensCreditedToContract = contractBalanceBeforeTransfer.toNumber() + contractBalanceAfterTransfer.toNumber();
        
        assert.strictEqual(tokensDebitedFromPurchaser, tokensCreditedToContract, "number of tokens debited from from the purchaser is not the same as the number of tokens credited to the contract");
    })

    it('should not allow anyone other than the manager to view the token balance of CashRegister', async() => {
        try {
            // call 'viewContractBalance' function from the purchasers addresss
            await instance.viewContractBalance.call({ from: purchaser });
        } catch (err) {
            // Check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }
        
        assert(false, 'allows the purchaser to view the token balance of the contract');
    })

    
    it('should allow the manager to claim all tokens in the CashRegister', async() => {
        const itemName = 'jackfruit';
        const setPrice = 9;
        // Add the jackfruit and its price to the items mapping
        await instance.addItem(itemName, setPrice, { from: manager }); 
        // Create a store receipt and get the transaction receipt
        const transReceipt = await instance.newReceipt(purchaser);
        // Get the purchasers address and receiptID from the logs, i.e. the event that is emitted by 'newRecipt'
        const purchaserFromLogs = transReceipt.logs[0].args._purchaser.toString();
        const receiptIDFromLogs = transReceipt.logs[0].args._receiptID.toNumber()
        // Add the jackfruit to the receipt, sending the transaction from the purchasers address
        await instance.ringUpItem(receiptIDFromLogs, itemName, { from: purchaserFromLogs });
        // Finalize receipt using managers address to transfer receipt total in tokens from purchaser to the contract
        await instance.finishReceipt(receiptIDFromLogs, { from: manager } );
        // Get contracts token balance before token transfer from contract to manager
        const contractBalanceBeforeTransfer = await instance.viewContractBalance.call({from: manager }); 
        // Get the managers token balance before token transfer from contract to manager
        const managerBalanceBeforeTransfer = await token.balanceOf.call(manager);
        // Transfer token balance of contract to manager
        await instance.claimTokens({ from: manager })
        // Get contract token balance after token transfer from contract to manager
        const contractBalanceAfterTransfer = await instance.viewContractBalance.call({from: manager });
        // Get managers token balance after token transfer from contract to manager
        const managerBalanceAfterTransfer = await token.balanceOf.call(manager);
        // Calculate amount of tokens debited from the contract
        const tokensDebitedFromContract = contractBalanceBeforeTransfer.toNumber() - contractBalanceAfterTransfer.toNumber();
        // Calculate amount of tokens credited to the manager
        const tokensCreditedToManager = managerBalanceBeforeTransfer.toNumber() + managerBalanceAfterTransfer.toNumber();

        console.log(tokensDebitedFromContract);

        console.log(tokensCreditedToManager);

        assert.strictEqual(tokensDebitedFromContract, tokensCreditedToManager, 'number of tokens debited from the contract is not the same as number of tokens credited to the manager')
    })
    
    it('should not allow anyone other than the manager to debit tokens from the CashRegister to the manager', async() => {
        try {
            // send transaction to claimTokens from the purchasers address
            await instance.claimTokens({ from: purchaser });
        } catch (err) {
            // Check if the error thrown includes the word 'revert'
            assert(err.toString().includes('revert'));
            return;
        }

        assert(false, 'allows the purchaser to debit tokens from the contract to the manager')
    })
    

});