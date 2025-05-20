const mongoose = require('mongoose');
const User = require('../models/user.js');
const Transactions = require('../models/transactions.js');
const Account = require('../models/bankAccount.js');
const sendBrevoEmail = require('../utilities/emailSender.js');
const bcrypt = require('bcrypt');

// Get all transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transactions.find();
    res.status(200).json(transactions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get single transaction
const getTransaction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'No such transaction' });
  }

  try {
    const transaction = await Transactions.findById(id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Create a manual transaction (for admin or custom logic)
const createTransaction = async (req, res) => {
  try {
    const { amount, type, user_id, accountNumber, accountName, transactionDate } = req.body;

    const transaction = new Transactions({
      amount,
      type,
      user: user_id,
      accountNumber,
      accountName,
      transactionDate,
    });

    await transaction.save();
    res.status(200).json({ message: 'Transaction successful', transaction });
  } catch (error) {
    res.status(400).json({ error: 'Failed to save transaction' });
  }
};

// Update transaction
const updateTransaction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'No such transaction' });
  }

  try {
    const transaction = await Transactions.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'No such transaction' });
  }

  try {
    const transaction = await Transactions.findByIdAndDelete(id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Deposit endpoint
const deposit = async (req, res) => {
  const { accountNumber, depositAmount } = req.body;

  try {
    const account = await Account.findOne({ accountNumber });
    if (!account) {
      return res.status(400).json({ error: "Account not found" });
    }

    const amountToDeposit = parseFloat(depositAmount);

    // Create transaction (balance update handled by pre-save hook)
    const transaction = new Transactions({
      amount: amountToDeposit,
      type: "deposit",
      user: account.user,
      accountNumber,
      accountName: account.accountName,
      toAccount: account._id,
    });

    await transaction.save();

    // Refetch updated account
    const updatedAccount = await Account.findById(account._id);

    // Send email
    const pounds = String.fromCharCode(163);
    const newBalance = parseFloat(updatedAccount.balance.toString()).toFixed(2);
    const emailTemplate = `
      <p>A payment of ${pounds}${amountToDeposit} has been successfully credited to your Optimal Bank account. Your updated balance is ${pounds}${newBalance}.</p>
    `;

    const user = await User.findById(account.user);
    await sendBrevoEmail({
      subject: "New Transaction",
      to: [{ email: user.email, name: user.username }],
      emailTemplate,
    });

    res.status(200).json(updatedAccount);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Withdrawal endpoint
const withdrawal = async (req, res) => {
  const { accountNumber, withdrawalAmount, pin } = req.body;

  try {
    const account = await Account.findOne({ accountNumber });
    if (!account) return res.status(400).json({ error: "This account does not exist" });

    const user = await User.findById(account.user);
    if (!user) return res.status(400).json({ error: "User not found" });

    // Lock check
    if (account.withdrawalLockUntil && new Date() < account.withdrawalLockUntil) {
      return res.status(403).json({
        error: 'Account is temporarily locked due to failed attempts',
        withdrawalLockUntil: account.withdrawalLockUntil,
      });
    }

    // PIN check
    const isCorrectPin = await bcrypt.compare(pin, account.pin);
    if (!isCorrectPin) {
      account.failedWithdrawalAttempts = (account.failedWithdrawalAttempts || 0) + 1;
      if (account.failedWithdrawalAttempts >= 5) {
        account.withdrawalLockUntil = new Date(Date.now() + 60 * 1000);
        account.failedWithdrawalAttempts = 0;
        await account.save();
        await sendBrevoEmail({
          subject: "Withdrawal Locked",
          to: [{ email: user.email, name: user.username }],
          emailTemplate: `<p>Your account is locked for 1 minute due to multiple incorrect PIN attempts.</p>`,
        });
        return res.status(403).json({
          error: "Too many incorrect PIN attempts. Try again later.",
          withdrawalLockUntil: account.withdrawalLockUntil,
        });
      }
      await account.save();
      return res.status(400).json({ error: "Incorrect PIN." });
    }

    const amountToWithdraw = parseFloat(withdrawalAmount);

    // Create transaction (balance deduction handled by pre-save hook)
    const transaction = new Transactions({
      amount: amountToWithdraw,
      type: "withdrawal",
      user: user._id,
      fromAccount: account._id,
    });

    await transaction.save();

    // Refetch updated account
    const updatedAccount = await Account.findById(account._id);
    const newBalance = parseFloat(updatedAccount.balance.toString()).toFixed(2);

    // Send email
    const pounds = String.fromCharCode(163);
    const emailTemplate = `
      <p>An amount of ${pounds}${amountToWithdraw} has been withdrawn from your Optimal Bank account. Your updated balance is ${pounds}${newBalance}.</p>
    `;

    await sendBrevoEmail({
      subject: "New Transaction",
      to: [{ email: user.email, name: user.username }],
      emailTemplate,
    });

    res.status(200).json(updatedAccount);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  deposit,
  withdrawal,
};
