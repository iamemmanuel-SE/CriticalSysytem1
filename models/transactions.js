 const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Account = require('./bankAccount');
const TransactionSchema = new Schema({
     amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: '0.0', // or: default: mongoose.Types.Decimal128.fromString('0.0') 
     },
     type:{
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer'],
        required: true 
     },
     fromAccount:{
        type: String,
        required: function(){
            return this.type === 'withdrawal' || this.type === 'transfer'; 
        }
     },
     toAccount:{
         type: String,
         required: function(){
            return this.type === 'deposit' || this.type === 'transfer';
         }
     },
     description:{
        type:String,
     },
     user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true 
    },
    transactionDate:{
        type: Date,
        default: Date.now 
    } 

},{timestamps:true})
TransactionSchema.pre('save', async function (next) {
    const Account = require('./models/Account'); // Import Account model

    // Withdrawal: Deduct from user's own account
    if (this.type === 'withdrawal') {
        const account = await Account.findById(this.fromAccount);

        if (!account) return next(new Error('Account not found'));

        const currentBalance = parseFloat(account.balance.toString());
        const transactionAmount = parseFloat(this.amount.toString());

        if (transactionAmount > currentBalance) {
            return next(new Error('Insufficient balance'));
        }

        // Deduct balance
        account.balance = mongoose.Types.Decimal128.fromString((currentBalance - transactionAmount).toFixed(2));
        await account.save();
    }

    // Deposit: Add to user's own account
    if (this.type === 'deposit') {
        const account = await Account.findById(this.toAccount);

        if (!account) return next(new Error('Account not found'));

        const transactionAmount = parseFloat(this.amount.toString());
        const toBalance = parseFloat(account.balance.toString());

        // Add balance
        account.balance = mongoose.Types.Decimal128.fromString((toBalance + transactionAmount).toFixed(2));
        await account.save();
    }

    // Transfer: Deduct from `fromAccount` and add to `toAccount`
    if (this.type === 'transfer') {
        if (this.fromAccount === this.toAccount) {
            return next(new Error('Cannot transfer to the same account'));
        }

        const fromAccount = await Account.findById(this.fromAccount);
        const toAccount = await Account.findById(this.toAccount);

        if (!fromAccount) return next(new Error('Source account not found'));
        if (!toAccount) return next(new Error('Destination account not found'));

        const fromBalance = parseFloat(fromAccount.balance.toString());
        const transactionAmount = parseFloat(this.amount.toString());

        if (transactionAmount > fromBalance) {
            return next(new Error('Insufficient balance'));
        }

        // Deduct from `fromAccount`
        fromAccount.balance = mongoose.Types.Decimal128.fromString((fromBalance - transactionAmount).toFixed(2));
        await fromAccount.save();

        // Add to `toAccount`
        const toBalance = parseFloat(toAccount.balance.toString());
        toAccount.balance = mongoose.Types.Decimal128.fromString((toBalance + transactionAmount).toFixed(2));
        await toAccount.save();
    }

    next();
});
module.exports = mongoose.model('Transaction', TransactionSchema);
 