const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const ses = new SESv2Client({});
const COMPANY_EMAIL = 'info@medvillediabetes.com';

function companyMessage() {
 return {
  subject: 'New Medville Diabetes form submission',
  text: 'A new form submission is available in the protected dashboard.\n\nSign in to review it:\nhttps://www.medvillediabetes.com/admin#leads',
 };
}

async function sendCompanyNotification(lead, client = ses) {
 if (!process.env.SENDER_EMAIL || !process.env.SES_CONFIG_SET) throw new Error('notification unavailable');
 const message = companyMessage();
 const result = await client.send(new SendEmailCommand({
  FromEmailAddress: process.env.SENDER_EMAIL,
  Destination: { ToAddresses: [COMPANY_EMAIL] },
  ConfigurationSetName: process.env.SES_CONFIG_SET,
  EmailTags: [{ Name: 'lead_id', Value: lead.id }],
  Content: { Simple: {
   Subject: { Data: message.subject, Charset: 'UTF-8' },
   Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
  } },
 }));
 return result.MessageId;
}

module.exports = { companyMessage, sendCompanyNotification };
