
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
      accountNumber,
      email: userEmail,
      username: userName

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

//GET ACCOUNT BY USER
const getAccount = async(req, res) =>{
  const user = req.user._id;
  try{
        const account = await Account.findOne({user});
        res.status(200).json(account);
  }
  catch(error)
  {
      return res.status(400).json({error: error.message});
  }
}




//GET ALL BANK ACCOUNT
const getAllAccounts = async(req,res) =>{
  try{
        const accounts = await Account.find();
        res.status(200).json(accounts);
    

  }
  catch(error)
  {
     res.status(400).json({error: error.message});
  }
}

//UPDATE BANK ACCOUNT
const updateAccount = async(req, res)=>{
  const { accountNumber } = req.body;
  
  try{
        const account = await Account.findOneAndUpdate({accountNumber},{
          ...req.body
           
        })
        res.status(200).json(account);
  }
  catch(error){
      res.status(400).json({error: error.message});
  }
  


}

//DELETE BANK ACCOUNT
const deleteAccount = async(req, res)=>{
  const { accountNumber } = req.body;
 
  try{
          const account = await Account.findOneAndDelete({accountNumber});
          res.status(200).json(account);
  }
  catch(error)
  {
      res.status(400).json({error:error.message});
  }

}

//PIN RESET
const forgotPin = async (req, res) => {
  const { email } = req.body;

  try {
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({ error: 'Account not found with that email' });
    }

    const pinOTP = generatePinOTP();
    const pinOTPExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save OTP and expiry to Account
    account.resetPinOTP = pinOTP;
    account.pinOTPExpiresAt = pinOTPExpiresAt;
    await account.save();

    const emailTemplate = `
      <h1>Password Reset OTP</h1>
      <p>Hello ${account.accountName},</p>
      <p>Use the following One-Time Password (OTP) to reset your Knackers Bank account pin:</p>
      <h2>${pinOTP}</h2>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendBrevoEmail({
      subject: 'Knackers Bank Account Pin Reset OTP',
      to: [{ email: email, name: account.accountName }],
      emailTemplate,
    });

    res.status(200).json({ message: 'OTP sent to your email', email: account.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const verifyOTPAndResetPin = async (req, res) => {
  const { email, pinOTP, newPin } = req.body;

  try {
    // Find account by email
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({ error: 'Account' });
    }

    // Check if OTP matches
    if (account.resetPinOTP !== pinOTP) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if OTP has expired
    if (account.pinOTPExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // Update password and clear OTP fields
    account.pin = hashedPin;
    account.resetPinOTP = null;
    account.pinOTPExpiresAt = null;
    await account.save();

    res.status(200).json({ message: 'Pin was reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createAccount,
  getAccount, 
  getAllAccounts, 
  updateAccount, 
  deleteAccount,
  forgotPin,
  verifyOTPAndResetPin
}


