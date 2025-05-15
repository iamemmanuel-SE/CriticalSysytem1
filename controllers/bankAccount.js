const Account = require('../models/bankAccount.js');
const mongoose = require('mongoose');
const generateAccountNumber = require('../helpers/generateAccountNumber.js');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust path if needed

const createAccount = async (req, res) => {
  const userId = req.user._id;
  const userEmail = req.user.email;       // make sure req.user.email is populated by your auth middleware
  const userName = req.user.username || ''; // or however you store the user’s name
  const { accountName, idNumber, balance } = req.body;

  try {
    const accountExists = await Account.findOne({ user: userId });
    if (accountExists) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    const rawAccountNumber = generateAccountNumber();
    const accountNumber = 'ACC' + rawAccountNumber;
    const account = await Account.create({
      accountName,
      idNumber,
      balance,
      user: userId,
      accountNumber
    });

    // --- SEND WELCOME EMAIL ---
    const emailTemplate = `
      <h2>Welcome to OptimalBank, ${userName || 'Valued Customer'}!</h2>
      <p>Your account <strong>${accountNumber}</strong> has been successfully created.</p>
      <p>Account name: ${accountName}</p>
      <p>If you didn’t initiate this, please contact our support immediately.</p>
      <p>Thank you,<br/>OptimalBank Team</p>
    `;
    await sendBrevoEmail({
      subject: 'Your OptimalBank Account Is Ready!',
      to: [{ email: userEmail, name: userName }],
      emailTemplate
    });
    // ----------------------------

    // Finally, respond with the created account
    res.status(201).json(account);
  } catch (error) {
    console.error('createAccount error:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createAccount
};
