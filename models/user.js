const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const validator = require('validator');
const UserSchema = new Schema({
    username: {
        type: String, 
        required: true 
    },
    email: {
        type: String,
        required: true 
       },
    password: {
        type:String,
        required: true
    },
    emailVerified: {
        type: Boolean,
        default: false
      },
      role:{
        type:String,
        required: true
      },
      resetOTP: {
        type: String,
      },
      otpExpiresAt: {
        type: Date,
      },
      failedLoginAttempts: {
        type: Number,
        default: 0
      },
      loginLockUntil: {
        type: Date,
        default: null
      }


},{timeStamps: true})
UserSchema.statics.signup = async function(username, email, password, role){
    if(!username || !email || !password)
    {
        throw Error("Fill in all fields");
    }
    const usernameTaken = await this.findOne({username});
    const emailTaken = await this.findOne({email});

    if(usernameTaken)
    {
        throw Error('Username already taken');
    }
    if(emailTaken) 
    {
        throw Error('Email already taken');
    }
    if(!validator.isEmail(email))
    {
        throw Error('Enter a valid email address');
    }
    if(!validator.isStrongPassword(password))
    {
        throw Error('Password is weak');
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await this.create({username, email, password: hash, role});
    return user;

    

}
UserSchema.statics.login = async function(email, password){
    if(!email || !password)
    {
        throw Error('Enter email and password');
    }
    const isCorrectEmail = await this.findOne({email});
    if(!isCorrectEmail)
    {
        throw Error('Email is not found');
    }
    //check to see if system is locked

    if(isCorrectEmail.loginLockUntil && isCorrectEmail.loginLockUntil > new Date())
    {
        const minutes = Math.ceil((isCorrectEmail.loginLockUntil - new Date())/(60 * 1000));
        const err = new Error(`Account is locked. Try again in ${minutes} minutes(s).`);
        err.loginLockUntil = isCorrectEmail.loginLockUntil;
        throw err;

    }

    
    const isCorrectPassword = await bcrypt.compare(password, isCorrectEmail.password);
    if(!isCorrectPassword)
    {
        isCorrectEmail.failedLoginAttempts += 1;
    
        await isCorrectEmail.save();
        console.log("Failed");
        console.log("login failed attemptps", isCorrectEmail.failedLoginAttempts);
        if(isCorrectEmail.failedLoginAttempts >= 5){
            console.log("greater than 5");
              isCorrectEmail.loginLockUntil = new Date(Date.now() + 15 * 60 * 1000);
            isCorrectEmail.failedLoginAttempts = 0;
            await isCorrectEmail.save();
            const err = new Error('Password is not correct. Your account is locked for 15 minutes.');
            err.loginLockUntil = isCorrectEmail.loginLockUntil;
            throw err;            

            
    
        }
        

        throw Error('Password is not correct');

    }
    
    //lock the account if 4 attempst fail

   
    //if login is successful this time, reset the attemptssa
    if(isCorrectPassword)
    {
    isCorrectEmail.failedLoginAttempts = 0;
    isCorrectEmail.loginLockUntil = null;
    await isCorrectEmail.save();
    }
    return isCorrectEmail;
    
}
module.exports = mongoose.model('User', UserSchema);
