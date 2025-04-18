const User = require('../models/user.js');
const jwt = require('jsonwebtoken');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly
const crypto = require('crypto');
const bcrypt = require('bcrypt');


 const createToken = (_id) =>{
    return jwt.sign({_id}, process.env.SECRET, {expiresIn: '2d'});

}
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};


const verifyEmail = async (req, res) => {
    const { token } = req.query;
  
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.emailVerified = true;
      await user.save();
  
      res.status(200).send(`<h2>Email verified successfully! 🎉</h2>`);
    } catch (error) {
      res.status(400).send(`<h2>Invalid or expired token.</h2>`);
    }
  };

const signup = async(req, res) =>{
    const { username, email, password, role} = req.body;
    try{
          const user = await User.signup(username, email, password,role);
          const token = createToken(user.id);
          const userId = user.id;

          const verificationToken = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: '1d' });

          const verificationLink = `https://criticalbankbackend-4a0be9a2198b.herokuapp.com/api/users/verifyEmail?token=${verificationToken}`;
          
          const emailTemplate = `
            <h1>Welcome ${username}!</h1>
            <p>Thank you for signing up for Knackers Bank.</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="${verificationLink}">Verify Email</a>
          `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'Welcome to Knackers Bank!',
to: [{ email: email, name: username }],
emailTemplate,
});
          res.status(200).json({email, token, userId});
    


    }
    catch(error){
         res.status(400).json({error:error.message});
    }
}
const login = async(req, res) =>{
    const { email, password } = req.body;
    try{
        const user = await User.login(email, password);
         const token = createToken(user.id);
        const userId = user.id;
        res.status(200).json({email:user.email, token, userId, role: user.role, emailVerified: user.emailVerified, loginLockUntil: user.loginLockUntil}); 
    }
    catch(error){
        res.status(400).json({error: error.message,loginLockUntil: error.loginLockUntil || null});
    }
}
const getAllUsers = async(req,res)=>{
  try{
       const users = await User.find();
       res.status(200).json(users);

  }
  catch(error)
  {
    res.status(400).json({error: error.message});
  }
}


const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save OTP and expiry to user
    user.resetOTP = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    const emailTemplate = `
      <h1>Password Reset OTP</h1>
      <p>Hello ${user.username},</p>
      <p>Use the following One-Time Password (OTP) to reset your Knackers Bank account password:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendBrevoEmail({
      subject: 'Knackers Bank Password Reset OTP',
      to: [{ email: email, name: user.username }],
      emailTemplate,
    });

    res.status(200).json({ message: 'OTP sent to your email', email: user.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTPAndResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP matches
    if (user.resetOTP !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if OTP has expired
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.resetOTP = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = { signup, login, verifyEmail,getAllUsers,forgotPassword,verifyOTPAndResetPassword}