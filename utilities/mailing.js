const nodemailer = require("nodemailer")
const dotenv = require("dotenv")

dotenv.config()

//nodemailer for newUser Creation email notification



const mailSender = (content, receiver, subject) => {
    const transporter = nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com', {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        }
    })

    let mailOptions = {
        from:"restaurantRating.com",
        to: receiver,
        subject: subject,
        text: content
    }

    transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
            console.log("email error:", err)
        } else {
            console.log("email send successfully")
        }
    })
}



module.exports  = mailSender