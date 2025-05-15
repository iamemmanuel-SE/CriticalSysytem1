const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const validator = require('validator');
const sendBrevoEmail = require('../utilities/emailSender.js');
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
      failedAccessAttempt: {
        type: Number,
        default: 0
      },
      lockLoginTimer: {
        type: Date,
        default: null
      },lastLogin: {
        ip: { type: String, required: true },
    
        place: {
          type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
          },
          coordinates: {
            type: [Number],                // [lng, lat]
            required: true,
            default: [0, 0],               // fallback if geoip fails
            validate: {
              validator: arr => arr.length === 2,
              message: 'Coordinates must be [lng, lat]'
            }
          }
        },
    
        city:    { type: String, required: true, default: 'Unknown' },
        region:  { type: String, required: true, default: 'Unknown' },
        country: { type: String, required: true, default: 'Unknown' },
        at: { type: Date, required: true, default: Date.now }
      }

      

},{timeStamps: true})
UserSchema.statics.signup = async function(username, email, password, role, req){
    //geolo=========================================
    
    // const loginLog = new LoginLog({
    // email,
    // ip,           // e.g. from req.headers or req.socket.remoteAddress
    // success: false // default until we know the password check result
    // });
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
    // const user = await this.create({username, email, password: hash, role});

// Geo lOCATION
let ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (ip === '::1') ip = '127.0.0.1';

  // GeoIP lookup
  const geo = geoip.lookup(ip) || {};
  const [lat, lng] = Array.isArray(geo.ll) && geo.ll.length === 2 ? geo.ll : [0, 0];
  const now = new Date();
  const newUser = await this.create({
    username,
    email,
    password: hash,
    role,
    lastLogin: {
      ip,
      place: { type: 'Point', coordinates: [lng, lat] },
      city:    geo.city    || 'Unknown',
      region:  geo.region  || 'Unknown',
      country: geo.country || 'Unknown',
      at: now
    }
  });

    return newUser;


}

//============================================================

UserSchema.statics.login = async function(email, password, req){
    //geolo=========================================
    let ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();
    if (ip === '::1') ip = '127.0.0.1';
    if(!email || !password)
    {
        throw Error('Enter email and password');
    }
    const user = await this.findOne({email});
    if(!user)
    {
        throw Error('Email is not found');
    }
    //check to see if system is locked

    if(user.lockLoginTimer && user.lockLoginTimer > new Date())
    {
        const minutes = Math.ceil((user.lockLoginTimer - new Date())/(60 * 1000));
        const err = new Error(`Account is locked. Try again in ${minutes} minutes(s).`);
        err.loginLockTimer = user.lockLoginTimer;
        throw err;

    }

    
    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if(!isCorrectPassword)
    {
        user.failedAccessAttempt += 1;
    
        await user.save();
        console.log("Failed");
        console.log("login failed attemptps", user.failedAccessAttempt);
        if(user.failedAccessAttempt >= 5){
            console.log("greater than 5");
              user.lockLoginTimer = new Date(Date.now() + 1 * 60 * 1000);
            user.failedAccessAttempt = 0;
            await user.save();
            const err = new Error('Password is not correct. Your account is locked for 5 minutes.');
            err.lockLoginTimer = user.lockLoginTimer;
            const emailTemplate = `
            
                <p>Failed multiple login attempts, your account is temporary locked for 5 minutes, reset your password after 5 minutes</p>
                
                
              `;
            // Call the Brevo email function
            console.log(user.username)
            await sendBrevoEmail({
            subject: 'Failed login Attempts',
            to: [{ email, name: user.username }],
            emailTemplate,
            });
            throw err;            

            
    
        }
        

        throw Error('Password is not correct');

    }
    const geo = geoip.lookup(ip)||{};
    const now = new Date();
  const coords = Array.isArray(geo.ll) && geo.ll.length === 2
    ? [geo.ll[1], geo.ll[0]]  // [lng, lat]
    : [0, 0];
    const currentLogin = {
      ip,
      place:   { type: 'Point', coordinates: coords },
      city:       geo.city    || 'Unknown',
      region:     geo.region  || 'Unknown',
      country:    geo.country || 'Unknown',
      at:         now          // ← include timestamp here
    };
  


  //  Compare to last login for fraud detection
  const prevLogin = user.lastLogin;
  if (prevLogin && Array.isArray(prevLogin.place.coordinates)) {
   

    const distance = getKilometers(prevLogin.place.coordinates,coords);
    const minutesSinceLastLogin = (now - new Date(prevLogin.at)) / 1000/60;

    if (distance > 1000 && minutesSinceLastLogin < 60) {
          user.loginLockTimer = new Date(Date.now() + 5 * 60 * 1000);

  // Save the lock status
  await user.save();
      // Potential fraud detected
      const emailTemplate = `
        <p><strong>Unusual Login Activity</strong></p>
        <p>We noticed a login to your Optimal Bank account from a new location.</p>
        <p><strong>Location:</strong> ${geo.city}, ${geo.region}, ${geo.country}</p>
        <p>If you did not authorize this activity, please reset your password immediately to secure your account.</p>
        <p>Thank you,<br>The Optimal Bank Security Team</p>

       `;

      await sendBrevoEmail({
        subject: 'Unusual Login Alert',
        to: [{ email, name: user.username }],
        emailTemplate
      });
    }
  }


// Save current login
user.lastLogin = currentLogin;
await user.save();
// loginLog.success = true;
// await loginLog.save();
return user;
    
    //lock the account if 4 attempst fail

   
    //if login is successful this time, reset the attemptssa
    if(isCorrectPassword)
    {
    user.failedAccessAttempt = 0;
    user.lockLoginTimer = null;
    await user.save();
    }
    return user;
    
}
UserSchema.index({ 'lastLogin.place': '2dsphere' });// Create a 2dsphere index on the location field
const getKilometers = (coord1, coord2) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
  
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  
  module.exports = getKilometers;
module.exports = mongoose.model('User', UserSchema);
