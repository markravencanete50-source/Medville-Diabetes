import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const origin='https://www.medvillediabetes.com';
const template=readFileSync('aws/medville-phi-stack.yaml','utf8').replace(/\r\n/g,'\n');
const id='10000000-0000-4000-8000-000000000001';
// Admin tests read a stored lead by default (an invented arrival key and stage); intake tests do not.
const storedLead=c=>({Item:{id:c.input.Key.id,gsi1sk:`2026-10-01T00:00:00.000Z#${c.input.Key.id}`,status:'new'}});
function runtime(name,{send=name==='Admin'?async c=>c.kind==='GetCommand'?storedLead(c):{}:async()=>({}),emailSend=async()=>({MessageId:'synthetic-message'}),identity={uid:'synthetic-admin',email:'admin@example.com',role:'owner',features:[]},fetchImpl}={}){
 const start=template.indexOf('        ZipFile: |',template.indexOf(`  ${name}Function:`));
 const end=start+template.slice(start).search(/\n  [A-Za-z]\w*:\n/);
 const code=template.slice(start+'        ZipFile: |'.length,end).trimEnd().split('\n').slice(1).map(x=>x.slice(10)).join('\n');
 const calls=[],fetches=[],emails=[];
 const commands=Object.fromEntries(['GetCommand','PutCommand','QueryCommand','ScanCommand','TransactWriteCommand','UpdateCommand'].map(name=>[name,class{constructor(input){this.input=input;this.kind=name}}]));
 const module={exports:{}};
 const context={module,exports:module.exports,Buffer,AbortSignal,console:{error(){},info(){}},process:{env:{ALLOWED_ORIGINS:origin,INTAKE_ENABLED:'true',LEADS_TABLE:'leads',AUDIT_TABLE:'audit',RATE_TABLE:'rate',IDENTITY_VERIFY_URL:'https://identity.example.test',INTAKE_CONFIG_URL:'https://catalog.example.test',SENDER_EMAIL:'info@medvillediabetes.com',ALERTS_TABLE:'alerts',HISTORY_TABLE:'history',SES_CONFIG_SET:'medville-phi-company',RESEND_API_KEY:'synthetic-test-key',DASHBOARD_ORIGIN:origin}},require(name){if(name==='node:crypto')return crypto;if(name==='@aws-sdk/client-dynamodb')return{DynamoDBClient:class{}};if(name==='@aws-sdk/lib-dynamodb')return{...commands,DynamoDBDocumentClient:{from:()=>({send:async command=>{calls.push(command);return send(command)}})}};if(name==='@aws-sdk/client-sesv2')return{SESv2Client:class{async send(command){emails.push(command);return emailSend(command)}},SendEmailCommand:class{constructor(input){this.input=input;this.kind='SendEmailCommand'}}};throw new Error(name);},fetch:async(url,options)=>{fetches.push({url,options});return fetchImpl?fetchImpl(url,options):{ok:true,status:200,json:async()=>url.includes('identity')?{actor:identity}:{product:{name:'Dexcom G7'},referralActive:false}}}};
 vm.runInNewContext(code,context);
 const request=async(body,extra={})=>{const r=await module.exports.handler({rawPath:name==='Intake'?'/intake':'/admin',headers:{origin,'content-type':'application/json',authorization:'Bearer synthetic-token'},requestContext:{http:{method:'POST',sourceIp:'192.0.2.1'},requestId:'synthetic'},body:JSON.stringify(body),...extra});return{...r,json:JSON.parse(r.body)}};
 return{request,calls,fetches,emails,handler:module.exports.handler};
}
// The database writes a request made, leaving out the reads that come before them.
const writes=r=>r.calls.filter(c=>c.kind!=='GetCommand');
// Values made inside the sandbox, as plain data for deep comparison.
const plain=x=>JSON.parse(JSON.stringify(x));
const valid={submissionId:id,firstName:'Synthetic',lastName:'Verification',email:'synthetic@example.com',phone:'2025550142',city:'Test City',state:'California',injectsInsulinDaily:'no',productInterest:'dexcom-g7',consentAccepted:true,website:''};
for(const action of ['leads.list','leads.get','leads.update','leads.delete','leads.restore','leads.status.import','leads.stats','leads.export','leads.notify','audit.list','influencers.counts'])test(`AWS denies ungranted feature: ${action}`,async()=>{
 const r=runtime('Admin',{identity:{uid:'test',role:'marketing',features:['blog']}});assert.equal((await r.request({action,id})).statusCode,403);assert.equal(r.calls.length,1);assert.equal(r.calls[0].input.TableName,'audit');
});
test('AWS rejects revoked/disabled identity and never forwards patient data to identity',async()=>{
 const r=runtime('Admin',{fetchImpl:async()=>({status:401,ok:false})});assert.equal((await r.request({action:'leads.get',id,note:'private'})).statusCode,401);assert.equal(r.calls.length,0);assert.deepEqual(JSON.parse(r.fetches[0].options.body),{action:'auth.session'});
});
test('AWS identity outage fails closed',async()=>{const r=runtime('Admin',{fetchImpl:async()=>{throw new Error('private')}});assert.equal((await r.request({action:'leads.list'})).statusCode,503);assert.equal(r.calls.length,0);});
test('AWS rejects malformed bodies, inherited action names and invalid IDs',async()=>{for(const body of [null,[],42,'text',{action:'constructor'},{action:'leads.get',id:'../x'}])assert.equal((await runtime('Admin').request(body)).statusCode,400);});
test('AWS owner can read; sensitive internals are not returned; audit names the record',async()=>{
 const r=runtime('Admin',{send:async c=>c.kind==='GetCommand'?{Item:{...valid,id,requestHash:'secret',gsi1pk:'LEAD'}}:{}});
 const out=await r.request({action:'leads.get',id});assert.equal(out.statusCode,200);assert.equal(out.json.lead.requestHash,undefined);assert.equal(out.json.lead.message,'');assert.equal(r.calls[0].input.ConsistentRead,true);assert.equal(r.calls[1].input.Item.leadId,id);assert.equal(out.headers['Cache-Control'],'no-store');
});
test('AWS audit failure cannot disclose a record',async()=>{const r=runtime('Admin',{send:async c=>{if(c.kind==='PutCommand')throw Error('audit unavailable');return{Item:{...valid,id}}}});const out=await r.request({action:'leads.get',id});assert.equal(out.statusCode,503);assert.equal(out.json.lead,undefined);});
test('AWS update and audit use one transaction, with no PHI in audit',async()=>{
 const r=runtime('Admin');assert.equal((await r.request({action:'leads.update',id,status:'contacted',note:'Synthetic private note'})).statusCode,200);assert.equal(writes(r).length,1);const tx=writes(r)[0];assert.equal(tx.kind,'TransactWriteCommand');assert.equal(tx.input.TransactItems.length,4);assert.equal(JSON.stringify(tx.input.TransactItems.slice(1)).includes('Synthetic private note'),false);
 const history=tx.input.TransactItems.slice(2).map(x=>x.Put);assert.deepEqual(plain(history.map(x=>[x.TableName,x.Item.action,x.Item.leadId])),[['history','stage',id],['history','note',id]]);assert.equal(history[0].Item.status,'contacted');
});
test('AWS update failure returns no success and no separate mutation',async()=>{const r=runtime('Admin',{send:async()=>{throw Error('write unavailable')}});assert.equal((await r.request({action:'leads.update',id,status:'contacted'})).statusCode,503);assert.equal(r.calls.length,1);});
test('AWS delete creates a seven-day recycle window and audit without copying lead details',async()=>{const r=runtime('Admin',{identity:{uid:'marketing',email:'marketing@example.com',role:'marketing',features:['leads']}});assert.equal((await r.request({action:'leads.delete',id})).statusCode,200);const tx=r.calls[0];assert.equal(tx.kind,'TransactWriteCommand');assert.deepEqual({...tx.input.TransactItems[0].Update.Key},{id});const values=tx.input.TransactItems[0].Update.ExpressionAttributeValues;assert.ok(values[':purgeAt']>Math.floor(Date.now()/1000)+(6*24*60*60));assert.equal(tx.input.TransactItems[1].Put.Item.action,'leads.delete');assert.equal(JSON.stringify(tx.input.TransactItems).includes('synthetic@example.com'),false);});
test('AWS restore removes recycle markers and needs the recycle feature',async()=>{const denied=runtime('Admin',{identity:{uid:'marketing',role:'marketing',features:['leads']}});assert.equal((await denied.request({action:'leads.restore',id})).statusCode,403);assert.equal((await runtime('Admin',{identity:{uid:'marketing',role:'marketing',features:['leads']}}).request({action:'leads.list',deleted:true})).statusCode,403);const r=runtime('Admin',{identity:{uid:'marketing',role:'marketing',features:['leads','recycle']}});assert.equal((await r.request({action:'leads.restore',id})).statusCode,200);const update=r.calls[0].input.TransactItems[0].Update;assert.match(update.UpdateExpression,/REMOVE deletedAt, purgeAt, deletedBy/);assert.equal(r.calls[0].input.TransactItems[1].Put.Item.action,'leads.restore');});
test('AWS status import updates only status fields in one audited transaction',async()=>{const second='10000000-0000-4000-8000-000000000002';const r=runtime('Admin',{identity:{uid:'marketing',role:'marketing',features:['leads']}});const out=await r.request({action:'leads.status.import',items:[{id,status:'contacted'},{id:second,status:'not-qualified'}]});assert.equal(out.statusCode,200);assert.equal(out.json.updated,2);const tx=writes(r)[0].input.TransactItems;assert.equal(tx.length,5);assert.deepEqual(plain(tx.slice(3).map(x=>[x.Put.Item.action,x.Put.Item.source])),[['stage','import'],['stage','import']]);assert.match(tx[0].Update.UpdateExpression,/^SET #status=:status, workSk=:work REMOVE /);assert.equal(tx[2].Put.Item.action,'leads.status.import');});
test('AWS list and stats apply a validated server-side calendar range',async()=>{const r=runtime('Admin',{send:async c=>c.kind==='QueryCommand'?{Items:[]}:{}});assert.equal((await r.request({action:'leads.list',from:'2026-09-01',to:'2026-09-22'})).statusCode,200);assert.match(writes(r)[0].input.KeyConditionExpression,/BETWEEN :from AND :to/);const bad=await runtime('Admin').request({action:'leads.stats',from:'2026-10-01',to:'2026-09-01'});assert.equal(bad.statusCode,400);});
test('AWS dashboard can retry a failed customer confirmation through Resend',async()=>{const r=runtime('Admin',{send:async c=>c.kind==='GetCommand'?{Item:{...valid,id,source:'qualify',customerConfirmationStatus:'failed'}}:{}});const out=await r.request({action:'leads.confirmation.retry',id});assert.equal(out.statusCode,200);assert.equal(out.json.customerConfirmationStatus,'sent');assert.equal(r.emails.length,0);const sent=r.fetches.find(f=>f.url==='https://api.resend.com/emails');assert.equal(sent.options.headers['Idempotency-Key'],`medville-confirmation-${id}`);assert.deepEqual(JSON.parse(sent.options.body).to,[valid.email]);assert.equal(r.calls.some(c=>c.kind==='UpdateCommand'&&c.input.ExpressionAttributeValues[':status']==='sent'),true);});
test('AWS dashboard can retry the company notification, which carries no answers',async()=>{const r=runtime('Admin',{send:async c=>c.kind==='GetCommand'?{Item:{...valid,id,source:'qualify',notificationStatus:'failed'}}:{},emailSend:async()=>({MessageId:'synthetic-company-message'})});const out=await r.request({action:'leads.notify',id});assert.equal(out.statusCode,200);assert.equal(out.json.notificationStatus,'sent');const mail=r.emails[0].input;assert.deepEqual([...mail.Destination.ToAddresses],['info@medvillediabetes.com']);assert.equal(mail.ConfigurationSetName,'medville-phi-company');assert.equal(mail.EmailTags[0].Value,id);assert.equal(JSON.stringify(mail).includes(valid.firstName),false);assert.equal(JSON.stringify(mail).includes(valid.phone),false);const u=r.calls.find(c=>c.kind==='UpdateCommand').input;assert.equal(u.ExpressionAttributeValues[':messageId'],'synthetic-company-message');assert.deepEqual(plain(r.calls.filter(c=>c.kind==='PutCommand').map(c=>c.input.Item.action)),['leads.companyNotification.requested','leads.companyNotification.completed']);});
test('AWS export records exact record IDs and rejects duplicates',async()=>{const r=runtime('Admin');assert.equal((await r.request({action:'leads.export',ids:[id,id]})).statusCode,400);assert.equal((await r.request({action:'leads.export',ids:[id]})).statusCode,200);assert.deepEqual([...r.calls[0].input.Item.leadIds],[id]);});
test('AWS invalid page cursor is rejected',async()=>{assert.equal((await runtime('Admin').request({action:'leads.list',cursor:Buffer.from(JSON.stringify({id,gsi1pk:'OTHER',gsi1sk:'x'})).toString('base64url')})).statusCode,400)});
test('AWS list returns cursor and audits every returned ID',async()=>{const r=runtime('Admin',{send:async c=>c.kind==='QueryCommand'?{Items:[{id}],LastEvaluatedKey:{id,gsi1pk:'LEAD',gsi1sk:'x'}}:{}});const out=await r.request({action:'leads.list'});assert.equal(out.statusCode,200);assert.ok(out.json.nextCursor);assert.deepEqual([...r.calls[1].input.Item.leadIds],[id]);});
test('AWS intake validates unknown/prototype products through catalog, not object inheritance',async()=>{const r=runtime('Intake',{fetchImpl:async()=>({ok:true,json:async()=>({product:null})})});assert.equal((await r.request({...valid,productInterest:'constructor'})).statusCode,400);assert.equal(r.calls.length,1);});
test('AWS intake only sends public catalog fields to Google and saves validated referral',async()=>{const r=runtime('Intake');assert.equal((await r.request({...valid,referralCode:'fake-campaign'})).statusCode,200);assert.deepEqual(JSON.parse(r.fetches[0].options.body),{productInterest:'dexcom-g7',referralCode:'fake-campaign'});const lead=r.calls[1].input.TransactItems[0].Put.Item;assert.equal(lead.referralCode,'');assert.equal(lead.source,'qualify');assert.equal(lead.notificationStatus,'pending');});
test('AWS intake tells the company inbox without answers and sends the customer receipt through Resend',async()=>{const r=runtime('Intake',{emailSend:async()=>({MessageId:'synthetic-company-message'})});const out=await r.request(valid);assert.equal(out.statusCode,200);assert.equal(out.json.confirmationSent,true);
 assert.equal(r.emails.length,1);const company=r.emails[0].input;assert.deepEqual([...company.Destination.ToAddresses],['info@medvillediabetes.com']);assert.equal(company.ConfigurationSetName,'medville-phi-company');const companyText=JSON.stringify(company);for(const field of [valid.firstName,valid.lastName,valid.email,valid.phone,valid.city])assert.equal(companyText.includes(field),false);
 const receipt=r.fetches.find(f=>f.url==='https://api.resend.com/emails');const body=JSON.parse(receipt.options.body);assert.deepEqual(body.to,[valid.email]);assert.equal(body.from,'Medville Diabetes <info@medvillediabetes.com>');assert.match(body.text,/contact you as soon as possible/);assert.equal(body.text.includes(valid.firstName),false);assert.doesNotMatch(body.text,/[\u2014*]/);assert.equal(receipt.options.headers['Idempotency-Key'],`medville-confirmation-${id}`);
 const updates=r.calls.filter(c=>c.kind==='UpdateCommand').map(c=>c.input);assert.equal(updates[0].ExpressionAttributeValues[':messageId'],'synthetic-company-message');assert.equal(updates[1].ExpressionAttributeValues[':status'],'sent');});
test('AWS intake still acknowledges the saved request when email delivery fails',async()=>{const r=runtime('Intake',{emailSend:async()=>{throw Error('mail unavailable')},fetchImpl:async url=>url.includes('resend')?{ok:false,status:500}:{ok:true,status:200,json:async()=>({product:{name:'Dexcom G7'},referralActive:false})}});const out=await r.request(valid);assert.equal(out.statusCode,200);assert.equal(out.json.confirmationSent,false);const updates=r.calls.filter(c=>c.kind==='UpdateCommand').map(c=>c.input.ExpressionAttributeValues[':status']);assert.deepEqual(plain(updates),['failed','failed']);});
test('AWS intake allows three submissions a minute from one address and says when to retry',async()=>{const r=runtime('Intake',{send:async c=>{if(c.kind==='TransactWriteCommand')throw{CancellationReasons:[{Code:'None'},{Code:'None'},{Code:'ConditionalCheckFailed'}]};return{}}});const out=await r.request(valid);assert.equal(out.statusCode,429);assert.ok(Number(out.headers['Retry-After'])<=60);const tx=r.calls.find(c=>c.kind==='TransactWriteCommand').input.TransactItems;assert.equal(tx[1].Update.ExpressionAttributeValues[':limit'],100);assert.equal(tx[2].Update.ExpressionAttributeValues[':limit'],3);});
test('Company email events update only the matching message and never downgrade a delivery',async()=>{
 const base={'detail-type':'Email Delivered',time:'2026-10-30T00:00:00.000Z',detail:{mail:{messageId:'m-1',tags:{lead_id:[id]}}}};
 const run=async(event,stored)=>{const r=runtime('CompanyEmailEvent',{send:async c=>c.kind==='GetCommand'?{Item:stored}:{}});await r.handler(event);return r.calls.filter(c=>c.kind==='UpdateCommand');};
 const delivered=await run(base,{id,notificationMessageId:'m-1',notificationStatus:'sent'});assert.equal(delivered[0].input.ExpressionAttributeValues[':status'],'delivered');
 assert.equal((await run(base,{id,notificationMessageId:'m-2'})).length,0);
 assert.equal((await run({...base,'detail-type':'Email Delivery Delayed'},{id,notificationMessageId:'m-1',notificationStatus:'delivered'})).length,0);
 assert.equal((await run(base,{id,notificationMessageId:'m-1',deletedAt:'2026-10-29T00:00:00.000Z'})).length,0);
});
test('AWS identical retries return success without a second write; changed answers conflict',async()=>{const existing={...valid,id,referralCode:""};const r=runtime('Intake',{send:async()=>({Item:existing})});assert.equal((await r.request(valid)).statusCode,200);assert.equal((await r.request({...valid,firstName:'Changed'})).statusCode,409);assert.equal(r.calls.every(c=>c.kind==='GetCommand'),true);});
test('AWS database read errors produce generic JSON rather than an unhandled exception',async()=>{const r=runtime('Intake',{send:async()=>{throw Error('private data')}});const out=await r.request(valid);assert.equal(out.statusCode,503);assert.equal(out.body.includes('private data'),false);});
test('AWS rate condition and transaction infrastructure failures are distinguished',async()=>{for(const [Code,status]of [['ConditionalCheckFailed',429],['TransactionConflict',503]]){const r=runtime('Intake',{send:async c=>{if(c.kind==='TransactWriteCommand')throw{CancellationReasons:[{Code:'None'},{Code}]};return{}}});assert.equal((await r.request(valid)).statusCode,status)}});
test('AWS contact messages use the protected table and never the metadata service',async()=>{const r=runtime('Intake');const out=await r.request({...valid,message:'Synthetic contact question.',privacyAccepted:true},{rawPath:'/contact'});assert.equal(out.statusCode,200);assert.equal(r.fetches.filter(f=>f.url.includes('catalog')).length,0);const lead=r.calls[1].input.TransactItems[0].Put.Item;assert.equal(lead.source,'contact');assert.equal(lead.message,'Synthetic contact question.');assert.equal(lead.injectsInsulinDaily,'');});
test('AWS origin, method, media type and size checks precede data access',async()=>{for(const extra of [{headers:{origin:'https://evil.test'}},{requestContext:{http:{method:'GET'}}},{headers:{origin,'content-type':'text/plain'}},{body:'x'.repeat(20000)}]){const r=runtime('Intake');assert.ok((await r.request(valid,extra)).statusCode>=400);assert.equal(r.calls.length,0)}});

const salesperson={uid:'synthetic-sales',email:'person@example.com',role:'sales',features:['leads','products']};
const manager={uid:'synthetic-manager',email:'manager@example.com',role:'manager',features:['leads','salesTeam','products']};
const assigned={...valid,id,status:'new',assignedTo:salesperson.uid,gsi1pk:'LEAD'};
for(const action of ['leads.export','leads.delete','leads.restore','leads.status.import'])for(const identity of [salesperson,manager])test(`AWS ${identity.role} cannot use record action ${action}`,async()=>{
 const r=runtime('Admin',{identity});const out=await r.request({action,id,ids:[id],items:[{id,status:'closed'}]});assert.equal(out.statusCode,403);assert.equal(r.calls.length,1);assert.equal(r.calls[0].input.Item.action,'access.denied');
});
test('AWS sales roles cannot open the Recycle Bin list',async()=>{for(const identity of [salesperson,manager]){const r=runtime('Admin',{identity});assert.equal((await r.request({action:'leads.list',deleted:true})).statusCode,403);}});
test('AWS salesperson lists only their own assignments, with contact details hidden',async()=>{
 const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='QueryCommand'?{Items:[assigned]}:{}});
 const out=await r.request({action:'leads.list',assignee:'someone-else'});assert.equal(out.statusCode,200);
 const query=r.calls[0].input;assert.equal(query.IndexName,'AssigneeTimeline');assert.equal(query.ExpressionAttributeValues[':pk'],salesperson.uid);
 const row=out.json.leads[0];assert.equal(row.phone,'');assert.equal(row.email,'');assert.equal(row.contactHidden,true);assert.equal(row.firstName,'Synthetic');
 assert.equal(out.body.includes(valid.phone),false);assert.equal(out.body.includes(valid.email),false);
});
test('AWS manager can list one salesperson or the unassigned queue, with contact details hidden',async()=>{
 const one=runtime('Admin',{identity:manager,send:async c=>c.kind==='QueryCommand'?{Items:[assigned]}:{}});const out=await one.request({action:'leads.list',assignee:salesperson.uid});
 assert.equal(one.calls[0].input.IndexName,'AssigneeTimeline');assert.equal(out.body.includes(valid.phone),false);
 const queue=runtime('Admin',{identity:manager,send:async c=>c.kind==='QueryCommand'?{Items:[]}:{}});await queue.request({action:'leads.list',assignee:'unassigned'});
 assert.equal(queue.calls[0].input.IndexName,'LeadTimeline');assert.match(queue.calls[0].input.FilterExpression,/attribute_not_exists\(assignedTo\)/);
});
test('AWS owner still sees full contact details',async()=>{const r=runtime('Admin',{send:async c=>c.kind==='GetCommand'?{Item:assigned}:{}});const out=await r.request({action:'leads.get',id});assert.equal(out.json.lead.phone,valid.phone);assert.equal(out.json.lead.contactHidden,false);});
test('AWS salesperson cannot open, update or dial a lead assigned to someone else',async()=>{
 const other={...assigned,assignedTo:'another-person'};
 for(const body of [{action:'leads.get',id},{action:'leads.dial',id},{action:'leads.notify',id}]){const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:other}:{}});const out=await r.request(body);assert.equal(out.statusCode,404);assert.equal(out.body.includes(valid.phone),false);assert.equal(writes(r).at(-1).input.Item.action,'access.denied');}
 const r=runtime('Admin',{identity:salesperson});await r.request({action:'leads.update',id,status:'contacted'});assert.match(writes(r)[0].input.TransactItems[0].Update.ConditionExpression,/assignedTo=:me/);assert.equal(writes(r)[0].input.TransactItems[0].Update.ExpressionAttributeValues[':me'],salesperson.uid);
});
test('AWS dial releases one number, counts it against an hourly limit, and audits it',async()=>{
 const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:assigned}:{}});const out=await r.request({action:'leads.dial',id});
 assert.equal(out.statusCode,200);assert.equal(out.json.dial,'+12025550142');assert.equal(out.headers['Cache-Control'],'no-store');
 const tx=writes(r)[0].input.TransactItems;assert.equal(tx[0].Update.TableName,'rate');assert.match(tx[0].Update.Key.id,/^dial#synthetic-sales#/);assert.equal(tx[0].Update.ExpressionAttributeValues[':limit'],60);
 assert.match(tx[1].Update.ConditionExpression,/assignedTo=:uid/);assert.equal(tx[2].Put.Item.action,'leads.dial');assert.equal(JSON.stringify(tx).includes(valid.phone),false);
});
test('AWS dial refuses once the hourly limit is reached and records the refusal',async()=>{
 const r=runtime('Admin',{identity:salesperson,send:async c=>{if(c.kind==='GetCommand')return{Item:assigned};if(c.kind==='TransactWriteCommand')throw{CancellationReasons:[{Code:'ConditionalCheckFailed'},{Code:'None'},{Code:'None'}]};return{}}});
 const out=await r.request({action:'leads.dial',id});assert.equal(out.statusCode,429);assert.equal(out.json.dial,undefined);assert.equal(writes(r).at(-1).input.Item.action,'leads.dial.limited');
});
test('AWS assignment checks the sales team, then assigns and audits in one transaction',async()=>{
 const second='10000000-0000-4000-8000-000000000002';
 const fetchImpl=async(url,options)=>({ok:true,status:200,json:async()=>JSON.parse(options.body).action==='team.members'?{members:[{uid:salesperson.uid,role:'sales',disabled:false}]}:{actor:manager}});
 const r=runtime('Admin',{identity:manager,fetchImpl});const out=await r.request({action:'leads.assign',ids:[id,second],assignee:salesperson.uid});
 assert.equal(out.statusCode,200);assert.deepEqual(JSON.parse(r.fetches[1].options.body),{action:'team.members'});
 const tx=writes(r)[0].input.TransactItems;assert.equal(tx.length,5);assert.deepEqual(plain(tx.slice(3).map(x=>x.Put.Item.assignee)),[salesperson.uid,salesperson.uid]);assert.equal(tx[0].Update.ExpressionAttributeValues[':to'],salesperson.uid);assert.equal(tx[2].Put.Item.action,'leads.assign');
 const stranger=runtime('Admin',{identity:manager,fetchImpl});assert.equal((await stranger.request({action:'leads.assign',ids:[id],assignee:'not-on-the-team'})).statusCode,400);assert.equal(writes(stranger).length,0);
 const clear=runtime('Admin',{identity:manager,fetchImpl});assert.equal((await clear.request({action:'leads.assign',ids:[id],assignee:''})).statusCode,200);assert.match(writes(clear)[0].input.TransactItems[0].Update.UpdateExpression,/^REMOVE assignedTo/);
});
test('AWS only an owner or sales manager can assign leads or read the team summary',async()=>{for(const identity of [salesperson,{uid:'marketing',role:'marketing',features:['leads','salesTeam']}])for(const action of ['leads.assign','leads.team']){const r=runtime('Admin',{identity});assert.equal((await r.request({action,ids:[id],assignee:salesperson.uid})).statusCode,403);}});
test('AWS team summary counts per salesperson without reading patient details',async()=>{
 const now=new Date().toISOString();
 const items=[{assignedTo:salesperson.uid,status:'new',createdAt:'2026-10-01T00:00:00.000Z'},{assignedTo:salesperson.uid,status:'qualified',lastDialAt:now,dialCount:2},{status:'new',createdAt:'2026-10-02T00:00:00.000Z'}];
 const r=runtime('Admin',{identity:manager,send:async c=>c.kind==='QueryCommand'?{Items:items}:{}});const out=await r.request({action:'leads.team'});
 assert.equal(out.statusCode,200);assert.doesNotMatch(writes(r)[0].input.ProjectionExpression,/phone|email|firstName|lastName/);
 const p=out.json.people[salesperson.uid];assert.equal(p.assigned,2);assert.equal(p.open,1);assert.equal(p.new,1);assert.equal(p.qualified,1);assert.equal(p.calls,2);assert.equal(p.calledToday,1);
 assert.equal(out.json.unassigned.new,1);assert.equal(writes(r).at(-1).input.Item.action,'leads.team');
});

const later=new Date(Date.now()+86400000).toISOString();
test('AWS stage change stores a fixed reason or a callback time and clears the others',async()=>{
 const r=runtime('Admin',{identity:salesperson});
 assert.equal((await r.request({action:'leads.update',id,status:'callback',callbackAt:later})).statusCode,200);
 let u=writes(r)[0].input.TransactItems[0].Update;assert.equal(u.ExpressionAttributeValues[':callbackAt'],later);assert.match(u.UpdateExpression,/REMOVE statusReason$/);
 assert.equal((await r.request({action:'leads.update',id,status:'needs-verification',statusReason:'insurance'})).statusCode,200);
 u=writes(r)[1].input.TransactItems[0].Update;assert.equal(u.ExpressionAttributeValues[':statusReason'],'insurance');assert.match(u.UpdateExpression,/REMOVE callbackAt$/);
 assert.equal(writes(r)[1].input.TransactItems[1].Put.Item.stage,'needs-verification');
});
test('AWS stage details are validated and never accept free text',async()=>{
 for(const body of [{status:'callback'},{status:'callback',callbackAt:'2020-01-01T00:00:00Z'},{status:'callback',callbackAt:new Date(Date.now()+200*86400000).toISOString()},{status:'needs-verification'},{status:'needs-verification',statusReason:'Synthetic free text'},{status:'not-qualified',statusReason:'other reason'},{status:'made-up'}]){
  const r=runtime('Admin');const out=await r.request({action:'leads.update',id,...body});assert.equal(out.statusCode,400);assert.equal(writes(r).length,0);
 }
});
test('AWS do not contact is locked for everyone except an Owner',async()=>{
 const failed={CancellationReasons:[{Code:'ConditionalCheckFailed',Item:{id:{S:id},status:{S:'do-not-contact'},assignedTo:{S:salesperson.uid}}},{Code:'None'}]};
 const r=runtime('Admin',{identity:salesperson,send:async c=>{if(c.kind==='TransactWriteCommand')throw failed;return c.kind==='GetCommand'?storedLead(c):{}}});
 const out=await r.request({action:'leads.update',id,status:'no-answer'});assert.equal(out.statusCode,409);assert.match(out.json.error,/Only an Owner/);
 assert.match(writes(r)[0].input.TransactItems[0].Update.ConditionExpression,/#status<>:dnc/);
 const owner=runtime('Admin');await owner.request({action:'leads.update',id,status:'no-answer'});assert.doesNotMatch(writes(owner)[0].input.TransactItems[0].Update.ConditionExpression,/:dnc/);
 const note=runtime('Admin',{identity:salesperson});await note.request({action:'leads.update',id,note:'Synthetic note'});assert.doesNotMatch(writes(note)[0].input.TransactItems[0].Update.ConditionExpression,/:dnc/);
});
test('AWS refuses to dial a patient marked do not contact',async()=>{const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:{...assigned,status:'do-not-contact'}}:{}});const out=await r.request({action:'leads.dial',id});assert.equal(out.statusCode,409);assert.equal(out.json.dial,undefined);assert.equal(writes(r).some(c=>c.kind==='TransactWriteCommand'),false);});
test('AWS status import refuses stages that need details and respects the lock',async()=>{
 const m={uid:'marketing',role:'marketing',features:['leads']};
 assert.equal((await runtime('Admin',{identity:m}).request({action:'leads.status.import',items:[{id,status:'callback'}]})).statusCode,400);
 const r=runtime('Admin',{identity:m});assert.equal((await r.request({action:'leads.status.import',items:[{id,status:'no-answer'}]})).statusCode,200);
 const u=writes(r)[0].input.TransactItems[0].Update;assert.match(u.ConditionExpression,/#status<>:dnc/);assert.match(u.UpdateExpression,/REMOVE statusReason, callbackAt$/);
});
test('AWS alerts take the address from the identity service and start counting now',async()=>{
 const fetchImpl=async(url,options)=>({ok:true,status:200,json:async()=>JSON.parse(options.body).action==='team.members'?{members:[{uid:salesperson.uid,email:'Person@Example.com',role:'sales',disabled:false}]}:{actor:manager}});
 const r=runtime('Admin',{identity:manager,fetchImpl});const out=await r.request({action:'alerts.set',uid:salesperson.uid,enabled:true,email:'attacker@example.com'});
 assert.equal(out.statusCode,200);const u=r.calls[0].input;assert.equal(u.TableName,'alerts');assert.equal(u.ExpressionAttributeValues[':email'],'person@example.com');assert.equal(u.ExpressionAttributeValues[':role'],'sales');assert.ok(u.ExpressionAttributeValues[':at']);
 assert.equal(r.calls[1].input.Item.action,'alerts.set');
 const self=runtime('Admin',{identity:manager});await self.request({action:'alerts.set',uid:manager.uid,enabled:true});assert.equal(self.calls[0].input.ExpressionAttributeValues[':email'],'manager@example.com');assert.equal(self.fetches.length,1);
 const off=runtime('Admin',{identity:manager});await off.request({action:'alerts.set',uid:'gone-person',enabled:false});assert.equal(off.calls[0].input.ExpressionAttributeValues[':off'],false);
 const stranger=runtime('Admin',{identity:manager,fetchImpl});assert.equal((await stranger.request({action:'alerts.set',uid:'not-on-team',enabled:true})).statusCode,400);
});
test('AWS salesperson cannot change or read alert settings',async()=>{for(const action of ['alerts.list','alerts.set']){const r=runtime('Admin',{identity:salesperson});assert.equal((await r.request({action,uid:salesperson.uid,enabled:true})).statusCode,403);}});
function alertsRun(subs,leads,{failSend=false}={}){
 return runtime('Alerts',{emailSend:async()=>{if(failSend)throw Error('mail unavailable');return{MessageId:'m'}},send:async c=>{
  if(c.kind==='ScanCommand')return{Items:subs};
  if(c.kind==='QueryCommand')return{Items:c.input.IndexName==='LeadTimeline'?leads.filter(x=>!x.assignedTo||true):leads.filter(x=>x.assignedTo===c.input.ExpressionAttributeValues[':uid'])};
  return{};
 }});
}
test('Alerts email counts only, then moves each watermark without writing a lead',async()=>{
 const past=new Date(Date.now()-600000).toISOString(),earlier=new Date(Date.now()-3600000).toISOString();
 const subs=[{uid:manager.uid,email:'manager@example.com',role:'manager',enabled:true,newSince:earlier,assignedSince:earlier},{uid:salesperson.uid,email:'person@example.com',role:'sales',enabled:true,newSince:earlier,assignedSince:earlier},{uid:'off',email:'off@example.com',role:'sales',enabled:false}];
 const leads=[{id,createdAt:past,firstName:'Synthetic',phone:'2025550142'},{id:'10000000-0000-4000-8000-000000000002',createdAt:past,assignedTo:salesperson.uid,assignedAt:past,status:'new'},{id:'10000000-0000-4000-8000-000000000003',createdAt:earlier,assignedTo:salesperson.uid,status:'callback',callbackAt:past}];
 const r=alertsRun(subs,leads);
 const out=await r.handler({});assert.equal(out.sent,2);
 assert.equal(r.emails.length,2);
 const [toManager,toSales]=r.emails.map(e=>e.input);
 assert.deepEqual([...toManager.Destination.ToAddresses],['manager@example.com']);assert.match(toManager.Content.Simple.Body.Text.Data,/1 new enquiry is waiting to be assigned/);
 const salesText=toSales.Content.Simple.Body.Text.Data;assert.match(salesText,/1 callback is due now/);assert.match(salesText,/1 enquiry was assigned to you/);assert.doesNotMatch(salesText,/new enquir/);
 for(const e of r.emails){const all=JSON.stringify(e.input);assert.equal(all.includes('Synthetic'),false);assert.equal(all.includes('2025550142'),false);assert.doesNotMatch(all,/\u2014/);}
 for(const q of r.calls.filter(c=>c.kind==='QueryCommand'))assert.doesNotMatch(q.input.ProjectionExpression,/phone|email|firstName|lastName|injects/);
 assert.equal(r.calls.some(c=>c.kind==='UpdateCommand'&&c.input.TableName==='leads'),false);
 const marks=r.calls.filter(c=>c.kind==='UpdateCommand'&&c.input.TableName==='alerts');assert.equal(marks.length,2);assert.equal(marks[0].input.ExpressionAttributeValues[':newSince'],past);assert.equal(marks[1].input.ExpressionAttributeValues[':callbackSince'],past);
 // The next run with those watermarks sends nothing again.
 const again=alertsRun(subs.map((x,i)=>i<2?{...x,newSince:past,assignedSince:past,callbackSince:past}:x),leads);await again.handler({});assert.equal(again.emails.length,0);
 const auditEntry=r.calls.find(c=>c.kind==='PutCommand');assert.equal(auditEntry.input.Item.action,'alerts.sent');assert.equal(auditEntry.input.Item.count,2);
});
test('Alerts keep the watermark when delivery fails so the next run retries',async()=>{
 const past=new Date(Date.now()-600000).toISOString(),earlier=new Date(Date.now()-3600000).toISOString();
 const r=alertsRun([{uid:manager.uid,email:'manager@example.com',role:'manager',enabled:true,newSince:earlier,assignedSince:earlier}],[{id,createdAt:past}],{failSend:true});
 await r.handler({});const mark=r.calls.find(c=>c.kind==='UpdateCommand'&&c.input.TableName==='alerts');assert.equal(mark.input.ExpressionAttributeValues[':status'],'failed');assert.equal(mark.input.ExpressionAttributeValues[':newSince'],undefined);assert.equal(r.calls.some(c=>c.kind==='PutCommand'),false);
});
test('Alerts do nothing and send nothing when nobody is subscribed',async()=>{const r=alertsRun([],[]);await r.handler({});assert.equal(r.emails.length,0);assert.equal(r.calls.length,1);});

test('AWS work key puts finished leads under done and open leads under open',async()=>{
 const r=runtime('Admin',{identity:salesperson});
 await r.request({action:'leads.update',id,status:'closed'});
 let tx=r.calls.find(c=>c.kind==='TransactWriteCommand').input.TransactItems[0].Update;assert.equal(tx.ExpressionAttributeValues[':workSk'],`done#2026-10-01T00:00:00.000Z#${id}`);
 const again=runtime('Admin',{identity:salesperson});await again.request({action:'leads.update',id,status:'callback',callbackAt:later});
 tx=again.calls.find(c=>c.kind==='TransactWriteCommand').input.TransactItems[0].Update;assert.equal(tx.ExpressionAttributeValues[':workSk'],`open#2026-10-01T00:00:00.000Z#${id}`);
 const note=runtime('Admin',{identity:salesperson});await note.request({action:'leads.update',id,note:'Synthetic note'});assert.equal(note.calls.some(c=>c.kind==='GetCommand'),false);
});
test('AWS assignment writes the work key from the stage it read and refuses if the stage moved',async()=>{
 const fetchImpl=async(url,options)=>({ok:true,status:200,json:async()=>JSON.parse(options.body).action==='team.members'?{members:[{uid:salesperson.uid,role:'sales',disabled:false}]}:{actor:manager}});
 const r=runtime('Admin',{identity:manager,fetchImpl,send:async c=>c.kind==='GetCommand'?{Item:{id,gsi1sk:'2026-10-02T00:00:00.000Z#x',status:'qualified'}}:{}});
 await r.request({action:'leads.assign',ids:[id],assignee:salesperson.uid});
 const u=r.calls.find(c=>c.kind==='TransactWriteCommand').input.TransactItems[0].Update;
 assert.equal(u.ExpressionAttributeValues[':work'],'done#2026-10-02T00:00:00.000Z#x');assert.equal(u.ExpressionAttributeValues[':status'],'qualified');assert.match(u.ConditionExpression,/#status=:status/);
 const gone=runtime('Admin',{identity:manager,fetchImpl,send:async()=>({})});assert.equal((await gone.request({action:'leads.assign',ids:[id],assignee:salesperson.uid})).statusCode,400);assert.equal(gone.calls.some(c=>c.kind==='TransactWriteCommand'),false);
});
test('AWS one person list is read open first, with the calendar range as a filter',async()=>{
 const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='QueryCommand'?{Items:[]}:{}});
 assert.equal((await r.request({action:'leads.list',from:'2026-10-01',to:'2026-10-28'})).statusCode,200);
 const q=r.calls[0].input;assert.equal(q.KeyConditionExpression,'assignedTo=:pk');assert.match(q.FilterExpression,/gsi1sk BETWEEN :from AND :to/);assert.equal(q.ScanIndexForward,false);
 const cursorKey=Buffer.from(JSON.stringify({id,assignedTo:salesperson.uid,workSk:'open#x'})).toString('base64url');
 assert.equal((await runtime('Admin',{identity:salesperson,send:async()=>({Items:[]})}).request({action:'leads.list',cursor:cursorKey})).statusCode,200);
});
test('Alerts read only open leads from each person',async()=>{
 const r=alertsRun([{uid:salesperson.uid,email:'person@example.com',role:'sales',enabled:true}],[]);await r.handler({});
 const q=r.calls.find(c=>c.kind==='QueryCommand'&&c.input.IndexName==='AssigneeTimeline').input;assert.match(q.KeyConditionExpression,/begins_with\(workSk,:open\)/);assert.equal(q.ExpressionAttributeValues[':open'],'open#');
});

test('AWS history read is limited to people who can open the lead, audited, and holds no note text',async()=>{
 const entries=[{leadId:id,sk:'b',at:'2026-10-29T10:00:00.000Z',action:'stage',actorUid:'u',actorEmail:'a@example.com',actorRole:'sales',status:'callback',callbackAt:later,note:'Synthetic private note'},{leadId:id,sk:'a',action:'made-up'}];
 const r=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:assigned}:c.kind==='QueryCommand'?{Items:entries}:{}});
 const out=await r.request({action:'leads.history',id});assert.equal(out.statusCode,200);assert.equal(out.headers['Cache-Control'],'no-store');
 assert.equal(out.json.history.length,1);assert.equal(out.json.history[0].status,'callback');assert.equal(out.body.includes('Synthetic private note'),false);
 const q=r.calls.find(c=>c.kind==='QueryCommand').input;assert.equal(q.TableName,'history');assert.equal(q.ExpressionAttributeValues[':id'],id);assert.equal(q.ScanIndexForward,false);
 assert.equal(r.calls.at(-1).input.Item.action,'leads.history.read');
 const other=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:{...assigned,assignedTo:'someone-else'}}:{Items:entries}});
 const denied=await other.request({action:'leads.history',id});assert.equal(denied.statusCode,404);assert.equal(other.calls.some(c=>c.kind==='QueryCommand'),false);
});
test('AWS calls, deletes and restores each add a history entry in the same transaction',async()=>{
 const dial=runtime('Admin',{identity:salesperson,send:async c=>c.kind==='GetCommand'?{Item:assigned}:{}});await dial.request({action:'leads.dial',id});
 assert.equal(writes(dial)[0].input.TransactItems.at(-1).Put.Item.action,'call');
 const m={uid:'marketing',role:'marketing',features:['leads']};
 for(const [action,kind] of [['leads.delete','delete'],['leads.restore','restore']]){const r=runtime('Admin',{identity:{...m,features:['leads','recycle']}});await r.request({action,id});const tx=writes(r)[0].input.TransactItems;assert.equal(tx.length,3);assert.equal(tx[2].Put.Item.action,kind);assert.equal(tx[2].Put.TableName,'history');}
});
test('AWS assignment and import refuse more than one transaction can hold',async()=>{
 const ids=Array.from({length:46},(_,i)=>`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`);
 assert.equal((await runtime('Admin',{identity:manager}).request({action:'leads.assign',ids,assignee:salesperson.uid})).statusCode,400);
 assert.equal((await runtime('Admin').request({action:'leads.status.import',items:ids.map(x=>({id:x,status:'closed'}))})).statusCode,400);
});
