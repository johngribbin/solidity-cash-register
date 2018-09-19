const CashRegister = artifacts.require('CashRegister');

contract('CashRegister', async(accounts) => {

    it('allows the owner to add items to the stores register', async() => {
        let instance = await CashRegister.deployed();

        const itemName = "apple";
        const setPrice = 5;

        await instance.addItem(itemName, setPrice);

        const actualPrice = await instance.items.call(web3.sha3(itemName));

        assert.equal(setPrice, actualPrice, 'setPrice is not the same as actualPrice');
    })
});