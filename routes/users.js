const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail,getAllUsers, forgotPassword, verifyOTPAndResetPassword } = require('../controllers/user.js');
router.post('/signup', signup);
router.post('/login', login);
router.get('/verifyEmail', verifyEmail);
router.get('/allUsers', getAllUsers);
router.post('/forgotPassword', forgotPassword);
router.post('/resetPassword',verifyOTPAndResetPassword)
module.exports = router;