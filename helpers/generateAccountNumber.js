const generateAccountNumber=(length = 10)=> {
    let accountNumber = '';
    for (let i = 0; i < length; i++) {
        accountNumber += Math.floor(Math.random() * 10); // Random digit (0-9)
    }
    return accountNumber;
}
module.exports = generateAccountNumber;