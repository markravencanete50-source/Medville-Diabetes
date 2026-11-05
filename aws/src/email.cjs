
/*
 Staff alerts. Three kinds, each its own email:
 - "new": to Owners and the Sales manager, for every enquiry that arrives.
 - "personal": to a salesperson, for enquiries assigned to them and their callbacks now due.
 - "overdue": to Owners and the Sales manager, for enquiries nobody has called 30 minutes
   after they arrived.
 Every one says how many and nothing else: no patient name, phone, product, answer or the
 time of a particular enquiry. The dashboard holds the details. The only name in an email
 is the staff member's own, in the greeting.
*/
function plural(n,one,many){return`${n} ${n===1?one:many}`;}
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firstName=name=>typeof name==='string'?name.replace(/[\u0000-\u001f\u007f]/g,'').trim().split(/\s+/)[0].slice(0,40):'';

function alertContent(kind,data){
 if(kind==='new'){
  const {count=0,unassigned=0}=data;
  const lines=[`${plural(count,'new enquiry','new enquiries')} came in.`];
  if(count===1)lines.push(unassigned?'It is not assigned yet.':'It is already assigned to a salesperson.');
  else if(unassigned)lines.push(`${unassigned} of them ${unassigned===1?'is':'are'} not assigned yet.`);
  else lines.push('All of them are already assigned to a salesperson.');
  return{label:'New enquiry',greeting:'',subject:count===1?'New enquiry received':`${count} new enquiries received`,lines};
 }
 if(kind==='overdue'){
  const {count=0,unassigned=0}=data;
  const lines=[`${plural(count,'new enquiry has','new enquiries have')} waited more than 30 minutes without a call.`];
  if(unassigned)lines.push(`${unassigned===count?(count===1?'It is':'They are'):`${unassigned} of them ${unassigned===1?'is':'are'}`} not assigned yet.`);
  lines.push('Open Enquiries and choose New to see them.');
  return{label:'Needs a call',greeting:'',subject:count===1?'1 enquiry not called after 30 minutes':`${count} enquiries not called after 30 minutes`,lines};
 }
 const {assignedCount=0,callbackCount=0,name}=data;
 const lines=[];
 if(assignedCount)lines.push(`${plural(assignedCount,'new enquiry was','new enquiries were')} assigned to you. Please call as soon as you can.`);
 if(callbackCount)lines.push(`${plural(callbackCount,'callback is','callbacks are')} due now.`);
 const first=firstName(name);
 const subject=assignedCount?(assignedCount===1?'A new enquiry was assigned to you':`${assignedCount} new enquiries were assigned to you`):`${plural(callbackCount,'callback is','callbacks are')} due now`;
 return{label:assignedCount?'Assigned to you':'Callback due',greeting:first?`Hi ${first},`:'Hello,',subject,lines};
}

function alertMessage(kind,data,dashboardUrl){
 const {label,greeting,subject,lines}=alertContent(kind,data);
 const link=`${dashboardUrl.replace(/\/$/,'')}/admin`;
 const note='This email holds no patient details on purpose. Sign in to the dashboard to see them.';
 const greetingHtml=greeting?`<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#00293b">${escapeHtml(greeting)}</p>`:'';
 return{
  subject:`${subject} | Medville Diabetes`,
  text:`${greeting?`${greeting}\n\n`:''}${lines.join('\n')}\n\n${note}\n\n${link}\n\nMedville Diabetes`,
  html:`<!doctype html><html><body style="margin:0;background:#eef8fb;font-family:Arial,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef8fb"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:16px;overflow:hidden"><tr><td style="background:#00293b;padding:24px 30px"><div style="font-size:22px;font-weight:700;line-height:1.2;color:#ffffff">Medville <span style="color:#18bada">Diabetes</span></div></td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0a6d8a">${escapeHtml(label)}</p>${greetingHtml}${lines.map(line=>`<p style="margin:0 0 12px;font-size:18px;font-weight:700;line-height:1.4;color:#00293b">${escapeHtml(line)}</p>`).join('')}<p style="margin:18px 0 22px;font-size:15px;line-height:1.6;color:#264f5f">${note}</p><a href="${escapeHtml(link)}" style="display:inline-block;background:#18bada;color:#00293b;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:8px">Open the dashboard</a></td></tr><tr><td style="border-top:1px solid #d6edf3;padding:18px 30px;font-size:12px;line-height:1.6;color:#5b7883">You receive this because email alerts are on for your dashboard account. Your manager can turn them off.</td></tr></table></td></tr></table></body></html>`,
 };
}

// Sent through Resend, which the site already uses for receipts and the newsletter,
// from the same verified medvillediabetes.com sender. Alerts hold no patient details,
// so they need no BAA-covered sender. Resend stops sending to an address that bounced
// or complained. The idempotency key names the person, the kind and the newest record
// counted, so a retry after a lost reply cannot send the same email twice.
async function sendStaffAlert(email,kind,data,dashboardUrl,key='',fetcher=fetch){
 if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!process.env.SENDER_EMAIL||!process.env.RESEND_API_KEY)throw new Error('email unavailable');
 const message=alertMessage(kind,data,dashboardUrl);
 const result=await fetcher('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json',...(key?{'Idempotency-Key':`medville-alert-${key}`.slice(0,256)}:{})},
  body:JSON.stringify({from:`Medville Diabetes <${process.env.SENDER_EMAIL}>`,to:[email],subject:message.subject,text:message.text,html:message.html,tags:[{name:'kind',value:`staff_${kind}`}]}),
  signal:AbortSignal.timeout(10000),
 });
 // 409: an email with this key was already accepted, so this one is already delivered.
 if(!result?.ok&&result?.status!==409)throw new Error('email unavailable');
}

module.exports={alertMessage,sendStaffAlert};
