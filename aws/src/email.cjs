const {SESv2Client,SendEmailCommand}=require('@aws-sdk/client-sesv2');
const ses=new SESv2Client({});



// Staff alerts say how many leads need attention and nothing else: no name, phone,
// product, answer or time of a particular enquiry. The dashboard holds the details.
function plural(n,one,many){return`${n} ${n===1?one:many}`;}
function staffAlertMessage({newCount=0,assignedCount=0,callbackCount=0},dashboardUrl){
 const lines=[];
 if(callbackCount)lines.push(`${plural(callbackCount,'callback is','callbacks are')} due now.`);
 if(assignedCount)lines.push(`${plural(assignedCount,'enquiry was','enquiries were')} assigned to you.`);
 if(newCount)lines.push(`${plural(newCount,'new enquiry is','new enquiries are')} waiting to be assigned.`);
 const subject=`${lines[0].replace(/\.$/,'')} | Medville Diabetes`;
 const link=`${dashboardUrl.replace(/\/$/,'')}/admin`;
 const note='This email holds no patient details on purpose. Sign in to the dashboard to see them.';
 return{
  subject,
  text:`${lines.join('\n')}\n\n${note}\n\n${link}\n\nMedville Diabetes`,
  html:`<!doctype html><html><body style="margin:0;background:#eef8fb;font-family:Arial,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef8fb"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:16px;overflow:hidden"><tr><td style="background:#00293b;padding:24px 30px"><div style="font-size:22px;font-weight:700;line-height:1.2;color:#ffffff">Medville <span style="color:#18bada">Diabetes</span></div></td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0a6d8a">Sales alert</p>${lines.map(line=>`<p style="margin:0 0 12px;font-size:18px;font-weight:700;line-height:1.4;color:#00293b">${line}</p>`).join('')}<p style="margin:18px 0 22px;font-size:15px;line-height:1.6;color:#264f5f">${note}</p><a href="${link}" style="display:inline-block;background:#18bada;color:#00293b;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:8px">Open the dashboard</a></td></tr><tr><td style="border-top:1px solid #d6edf3;padding:18px 30px;font-size:12px;line-height:1.6;color:#5b7883">You receive this because email alerts are on for your dashboard account. Your manager can turn them off.</td></tr></table></td></tr></table></body></html>`,
 };
}
async function sendStaffAlert(email,counts,dashboardUrl){
 if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!process.env.SENDER_EMAIL)throw new Error('email unavailable');
 const message=staffAlertMessage(counts,dashboardUrl);
 await ses.send(new SendEmailCommand({
  FromEmailAddress:`Medville Diabetes <${process.env.SENDER_EMAIL}>`,
  Destination:{ToAddresses:[email]},
  Content:{Simple:{Subject:{Data:message.subject,Charset:'UTF-8'},Body:{Text:{Data:message.text,Charset:'UTF-8'},Html:{Data:message.html,Charset:'UTF-8'}}}},
 }));
}

module.exports={staffAlertMessage,sendStaffAlert};
