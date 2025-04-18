 const mongoose = require('mongoose');
const User = require('../models/user.js');
const Transactions = require('../models/transactions.js');
//getTransaction
const getTransactions = async(req,res)=>{
    const user_id = req.user._id;
    try{
    const transaction = await Transactions.findOne({user_id});
    res.status(200).json(transaction);
    }
    catch(error)
    {
        res.status(400).json({error: error.message});
    }
}
//getTransactions
const getTransaction = async(req,res)=>{
      const { id } = req.params;
      if(!mongoose.Types.ObjectId.isValid(id))
      {
        res.status(400).json({error: 'No such transaction'});
      }
      try{
         const transaction = await Transactions.findById(id);
         res.status(200).json(transaction);
      }
      catch(error)
      {
        res.status(400).json({error: 'No such transaction'});
      }
}

 const createTransaction = async(req, res)=>{


    const user_id = req.user._id;
    
    try{
        const { amount, type, fromAccount, toAccount,description, user_id, transactionDate } = req.body;
        const transaction = new Transactions({amount, type, fromAccount, toAccount, description, user_id, transactionDate});
        await transaction.save();
        res.status(200).json({message: 'Transaction successful', transaction});

    }
    catch(error){
        res.status(400).json({error: "Failed to create a balance"});
    }
} 
const updateTransaction = async(req, res) =>{
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        res.status(400).json({error: 'No such transaction'})
    }
    try{
         const transaction = await Transactions.findOneAndUpdate(id,{
            ...req.body 
         })
         res.status(200).json(transaction);
    }
    catch(error)
    {
        res.status(400).json({error: 'No such transaction'});
    }
}
const deleteTransaction = async(req,res)=>{
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        res.status(400).json({error: 'No such transaction'});
    }
    try{
           const transaction = await Transactions.findOneAndDelete(id);
           res.status(200).json(transaction);
    }
    catch(error){
        res.status(400).json({error: 'No such transaction'});
    }
}
module.exports = {
    createTransaction,getTransactions,getTransaction,updateTransaction, deleteTransaction
}

 