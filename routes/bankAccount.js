const express = require('express');
const  {createAccount,getAccount, getAllAccounts, updateAccount, deleteAccount,forgotPin, verifyOTPAndResetPin} = require('../controllers/bankAccount.js');
const auth = require('../middleware/auth.js');
const router = express.Router();
router.post('/', auth, createAccount);
router.get('/user',auth,getAccount);
router.get('/allAccounts', getAllAccounts);
router.put('/',updateAccount);
router.delete('/', deleteAccount);
router.post('/forgotPin',auth,forgotPin);
router.post('/resetPin',auth,verifyOTPAndResetPin);

module.exports = router;