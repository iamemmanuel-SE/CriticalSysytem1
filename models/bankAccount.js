const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const BankAccountSchema = new Schema({
    accountName:{
        type: String, 
        required: true 
    },
    idNumber:{
        type: String,
        required: true 
    },
      user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
            required: true 
        },
        balance: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            default: mongoose.Types.Decimal128.fromString('0.0')
        },
        accountNumber:{
            type: String,
            required: true,
        }
})

module.exports = mongoose.model('Account', BankAccountSchema);