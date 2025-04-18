const axios = require("axios")

const sendBrevoEmail = async function (options) {

    const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
     const { subject,to, emailTemplate} = options; 
  
    
    console.log("data passed to mail sender", )
    try {
    
  
      const data = {
        sender: { email: 'dicksonamankwaah3@gmail.com', name: 'Knackers Bank' }, // { email: 'sender@example.com', name: 'Sender Name' }
        to:to, // [{ email: 'recipient@example.com', name: 'Recipient Name' }]
        subject: subject,
        htmlContent: emailTemplate,
        headers: { "Homiee-User-Id": "unique-id-1234" },
      };
  
      const response = await axios.post(BREVO_API_URL, data, {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      });
  
      console.log("Email sent:", response?.data);
    } catch (error) {
      console.log("EMAIL ERR/BREVO::", error.message);
      console.error("Error sending email:", error.response ? error.response.data : error.message);
    }
}
  
module.exports = sendBrevoEmail