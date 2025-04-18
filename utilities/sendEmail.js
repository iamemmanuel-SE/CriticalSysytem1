require('dotenv').config();  // Load environment variables from .env file
const AWS = require('aws-sdk');
const expressAsyncHandler = require('express-async-handler');

// Configure AWS SES
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Create SES service object
const ses = new AWS.SES();




// Function to send an email
const sendEmail = expressAsyncHandler(async (receiverEmail="dicksonamankwaah3@gmail.com", senderEmail="dicksonamankwaah3@gmail.com", emailSubject="hello Dickson", emailBody="my friend") => {
    const params = {
      Source: senderEmail,  // Verified email address
      Destination: {
        ToAddresses: [receiverEmail],  // List of recipient email addresses
      },
      Message: {
        Subject: { 
          Data: 'Test Email from Amazon SES',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email sent from Amazon SES using Node.js!',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<strong>This is a test email sent from Amazon SES using Node.js!</strong>',
            Charset: 'UTF-8',
          },
        },
      },
    };
  

    const result = await ses.sendEmail(params).promise();
    console.log('Email sent successfully:', result);

})
  
module.exports = sendEmail
