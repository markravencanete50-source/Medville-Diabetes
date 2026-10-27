const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,GetCommand,PutCommand,QueryCommand,TransactWriteCommand,UpdateCommand}=require('@aws-sdk/lib-dynamodb');
const {randomUUID}=require('node:crypto');
const {sendSubmissionConfirmation}=require('./email.cjs');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
const origins=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
const statuses=new Set(['new','contacted','qualified','not-qualified','closed']);
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const validUid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const validDay=x=>x===undefined||x===''||(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(`${x}T00:00:00Z`)));
const features={'leads.assign':'salesTeam','leads.team':'salesTeam','leads.dial':'leads','leads.list':'leads','leads.get':'leads','leads.update':'leads','leads.delete':'leads','leads.restore':'leads','leads.status.import':'leads','leads.stats':'overview','leads.export':'leads','leads.notify':'leads','audit.list':'audit','influencers.counts':'influencers'};
// Sales staff work leads without holding the list. Both sales roles see contact
// details masked and dial through leads.dial; a salesperson reaches only the leads
// assigned to them. Export, delete, restore and bulk import stay with Owner and Marketing.
const hidesContact=actor=>actor.role==='sales'||actor.role==='manager';
const recordActions=new Set(['leads.delete','leads.restore','leads.status.import','leads.export']);
const DIAL_LIMIT_PER_HOUR=60;
async function authenticate(header,origin){
 if(typeof header!=='string'||!header.startsWith('Bearer ')||header.length>10000)return null;
 // The identity service checks revocation, disabled accounts, session age and current claims.
 // Only the workforce token is transmitted; no patient IDs, actions or fields are sent.
 const r=await fetch(process.env.IDENTITY_VERIFY_URL,{method:'POST',headers:{Authorization:header,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'auth.session'}),signal:AbortSignal.timeout(5000)});
 if(r.status===401||r.status===403)return null;
 if(!r.ok)throw new Error('identity unavailable');
 const {actor}=await r.json();
 if(!actor||typeof actor.uid!=='string'||!['owner','marketing','manager','sales'].includes(actor.role)||!Array.isArray(actor.features))return null;
 return actor;
}
function response(statusCode,origin,body){return{statusCode,headers:{'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})},body:JSON.stringify(body)}}
function lead(item,actor){
 const fields=['id','firstName','lastName','email','phone','city','state','injectsInsulinDaily','productInterest','productName','referralCode','source','message','notificationStatus','customerConfirmationStatus','status','note','assignedTo'];
 const out={...Object.fromEntries(fields.map(k=>[k,typeof item[k]==='string'?item[k]:'' ])),createdAt:typeof item.createdAt==='string'?item.createdAt:null,deletedAt:typeof item.deletedAt==='string'?item.deletedAt:null,purgeAt:typeof item.purgeAt==='number'?item.purgeAt:null,lastDialAt:typeof item.lastDialAt==='string'?item.lastDialAt:null,dialCount:typeof item.dialCount==='number'?item.dialCount:0,contactHidden:false};
 if(hidesContact(actor)){out.email='';out.phone='';out.contactHidden=true;}
 return out;
}
// A page cursor is the last key of the index that was read: the timeline, or one person's assignments.
function cursor(value,key){
 if(value===undefined)return undefined;
 if(typeof value!=='string'||value.length>1200)throw new Error('invalid cursor');
 const out=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
 if(!out||!validId(out.id)||out[key.name]!==key.value||typeof out.gsi1sk!=='string'||out.gsi1sk.length>100||Object.keys(out).length!==3)throw new Error('invalid cursor');
 return out;
}
const next=value=>value?Buffer.from(JSON.stringify(value)).toString('base64url'):null;
function auditItem(actor,action,detail={}){
 const at=new Date().toISOString(),id=randomUUID();
 return{id,gsi1pk:'AUDIT',gsi1sk:`${at}#${id}`,actorUid:actor.uid,actorEmail:actor.email||'',actorRole:actor.role,action,...detail,at};
}
async function audit(actor,action,detail={}){await db.send(new PutCommand({TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,action,detail),ConditionExpression:'attribute_not_exists(id)'}))}
function applyRange(input,b){
 if(!validDay(b.from)||!validDay(b.to)||(b.from&&b.to&&b.from>b.to))throw new Error('invalid range');
 if(b.from&&b.to){input.KeyConditionExpression+=' AND gsi1sk BETWEEN :from AND :to';input.ExpressionAttributeValues[':from']=`${b.from}T00:00:00.000Z#`;input.ExpressionAttributeValues[':to']=`${b.to}T23:59:59.999Z#\uffff`;}
 else if(b.from){input.KeyConditionExpression+=' AND gsi1sk >= :from';input.ExpressionAttributeValues[':from']=`${b.from}T00:00:00.000Z#`;}
 else if(b.to){input.KeyConditionExpression+=' AND gsi1sk <= :to';input.ExpressionAttributeValues[':to']=`${b.to}T23:59:59.999Z#\uffff`;}
}
async function listLeads(actor,b){
 if(b.assignee!==undefined&&b.assignee!==''&&b.assignee!=='unassigned'&&!validUid(b.assignee))return{error:'Invalid salesperson.'};
 // A salesperson's list is always their own assignments, whatever the request asks for.
 const person=actor.role==='sales'?actor.uid:validUid(b.assignee)&&b.assignee!=='unassigned'?b.assignee:'';
 const key=person?{name:'assignedTo',value:person}:{name:'gsi1pk',value:'LEAD'};
 let start;try{start=cursor(b.cursor,key)}catch{return{error:'Invalid page.'}};
 const input={TableName:process.env.LEADS_TABLE,IndexName:person?'AssigneeTimeline':'LeadTimeline',KeyConditionExpression:`${key.name}=:pk`,ExpressionAttributeValues:{':pk':key.value},ScanIndexForward:false,Limit:50,ExclusiveStartKey:start};
 try{applyRange(input,b)}catch{return{error:'Invalid date range.'}};
 const filters=[];input.ExpressionAttributeNames={};
 if(b.status){if(!statuses.has(b.status))return{error:'Invalid stage.'};filters.push('#status=:status');input.ExpressionAttributeNames['#status']='status';input.ExpressionAttributeValues[':status']=b.status;}
 if(!person&&b.assignee==='unassigned')filters.push('attribute_not_exists(assignedTo)');
 filters.push(b.deleted===true?'attribute_exists(deletedAt)':'attribute_not_exists(deletedAt)');
 input.FilterExpression=filters.join(' AND ');if(!Object.keys(input.ExpressionAttributeNames).length)delete input.ExpressionAttributeNames;
 const out=await db.send(new QueryCommand(input));
 await audit(actor,b.deleted===true?'leads.trash.list':'leads.list',{count:out.Items?.length||0,leadIds:(out.Items||[]).map(x=>x.id)});
 return{leads:(out.Items||[]).map(x=>lead(x,actor)),nextCursor:next(out.LastEvaluatedKey)};
}
// A lead that is not assigned to the salesperson asking reads as missing, and the attempt is recorded.
async function readable(actor,id,attempted){
 const out=await db.send(new GetCommand({TableName:process.env.LEADS_TABLE,Key:{id},ConsistentRead:true}));
 if(!out.Item||out.Item.deletedAt)return null;
 if(actor.role==='sales'&&out.Item.assignedTo!==actor.uid){await audit(actor,'access.denied',{attempted,leadId:id});return null;}
 return out.Item;
}
async function getLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.get');
 if(!item)return{error:'Enquiry not found.',status:404};
 await audit(actor,'leads.read',{leadId:b.id});return{lead:lead(item,actor)};
}
// Ask the identity service who is on the sales team. Only the staff member's own token travels.
async function teamMembers(header,origin){
 const r=await fetch(process.env.IDENTITY_VERIFY_URL,{method:'POST',headers:{Authorization:header,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'team.members'}),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw new Error('identity unavailable');
 const {members}=await r.json();
 if(!Array.isArray(members))throw new Error('identity unavailable');
 return members.filter(m=>m&&validUid(m.uid)&&(m.role==='sales'||m.role==='manager'));
}
async function assignLeads(actor,b,ctx){
 if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>50||!b.ids.every(validId)||new Set(b.ids).size!==b.ids.length)return{error:'Choose between 1 and 50 enquiries.'};
 const to=b.assignee===''?'':b.assignee;
 if(to!==''&&!validUid(to))return{error:'Invalid salesperson.'};
 if(to){const member=(await teamMembers(ctx.header,ctx.origin)).find(m=>m.uid===to);if(!member||member.disabled)return{error:'Choose an active member of the sales team.'};}
 const at=new Date().toISOString();
 const TransactItems=b.ids.map(id=>({Update:{TableName:process.env.LEADS_TABLE,Key:{id},...(to?{UpdateExpression:'SET assignedTo=:to, assignedAt=:at, assignedBy=:by',ExpressionAttributeValues:{':to':to,':at':at,':by':actor.uid}}:{UpdateExpression:'REMOVE assignedTo, assignedAt, assignedBy'}),ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}}));
 TransactItems.push({Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.assign',{count:b.ids.length,leadIds:b.ids,assignee:to||'none'}),ConditionExpression:'attribute_not_exists(id)'}});
 try{await db.send(new TransactWriteCommand({TransactItems}));}catch(e){if(e?.CancellationReasons?.some(x=>x?.Code==='ConditionalCheckFailed'))return{error:'One of those enquiries is missing or in the Recycle Bin.'};throw e;}
 return{ok:true,assigned:b.ids.length};
}
function dialable(phone){
 const digits=typeof phone==='string'?phone.replace(/\D/g,''):'';
 if(digits.length===10)return`+1${digits}`;
 if(digits.length===11&&digits.startsWith('1'))return`+${digits}`;
 return digits.length>=7&&digits.length<=15?digits:'';
}
// The number is released for one call at a time, never shown in a list. Every release
// is audited and counted, and each person may release a limited number per hour.
async function dialLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.dial');
 if(!item)return{error:'Enquiry not found.',status:404};
 const number=dialable(item.phone);
 if(!number)return{error:'This enquiry has no phone number that can be dialled.'};
 const now=Date.now(),at=new Date(now).toISOString(),own=actor.role==='sales';
 try{
  await db.send(new TransactWriteCommand({TransactItems:[
   {Update:{TableName:process.env.RATE_TABLE,Key:{id:`dial#${actor.uid}#${Math.floor(now/3600000)}`},UpdateExpression:'SET expiresAt=:expiry ADD #count :one',ConditionExpression:'attribute_not_exists(#count) OR #count < :limit',ExpressionAttributeNames:{'#count':'count'},ExpressionAttributeValues:{':expiry':Math.floor(now/1000)+7200,':one':1,':limit':DIAL_LIMIT_PER_HOUR}}},
   {Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET lastDialAt=:at, lastDialBy=:uid ADD dialCount :one',ConditionExpression:`attribute_exists(id) AND attribute_not_exists(deletedAt)${own?' AND assignedTo=:uid':''}`,ExpressionAttributeValues:{':at':at,':uid':actor.uid,':one':1}}},
   {Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.dial',{leadId:b.id}),ConditionExpression:'attribute_not_exists(id)'}},
  ]}));
 }catch(e){
  const reasons=e?.CancellationReasons;
  if(reasons?.[0]?.Code==='ConditionalCheckFailed'){await audit(actor,'leads.dial.limited',{leadId:b.id});return{error:'You have reached the hourly call limit. Please ask your manager for help.',status:429};}
  if(reasons?.[1]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};
  throw e;
 }
 return{dial:number};
}
const closedStatuses=new Set(['qualified','not-qualified','closed']);
const pacificDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
// Counts per salesperson for the manager. Names and contact details are never read.
async function teamSummary(actor){
 let key,total=0;const people={},unassigned={open:0,new:0,oldestNewAt:null};const today=pacificDay.format(new Date());
 do{
  const out=await db.send(new QueryCommand({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'LEAD'},ProjectionExpression:'assignedTo,#status,lastDialAt,createdAt,dialCount',ExpressionAttributeNames:{'#status':'status'},FilterExpression:'attribute_not_exists(deletedAt)',ExclusiveStartKey:key}));
  for(const x of out.Items||[]){
   total++;
   const open=!closedStatuses.has(x.status),fresh=x.status==='new',created=typeof x.createdAt==='string'?x.createdAt:null;
   if(!validUid(x.assignedTo)){if(open)unassigned.open++;if(fresh){unassigned.new++;if(created&&(!unassigned.oldestNewAt||created<unassigned.oldestNewAt))unassigned.oldestNewAt=created;}continue;}
   const p=people[x.assignedTo]||(people[x.assignedTo]={assigned:0,open:0,new:0,calledToday:0,calls:0,qualified:0,notQualified:0,closed:0,oldestNewAt:null,lastDialAt:null});
   p.assigned++;if(open)p.open++;
   if(fresh){p.new++;if(created&&(!p.oldestNewAt||created<p.oldestNewAt))p.oldestNewAt=created;}
   if(x.status==='qualified')p.qualified++;if(x.status==='not-qualified')p.notQualified++;if(x.status==='closed')p.closed++;
   if(typeof x.dialCount==='number')p.calls+=x.dialCount;
   if(typeof x.lastDialAt==='string'){if(pacificDay.format(new Date(x.lastDialAt))===today)p.calledToday++;if(!p.lastDialAt||x.lastDialAt>p.lastDialAt)p.lastDialAt=x.lastDialAt;}
  }
  key=out.LastEvaluatedKey;
 }while(key);
 await audit(actor,'leads.team',{count:total});
 return{people,unassigned,total};
}
async function updateLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const names={},values={},sets=[];
 if(b.status!==undefined){if(!statuses.has(b.status))return{error:'Invalid stage.'};names['#status']='status';values[':status']=b.status;sets.push('#status=:status');}
 if(b.note!==undefined){if(typeof b.note!=='string'||b.note.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(b.note))return{error:'Invalid note.'};names['#note']='note';values[':note']=b.note;sets.push('#note=:note');}
 if(!sets.length)return{error:'Invalid update.'};
 try{
  // The change and its audit commit together. Audit failure cannot leave an unrecorded change.
  if(actor.role==='sales')values[':me']=actor.uid;
  await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:`SET ${sets.join(', ')}`,ExpressionAttributeNames:names,ExpressionAttributeValues:values,ConditionExpression:`attribute_exists(id) AND attribute_not_exists(deletedAt)${actor.role==='sales'?' AND assignedTo=:me':''}`}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.update',{leadId:b.id,fields:Object.keys(names).map(x=>names[x])}),ConditionExpression:'attribute_not_exists(id)'}}]}));
 }catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function deleteLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const deletedAt=new Date().toISOString(),purgeAt=Math.floor(Date.now()/1000)+(7*24*60*60);
 try{
  await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET deletedAt=:deletedAt, purgeAt=:purgeAt, deletedBy=:deletedBy',ExpressionAttributeValues:{':deletedAt':deletedAt,':purgeAt':purgeAt,':deletedBy':actor.uid},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.delete',{leadId:b.id,purgeAt}),ConditionExpression:'attribute_not_exists(id)'}}]}));
 }catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function restoreLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 try{await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'REMOVE deletedAt, purgeAt, deletedBy',ConditionExpression:'attribute_exists(id) AND attribute_exists(deletedAt)'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.restore',{leadId:b.id}),ConditionExpression:'attribute_not_exists(id)'}}]}));}
 catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Deleted enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function importStatuses(actor,b){
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>50)return{error:'Import must contain between 1 and 50 rows.'};
 if(!b.items.every(x=>x&&typeof x==='object'&&validId(x.id)&&statuses.has(x.status))||new Set(b.items.map(x=>x.id)).size!==b.items.length)return{error:'Invalid status import.'};
 const TransactItems=b.items.map(x=>({Update:{TableName:process.env.LEADS_TABLE,Key:{id:x.id},UpdateExpression:'SET #status=:status',ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:{':status':x.status},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}}));
 TransactItems.push({Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.status.import',{count:b.items.length,leadIds:b.items.map(x=>x.id)}),ConditionExpression:'attribute_not_exists(id)'}});
 try{await db.send(new TransactWriteCommand({TransactItems}));}catch(e){if(e?.CancellationReasons?.some(x=>x?.Code==='ConditionalCheckFailed'))return{error:'The status import includes an enquiry that is missing or in the Recycle Bin.'};throw e;}
 return{ok:true,updated:b.items.length};
}
async function retryConfirmation(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.notify');
 if(!item)return{error:'Enquiry not found.',status:404};
 const out={Item:item};
 if(out.Item.customerConfirmationStatus==='sent')return{ok:true,notificationStatus:'not-configured',customerConfirmationStatus:'sent'};
 await audit(actor,'leads.confirmation.requested',{leadId:b.id});
 let status='failed';
 try{await sendSubmissionConfirmation(out.Item.email,out.Item.source==='contact'?'contact':'eligibility');status='sent'}catch{}
 await db.send(new UpdateCommand({TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET customerConfirmationStatus=:status, customerConfirmationUpdatedAt=:at',ExpressionAttributeValues:{':status':status,':at':new Date().toISOString()},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}));
 await audit(actor,'leads.confirmation.completed',{leadId:b.id,status});
 return{ok:true,notificationStatus:'not-configured',customerConfirmationStatus:status};
}
async function stats(actor,countsOnly=false,b={}){
 let key,total=0;const result={total:0,insulinYes:0,byStatus:{},byState:{},byProduct:{},byDay:{}};const counts={};
 do{
  const input={TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'LEAD'},ProjectionExpression:countsOnly?'referralCode':'#status,#state,productName,injectsInsulinDaily,createdAt',FilterExpression:'attribute_not_exists(deletedAt)',...(countsOnly?{}:{ExpressionAttributeNames:{'#status':'status','#state':'state'}}),ExclusiveStartKey:key};
  if(!countsOnly)try{applyRange(input,b)}catch{return{error:'Invalid date range.'}};
  const out=await db.send(new QueryCommand(input));
  for(const x of out.Items||[]){total++;if(countsOnly){if(x.referralCode)counts[x.referralCode]=(counts[x.referralCode]||0)+1;continue;}if(x.injectsInsulinDaily==='yes')result.insulinYes++;for(const [map,k] of [[result.byStatus,x.status],[result.byState,x.state],[result.byProduct,x.productName]])if(k)map[k]=(map[k]||0)+1;const day=typeof x.createdAt==='string'?x.createdAt.slice(0,10):'';if(day)result.byDay[day]=(result.byDay[day]||0)+1;}
  key=out.LastEvaluatedKey;
 }while(key);
 await audit(actor,countsOnly?'influencers.counts':'leads.stats',{count:total});
 result.total=total;return countsOnly?{counts}:result;
}
async function route(actor,b,ctx){
 if(b.action==='leads.list')return listLeads(actor,b);
 if(b.action==='leads.assign')return assignLeads(actor,b,ctx);
 if(b.action==='leads.dial')return dialLead(actor,b);
 if(b.action==='leads.team')return teamSummary(actor);
 if(b.action==='leads.get')return getLead(actor,b);
 if(b.action==='leads.update')return updateLead(actor,b);
 if(b.action==='leads.delete')return deleteLead(actor,b);
 if(b.action==='leads.restore')return restoreLead(actor,b);
 if(b.action==='leads.status.import')return importStatuses(actor,b);
 if(b.action==='leads.stats')return stats(actor,false,b);
 if(b.action==='influencers.counts')return stats(actor,true);
 if(b.action==='leads.export'){
  if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>500||!b.ids.every(validId)||new Set(b.ids).size!==b.ids.length)return{error:'Invalid export.'};
  await audit(actor,'leads.export',{count:b.ids.length,leadIds:b.ids});return{ok:true};
 }
 if(b.action==='leads.notify')return retryConfirmation(actor,b);
 if(b.action==='audit.list'){
  const out=await db.send(new QueryCommand({TableName:process.env.AUDIT_TABLE,IndexName:'AuditTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'AUDIT'},ScanIndexForward:false,Limit:200}));
  await audit(actor,'audit.list',{count:out.Items?.length||0});
  return{entries:(out.Items||[]).map(({gsi1pk,gsi1sk,...item})=>item)};
 }
}
exports.handler=async(event)=>{
 const origin=event.headers?.origin||event.headers?.Origin||'';
 if(!origins.has(origin))return response(403,'',{error:'Request not allowed.'});
 if(event.requestContext?.http?.method!=='POST')return response(405,origin,{error:'Method not allowed.'});
 if(!(event.headers?.['content-type']||event.headers?.['Content-Type']||'').toLowerCase().startsWith('application/json'))return response(415,origin,{error:'JSON required.'});
 let raw=event.body||'';if(event.isBase64Encoded)raw=Buffer.from(raw,'base64').toString('utf8');
 if(Buffer.byteLength(raw)>16384)return response(413,origin,{error:'Request too large.'});
 let body;try{body=JSON.parse(raw)}catch{return response(400,origin,{error:'Invalid request.'})}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string'||!Object.hasOwn(features,body.action))return response(400,origin,{error:'Invalid request.'});
 let actor;try{actor=await authenticate(event.headers?.authorization||event.headers?.Authorization,origin)}catch{return response(503,origin,{error:'The identity service is temporarily unavailable.'})}
 if(!actor)return response(401,origin,{error:'Your session has expired. Please sign in again.'});
 try{
  if((body.action==='audit.list'&&actor.role!=='owner')||(actor.role!=='owner'&&!actor.features.includes(features[body.action]))||(features[body.action]==='salesTeam'&&actor.role!=='owner'&&actor.role!=='manager')||(hidesContact(actor)&&(recordActions.has(body.action)||(body.action==='leads.list'&&body.deleted===true)))){await audit(actor,'access.denied',{attempted:body.action});return response(403,origin,{error:'You do not have access to that.'});}
  const result=await route(actor,body,{header:event.headers?.authorization||event.headers?.Authorization,origin});return response(result.status||('error' in result?400:200),origin,result);
 }catch{console.error('admin failure',{requestId:event.requestContext?.requestId});return response(503,origin,{error:'That did not work. Please try again.'});}
};
