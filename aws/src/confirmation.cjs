// The customer's receipt for a submitted form. It carries no submitted answers.
// Sent through Resend, as the live deployment of 2026-10-30 does. Whether Resend
// may receive the patient's email address under the BAA is an open question in
// LAUNCH-STATUS.md; switching to SES is a change to this file only.
function confirmationMessage(kind='eligibility'){
 const contact=kind==='contact';
 const heading=contact?'We received your message':'We received your request';
 const intro=contact
  ?'Your message was submitted successfully. Our team will review your question and contact you as soon as possible.'
  :'Your information was submitted successfully. Our team will review your request and contact you as soon as possible.';
 const note=contact
  ?'Please do not reply with medical records or sensitive health information.'
  :'Submitting a request does not guarantee insurance coverage or qualification. Please do not reply with medical records or sensitive health information.';
 return{
  subject:`${heading} | Medville Diabetes`,
  text:`${heading}\n\n${intro}\n\n${note}\n\nIf you did not submit this request, contact us at info@medvillediabetes.com or 800-394-3917.\n\nMedville Diabetes\n28863 Industry Dr\nValencia, CA 91355`,
  html:`<!doctype html><html><body style="margin:0;background:#eef8fb;font-family:Arial,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef8fb"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:16px;overflow:hidden"><tr><td style="background:#00293b;padding:24px 30px"><div style="font-size:22px;font-weight:700;line-height:1.2;color:#ffffff">Medville <span style="color:#18bada">Diabetes</span></div></td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0a6d8a">Submission received</p><h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#00293b">${heading}</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#264f5f">${intro}</p><div style="margin:0;padding:18px;border-radius:10px;background:#eef8fb"><p style="margin:0;font-size:14px;line-height:1.6;color:#456b79">${note}</p></div><p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#456b79">If you did not submit this request, contact us at <a href="mailto:info@medvillediabetes.com" style="color:#006b87">info@medvillediabetes.com</a> or <a href="tel:+18003943917" style="color:#006b87">800-394-3917</a>.</p></td></tr><tr><td style="border-top:1px solid #d6edf3;padding:18px 30px;font-size:12px;line-height:1.6;color:#5b7883">Medville Diabetes<br>28863 Industry Dr<br>Valencia, CA 91355</td></tr></table></td></tr></table></body></html>`,
 };
}

async function sendSubmissionConfirmation(email,kind='eligibility',submissionId='',fetcher=fetch){
 if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!process.env.SENDER_EMAIL||!process.env.RESEND_API_KEY)throw new Error('email unavailable');
 const message=confirmationMessage(kind);
 const result=await fetcher('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json',...(submissionId?{'Idempotency-Key':`medville-confirmation-${submissionId}`}:{})},
  body:JSON.stringify({from:`Medville Diabetes <${process.env.SENDER_EMAIL}>`,to:[email],reply_to:[process.env.SENDER_EMAIL],subject:message.subject,text:message.text,html:message.html}),
 });
 if(!result?.ok)throw new Error('email unavailable');
}

module.exports={confirmationMessage,sendSubmissionConfirmation};
