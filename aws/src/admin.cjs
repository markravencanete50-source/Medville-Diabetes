const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,GetCommand,PutCommand,QueryCommand,ScanCommand,TransactWriteCommand,UpdateCommand}=require('@aws-sdk/lib-dynamodb');
const {randomUUID}=require('node:crypto');
const {sendSubmissionConfirmation}=require('./confirmation.cjs');
const {sendCompanyNotification}=require('./notification.cjs');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
const origins=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
// The sales stages. 'contacted' is the stage older records may still hold; it stays valid
// so those records keep working, but the dashboard no longer offers it.
const statuses=new Set(['new','contacted','no-answer','voicemail','callback','needs-verification','waiting-documents','intake-completed','qualified','not-qualified','not-interested','wrong-number','do-not-contact','closed']);
// Stages that need one more fact. The reason is always a fixed choice, never free text, so a
// stage can carry no patient detail. A callback carries its date and time instead.
const stageReasons={'needs-verification':['insurance','prescription','contact-details','other'],'waiting-documents':['prescription','insurance-card','photo-id','other'],'not-qualified':['insurance','criteria','area','other']};
const needsDetail=new Set(['callback','needs-verification','waiting-documents','not-qualified']);
// A patient who asked not to be contacted stays that way unless an Owner changes it.
const DO_NOT_CONTACT='do-not-contact';
const CALLBACK_MAX_DAYS=90;
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const validUid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const validDay=x=>x===undefined||x===''||(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(`${x}T00:00:00Z`)));
const features={'leads.history':'leads','alerts.list':'salesTeam','alerts.set':'salesTeam','assign.auto.set':'salesTeam','leads.assign':'salesTeam','leads.reshuffle':'salesTeam','leads.team':'salesTeam','leads.team.activity':'salesTeam','leads.dial':'leads','leads.list':'leads','leads.get':'leads','leads.update':'leads','leads.delete':'leads','leads.restore':'recycle','leads.confirmation.retry':'leads','leads.status.import':'leads','leads.stats':'overview','leads.export':'leads','leads.notify':'leads','audit.list':'audit','influencers.counts':'influencers'};
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
 const fields=['id','firstName','lastName','email','phone','city','state','injectsInsulinDaily','productInterest','productName','referralCode','source','message','notificationStatus','customerConfirmationStatus','status','note','assignedTo','statusReason','callbackAt'];
 const out={...Object.fromEntries(fields.map(k=>[k,typeof item[k]==='string'?item[k]:'' ])),createdAt:typeof item.createdAt==='string'?item.createdAt:null,deletedAt:typeof item.deletedAt==='string'?item.deletedAt:null,purgeAt:typeof item.purgeAt==='number'?item.purgeAt:null,lastDialAt:typeof item.lastDialAt==='string'?item.lastDialAt:null,dialCount:typeof item.dialCount==='number'?item.dialCount:0,callsLogged:typeof item.callsLogged==='number'?item.callsLogged:0,callPending:validUid(item.callOpenBy)&&item.callOpenBy===actor.uid,contactHidden:false};
 if(hidesContact(actor)){out.email='';out.phone='';out.contactHidden=true;}
 return out;
}
// A page cursor is the last key of the index that was read: the timeline, or one person's assignments.
function cursor(value,key){
 if(value===undefined)return undefined;
 if(typeof value!=='string'||value.length>1200)throw new Error('invalid cursor');
 const out=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
 if(!out||!validId(out.id)||out[key.name]!==key.value||typeof out[key.sort]!=='string'||out[key.sort].length>110||Object.keys(out).length!==3)throw new Error('invalid cursor');
 return out;
}
/*
 A person's assignments are sorted under "open#" or "done#" and then the arrival time, so
 the alert job can read only open leads instead of paying to read every finished one, and a
 salesperson's list shows open work first. Written whenever a lead is assigned or changes
 stage, from the stage being written and the lead's fixed arrival key.
*/
// The staff settings key that holds the automatic assignment rota. It cannot be a staff id.
const ROSTER='#auto-assign';
const workKey=(status,gsi1sk)=>`${doneStatuses.has(status)?'done':'open'}#${gsi1sk}`;
// The fixed arrival keys of several leads, read before writing their work keys.
async function arrivalKeys(ids){
 const items=await Promise.all(ids.map(id=>db.send(new GetCommand({TableName:process.env.LEADS_TABLE,Key:{id},ProjectionExpression:'id,gsi1sk,#status,deletedAt,callOpenBy',ExpressionAttributeNames:{'#status':'status'},ConsistentRead:true})).then(out=>out.Item)));
 return items.every(x=>x&&!x.deletedAt&&typeof x.gsi1sk==='string')?items:null;
}
const next=value=>value?Buffer.from(JSON.stringify(value)).toString('base64url'):null;
function auditItem(actor,action,detail={}){
 const at=new Date().toISOString(),id=randomUUID();
 return{id,gsi1pk:'AUDIT',gsi1sk:`${at}#${id}`,actorUid:actor.uid,actorEmail:actor.email||'',actorRole:actor.role,action,...detail,at};
}
// Per-lead history: what was done to one lead, by whom, and when, in fixed fields only. It
// never holds a note's text or a patient answer. Each entry is written in the same
// transaction as the change it describes, so the history cannot disagree with the lead.
function historyItem(actor,leadId,action,detail={}){
 const at=new Date().toISOString(),id=randomUUID();
 return{Put:{TableName:process.env.HISTORY_TABLE,Item:{leadId,sk:`${at}#${id}`,at,action,actorUid:actor.uid,actorEmail:actor.email||'',actorRole:actor.role,...detail},ConditionExpression:'attribute_not_exists(leadId)'}};
}
// Transactions hold at most 100 writes: a change, its history entry, and one audit entry.
const BATCH_LIMIT=45;
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
 const key=person?{name:'assignedTo',value:person,sort:'workSk'}:{name:'gsi1pk',value:'LEAD',sort:'gsi1sk'};
 let start;try{start=cursor(b.cursor,key)}catch{return{error:'Invalid page.'}};
 const input={TableName:process.env.LEADS_TABLE,IndexName:person?'AssigneeTimeline':'LeadTimeline',KeyConditionExpression:`${key.name}=:pk`,ExpressionAttributeValues:{':pk':key.value},ScanIndexForward:false,Limit:50,ExclusiveStartKey:start};
 const filters=[];input.ExpressionAttributeNames={};
 if(person){
  // One person's list is sorted open first, so the calendar range filters it instead.
  const range={KeyConditionExpression:'',ExpressionAttributeValues:{}};
  try{applyRange(range,b)}catch{return{error:'Invalid date range.'}};
  if(range.KeyConditionExpression){filters.push(range.KeyConditionExpression.replace(/^ AND /,''));Object.assign(input.ExpressionAttributeValues,range.ExpressionAttributeValues);}
 }else{try{applyRange(input,b)}catch{return{error:'Invalid date range.'}};}
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
// One lead's history, newest first, for anyone allowed to open that lead. Reading it is audited.
const historyActions=new Set(['stage','note','assign','call','delete','restore']);
async function leadHistory(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.history');
 if(!item)return{error:'Enquiry not found.',status:404};
 const out=await db.send(new QueryCommand({TableName:process.env.HISTORY_TABLE,KeyConditionExpression:'leadId=:id',ExpressionAttributeValues:{':id':b.id},ScanIndexForward:false,Limit:100}));
 await audit(actor,'leads.history.read',{leadId:b.id,count:out.Items?.length||0});
 const text=x=>typeof x==='string'?x:'';
 return{history:(out.Items||[]).filter(x=>historyActions.has(x.action)).map(x=>({at:text(x.at),action:x.action,actorUid:text(x.actorUid),actorEmail:text(x.actorEmail),actorRole:text(x.actorRole),status:text(x.status),statusReason:text(x.statusReason),callbackAt:text(x.callbackAt),assignee:text(x.assignee),source:text(x.source),...(x.action==='note'&&typeof x.note==='string'?{note:x.note}:{}),...(x.callLogged===true?{callLogged:true}:{})}))};
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
 if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>BATCH_LIMIT||!b.ids.every(validId)||new Set(b.ids).size!==b.ids.length)return{error:`Choose between 1 and ${BATCH_LIMIT} enquiries.`};
 const to=b.assignee===''?'':b.assignee;
 if(to!==''&&!validUid(to))return{error:'Invalid salesperson.'};
 if(to){const member=(await teamMembers(ctx.header,ctx.origin)).find(m=>m.uid===to);if(!member||member.disabled)return{error:'Choose an active member of the sales team.'};}
 const at=new Date().toISOString();
 const current=to?await arrivalKeys(b.ids):null;
 if(to&&!current)return{error:'One of those enquiries is missing or in the Recycle Bin.'};
 // The stage must still be the one the work key was taken from, or the assignment is refused.
 const TransactItems=b.ids.map((id,i)=>({Update:{TableName:process.env.LEADS_TABLE,Key:{id},...(to?{UpdateExpression:'SET assignedTo=:to, assignedAt=:at, assignedBy=:by, workSk=:work REMOVE callOpenBy, callOpenAt',ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt) AND #status=:status',ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:{':to':to,':at':at,':by':actor.uid,':work':workKey(current[i].status,current[i].gsi1sk),':status':current[i].status}}:{UpdateExpression:'REMOVE assignedTo, assignedAt, assignedBy, workSk, callOpenBy, callOpenAt',ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'})}}));
 TransactItems.push({Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.assign',{count:b.ids.length,leadIds:b.ids,assignee:to||'none'}),ConditionExpression:'attribute_not_exists(id)'}});
 TransactItems.push(...b.ids.map(id=>historyItem(actor,id,'assign',{assignee:to})));
 try{await db.send(new TransactWriteCommand({TransactItems}));}catch(e){if(e?.CancellationReasons?.some(x=>x?.Code==='ConditionalCheckFailed'))return{error:'One of those enquiries changed or moved to the Recycle Bin. Refresh and try again.'};throw e;}
 return{ok:true,assigned:b.ids.length};
}
/*
 Reshuffle: the Sales manager takes the open enquiries of some people (or the ones
 nobody holds yet) and shares them out again, evenly and oldest first, among the
 people he chooses. Each lead goes to whoever has received the fewest so far,
 never back to the person it came from. Finished leads, including Do not contact,
 are never moved. Every move is conditional on the lead still being where it was
 read, and writes its history entry and one audit entry per batch.
*/
const RESHUFFLE_LIMIT=225;
async function openLeadsOf(from,scope){
 const items=[];
 for(const who of from){
  let key;
  do{
   const input=who==='unassigned'
    ?{TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',FilterExpression:'attribute_not_exists(assignedTo) AND attribute_not_exists(deletedAt)',ExpressionAttributeValues:{':pk':'LEAD'}}
    :{TableName:process.env.LEADS_TABLE,IndexName:'AssigneeTimeline',KeyConditionExpression:'assignedTo=:pk AND begins_with(workSk,:open)',FilterExpression:'attribute_not_exists(deletedAt)',ExpressionAttributeValues:{':pk':who,':open':'open#'}};
   const out=await db.send(new QueryCommand({...input,ProjectionExpression:'id,gsi1sk,#status,assignedTo',ExpressionAttributeNames:{'#status':'status'},ExclusiveStartKey:key}));
   items.push(...(out.Items||[]).map(x=>({...x,from:who})));
   key=out.LastEvaluatedKey;
  }while(key);
 }
 return items.filter(x=>validId(x.id)&&typeof x.gsi1sk==='string'&&!doneStatuses.has(x.status)&&(scope==='open'||x.status==='new')).sort((a,b)=>a.gsi1sk.localeCompare(b.gsi1sk));
}
async function reshuffleLeads(actor,b,ctx){
 const from=Array.isArray(b.from)?b.from:[],to=Array.isArray(b.to)?b.to:[];
 const scope=b.scope==='open'?'open':'new';
 if(!from.length||from.length>25||new Set(from).size!==from.length||!from.every(x=>x==='unassigned'||validUid(x)))return{error:'Choose whose enquiries to share out.'};
 if(!to.length||to.length>25||new Set(to).size!==to.length||!to.every(validUid))return{error:'Choose who should receive them.'};
 const team=await teamMembers(ctx.header,ctx.origin);
 if(!to.every(uid=>team.some(m=>m.uid===uid&&!m.disabled)))return{error:'Choose active members of the sales team.'};
 const found=await openLeadsOf(from,scope);
 const batch=found.slice(0,RESHUFFLE_LIMIT);
 const given=Object.fromEntries(to.map(uid=>[uid,0]));
 const moves=[];
 for(const item of batch){
  const options=to.filter(uid=>uid!==item.assignedTo);
  if(!options.length)continue;
  const target=options.reduce((best,uid)=>given[uid]<given[best]?uid:best,options[0]);
  given[target]++;moves.push({...item,to:target});
 }
 let moved=0,skipped=0;
 for(let start=0;start<moves.length;start+=BATCH_LIMIT){
  const part=moves.slice(start,start+BATCH_LIMIT),at=new Date().toISOString();
  const TransactItems=part.map(x=>({Update:{TableName:process.env.LEADS_TABLE,Key:{id:x.id},UpdateExpression:'SET assignedTo=:to, assignedAt=:at, assignedBy=:by, workSk=:work REMOVE callOpenBy, callOpenAt',ConditionExpression:`attribute_exists(id) AND attribute_not_exists(deletedAt) AND #status=:status AND ${x.assignedTo?'assignedTo=:was':'attribute_not_exists(assignedTo)'}`,ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:{':to':x.to,':at':at,':by':actor.uid,':work':workKey(x.status,x.gsi1sk),':status':x.status,...(x.assignedTo?{':was':x.assignedTo}:{})}}}));
  TransactItems.push({Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.reshuffle',{count:part.length,leadIds:part.map(x=>x.id),scope}),ConditionExpression:'attribute_not_exists(id)'}});
  TransactItems.push(...part.map(x=>historyItem(actor,x.id,'assign',{assignee:x.to,source:'reshuffle'})));
  try{await db.send(new TransactWriteCommand({TransactItems}));moved+=part.length;}
  catch(e){if(e?.CancellationReasons?.some(x=>x?.Code==='ConditionalCheckFailed')){skipped+=part.length;continue;}throw e;}
 }
 return{ok:true,moved,skipped,remaining:Math.max(0,found.length-batch.length),given};
}
function dialable(phone){
 const digits=typeof phone==='string'?phone.replace(/\D/g,''):'';
 if(digits.length===10)return`+1${digits}`;
 if(digits.length===11&&digits.startsWith('1'))return`+${digits}`;
 return digits.length>=7&&digits.length<=15?digits:'';
}
// The number is released for one call at a time, never shown in a list. It goes to the
// computer's dialler, or to the clipboard when that dialler does not open from a link. Every release
// is audited and counted, and each person may release a limited number per hour.
async function dialLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.dial');
 if(!item)return{error:'Enquiry not found.',status:404};
 if(item.status===DO_NOT_CONTACT)return{error:'This patient asked not to be contacted.',status:409};
 const number=dialable(item.phone);
 if(!number)return{error:'This enquiry has no phone number that can be dialled.'};
 const now=Date.now(),at=new Date(now).toISOString(),own=actor.role==='sales';
 // Copying the number for the dialler is a release like a call: limited, audited and in the history.
 const copy=b.copy===true;
 try{
  await db.send(new TransactWriteCommand({TransactItems:[
   {Update:{TableName:process.env.RATE_TABLE,Key:{id:`dial#${actor.uid}#${Math.floor(now/3600000)}`},UpdateExpression:'SET expiresAt=:expiry ADD #count :one',ConditionExpression:'attribute_not_exists(#count) OR #count < :limit',ExpressionAttributeNames:{'#count':'count'},ExpressionAttributeValues:{':expiry':Math.floor(now/1000)+7200,':one':1,':limit':DIAL_LIMIT_PER_HOUR}}},
   {Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET lastDialAt=:at, lastDialBy=:uid, callOpenBy=:uid, callOpenAt=:at ADD dialCount :one',ConditionExpression:`attribute_exists(id) AND attribute_not_exists(deletedAt)${own?' AND assignedTo=:uid':''}`,ExpressionAttributeValues:{':at':at,':uid':actor.uid,':one':1}}},
   {Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.dial',{leadId:b.id,method:copy?'copy':'call'}),ConditionExpression:'attribute_not_exists(id)'}},
   historyItem(actor,b.id,'call',copy?{source:'copy'}:{}),
  ]}));
 }catch(e){
  const reasons=e?.CancellationReasons;
  if(reasons?.[0]?.Code==='ConditionalCheckFailed'){await audit(actor,'leads.dial.limited',{leadId:b.id});return{error:'You have reached the hourly call limit. Please ask your manager for help.',status:429};}
  if(reasons?.[1]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};
  throw e;
 }
 return{dial:number};
}
const doneStatuses=new Set(['intake-completed','qualified','not-qualified','not-interested','wrong-number','do-not-contact','closed']);
const qualifiedStatuses=new Set(['intake-completed','qualified']);
const notQualifiedStatuses=new Set(['not-qualified','not-interested','wrong-number','do-not-contact']);
const pacificDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
// Counts per salesperson for the manager. Names and contact details are never read.
// Email alerts. Only staff email addresses and on/off state live here, in their own table;
// the address always comes from the identity service, never from the browser.
async function listAlerts(){
 const items=[];let key;
 do{const out=await db.send(new ScanCommand({TableName:process.env.ALERTS_TABLE,ExclusiveStartKey:key}));items.push(...(out.Items||[]));key=out.LastEvaluatedKey;}while(key);
 const roster=items.find(x=>x.uid===ROSTER);
 return{alerts:items.filter(x=>validUid(x.uid)).map(x=>({uid:x.uid,enabled:x.enabled===true,lastStatus:typeof x.lastStatus==='string'?x.lastStatus:'',lastSentAt:typeof x.lastSentAt==='string'?x.lastSentAt:null})),autoAssign:[...(roster?.members||[])].filter(validUid).sort()};
}
/*
 Automatic assignment. The people who receive new enquiries in turn are one set of staff
 ids, kept in the staff settings table under a key no staff id can take. The intake
 function reads it and hands each new enquiry to the next person on it, so nobody has to
 assign by hand. Joining is checked against the identity service; leaving never is.
*/
async function setAutoAssign(actor,b,ctx){
 if(!validUid(b.uid)||typeof b.enabled!=='boolean')return{error:'Invalid assignment setting.'};
 if(b.enabled){const member=(await teamMembers(ctx.header,ctx.origin)).find(m=>m.uid===b.uid);if(!member||member.disabled)return{error:'Choose an active member of the sales team.'};}
 await db.send(new UpdateCommand({TableName:process.env.ALERTS_TABLE,Key:{uid:ROSTER},UpdateExpression:`${b.enabled?'ADD':'DELETE'} members :who SET updatedAt=:at, updatedBy=:by`,ExpressionAttributeValues:{':who':new Set([b.uid]),':at':new Date().toISOString(),':by':actor.uid}}));
 await audit(actor,'assign.auto.set',{targetUid:b.uid,enabled:b.enabled});
 return{ok:true};
}
async function setAlerts(actor,b,ctx){
 if(!validUid(b.uid)||typeof b.enabled!=='boolean')return{error:'Invalid alert setting.'};
 const nowIso=new Date().toISOString();
 if(!b.enabled){
  await db.send(new UpdateCommand({TableName:process.env.ALERTS_TABLE,Key:{uid:b.uid},UpdateExpression:'SET enabled=:off, updatedAt=:at, updatedBy=:by',ExpressionAttributeValues:{':off':false,':at':nowIso,':by':actor.uid}}));
  await audit(actor,'alerts.set',{targetUid:b.uid,enabled:false});return{ok:true};
 }
 let person;
 if(b.uid===actor.uid)person={email:actor.email,role:actor.role};
 else{const member=(await teamMembers(ctx.header,ctx.origin)).find(m=>m.uid===b.uid);if(!member||member.disabled)return{error:'Choose an active member of the sales team.'};person={email:member.email,role:member.role};}
 if(typeof person.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))return{error:'That account has no email address.'};
 // Counting starts now, so switching alerts on never sends a backlog.
 await db.send(new UpdateCommand({TableName:process.env.ALERTS_TABLE,Key:{uid:b.uid},UpdateExpression:'SET enabled=:on, email=:email, #role=:role, newSince=:at, assignedSince=:at, callbackSince=:at, updatedAt=:at, updatedBy=:by',ExpressionAttributeNames:{'#role':'role'},ExpressionAttributeValues:{':on':true,':email':person.email.toLowerCase(),':role':person.role,':at':nowIso,':by':actor.uid}}));
 await audit(actor,'alerts.set',{targetUid:b.uid,enabled:true});
 return{ok:true};
}
async function teamSummary(actor){
 let key,total=0;const people={},unassigned={open:0,new:0,oldestNewAt:null};const today=pacificDay.format(new Date()),nowIso=new Date().toISOString();
 do{
  const out=await db.send(new QueryCommand({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'LEAD'},ProjectionExpression:'assignedTo,#status,lastDialAt,createdAt,callsLogged,lastCallLoggedAt,callOpenBy,callbackAt',ExpressionAttributeNames:{'#status':'status'},FilterExpression:'attribute_not_exists(deletedAt)',ExclusiveStartKey:key}));
  for(const x of out.Items||[]){
   total++;
   const open=!doneStatuses.has(x.status),fresh=x.status==='new',created=typeof x.createdAt==='string'?x.createdAt:null;
   if(!validUid(x.assignedTo)){if(open)unassigned.open++;if(fresh){unassigned.new++;if(created&&(!unassigned.oldestNewAt||created<unassigned.oldestNewAt))unassigned.oldestNewAt=created;}continue;}
   const p=people[x.assignedTo]||(people[x.assignedTo]={assigned:0,open:0,new:0,callbacksDue:0,calledToday:0,calls:0,notLogged:0,qualified:0,notQualified:0,closed:0,oldestNewAt:null,lastDialAt:null});
   p.assigned++;if(open)p.open++;
   if(fresh){p.new++;if(created&&(!p.oldestNewAt||created<p.oldestNewAt))p.oldestNewAt=created;}
   if(qualifiedStatuses.has(x.status))p.qualified++;if(notQualifiedStatuses.has(x.status))p.notQualified++;if(x.status==='closed')p.closed++;
   if(x.status==='callback'&&typeof x.callbackAt==='string'&&x.callbackAt<=nowIso)p.callbacksDue++;
   // Calls count only when the outcome was recorded; a dial with no update yet is shown apart.
   if(typeof x.callsLogged==='number')p.calls+=x.callsLogged;
   if(validUid(x.callOpenBy))p.notLogged++;
   if(typeof x.lastCallLoggedAt==='string'&&pacificDay.format(new Date(x.lastCallLoggedAt))===today)p.calledToday++;
   if(typeof x.lastDialAt==='string'&&(!p.lastDialAt||x.lastDialAt>p.lastDialAt))p.lastDialAt=x.lastDialAt;
  }
  key=out.LastEvaluatedKey;
 }while(key);
 await audit(actor,'leads.team',{count:total});
 return{people,unassigned,total};
}
/* The Sales team charts: what the team did over a chosen run of days, and the
   same length of time just before it, for the comparison. Counts only. It reads
   the enquiries that arrived (stage and assignee, never a name or an answer)
   and the access log's call and stage entries, and returns totals per Pacific
   day and per person. No enquiry id leaves this function. */
const ACTIVITY_MAX_DAYS=92,ACTIVITY_BUDGET_MS=14000;
const shiftDay=(day,n)=>new Date(Date.parse(`${day}T12:00:00Z`)+n*86400000).toISOString().slice(0,10);
async function teamActivity(actor,b){
 if(!b.from||!b.to||!validDay(b.from)||!validDay(b.to)||b.from>b.to)return{error:'Invalid date range.'};
 const days=Math.round((Date.parse(`${b.to}T00:00:00Z`)-Date.parse(`${b.from}T00:00:00Z`))/86400000)+1;
 if(days>ACTIVITY_MAX_DAYS)return{error:`Please choose ${ACTIVITY_MAX_DAYS} days or fewer.`};
 const prevFrom=shiftDay(b.from,-days),prevTo=shiftDay(b.from,-1),deadline=Date.now()+ACTIVITY_BUDGET_MS;
 // Days are Pacific. The stored times are UTC, so the window is widened by a day each side and every item is placed by its Pacific day.
 const window={':from':`${shiftDay(prevFrom,-1)}T00:00:00.000Z#`,':to':`${shiftDay(b.to,1)}T23:59:59.999Z#￿`};
 const blank=()=>({received:0,dials:0,recorded:0,qualified:0,notQualified:0});
 const byDay={},people={},current=blank(),previous=blank(),funnel={received:0,contacted:0,qualified:0,notQualified:0,open:0};
 for(let d=b.from;d<=b.to;d=shiftDay(d,1))byDay[d]=blank();
 const place=iso=>{if(typeof iso!=='string')return null;const t=Date.parse(iso);if(!Number.isFinite(t))return null;const day=pacificDay.format(new Date(t));return day>=b.from&&day<=b.to?{day,now:true}:day>=prevFrom&&day<=prevTo?{day,now:false}:null;};
 const person=uid=>people[uid]||(people[uid]={...blank(),assigned:0});
 const count=(where,field,uid)=>{if(!where)return;(where.now?current:previous)[field]++;if(!where.now)return;byDay[where.day][field]++;if(uid)person(uid)[field]++;};
 let partial=false,leads=0,entries=0,key;
 do{
  const out=await db.send(new QueryCommand({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk AND gsi1sk BETWEEN :from AND :to',ExpressionAttributeValues:{':pk':'LEAD',...window},ExpressionAttributeNames:{'#status':'status'},ProjectionExpression:'createdAt,#status,assignedTo',FilterExpression:'attribute_not_exists(deletedAt)',ExclusiveStartKey:key}));
  for(const x of out.Items||[]){
   const where=place(x.createdAt);if(!where)continue;leads++;
   const uid=validUid(x.assignedTo)?x.assignedTo:'';count(where,'received',uid);
   if(!where.now)continue;
   if(uid)person(uid).assigned++;
   funnel.received++;if(x.status!=='new')funnel.contacted++;
   if(qualifiedStatuses.has(x.status))funnel.qualified++;else if(notQualifiedStatuses.has(x.status)||x.status==='closed')funnel.notQualified++;else funnel.open++;
  }
  key=out.LastEvaluatedKey;
  if(key&&Date.now()>deadline){partial=true;break;}
 }while(key);
 key=undefined;
 if(!partial)do{
  const out=await db.send(new QueryCommand({TableName:process.env.AUDIT_TABLE,IndexName:'AuditTimeline',KeyConditionExpression:'gsi1pk=:pk AND gsi1sk BETWEEN :from AND :to',ExpressionAttributeValues:{':pk':'AUDIT',':dial':'leads.dial',':update':'leads.update',...window},ExpressionAttributeNames:{'#action':'action','#at':'at'},ProjectionExpression:'actorUid,#action,#at,stage,callLogged',FilterExpression:'#action IN (:dial, :update)',ExclusiveStartKey:key}));
  for(const x of out.Items||[]){
   const where=place(x.at);if(!where)continue;entries++;
   const uid=validUid(x.actorUid)?x.actorUid:'';
   if(x.action==='leads.dial'){count(where,'dials',uid);continue;}
   if(x.callLogged===true)count(where,'recorded',uid);
   if(qualifiedStatuses.has(x.stage))count(where,'qualified',uid);
   else if(notQualifiedStatuses.has(x.stage))count(where,'notQualified',uid);
  }
  key=out.LastEvaluatedKey;
  if(key&&Date.now()>deadline){partial=true;break;}
 }while(key);
 await audit(actor,'leads.team.activity',{from:b.from,to:b.to,count:leads,entries});
 return{from:b.from,to:b.to,previousFrom:prevFrom,previousTo:prevTo,days:Object.entries(byDay).map(([day,v])=>({day,...v})),people,current,previous,funnel,partial};
}
// A failed condition returns the old item in DynamoDB's own attribute format.
const attr=(item,key)=>{const v=item?.[key];return typeof v==='string'?v:typeof v?.S==='string'?v.S:undefined;};
// A stage change also sets or clears the details that belong to the stage, so a lead never
// keeps a callback time or a reason from a stage it has left.
function stageChange(b,names,values,sets,removes){
 if(!statuses.has(b.status))return'Invalid stage.';
 names['#status']='status';values[':status']=b.status;sets.push('#status=:status');
 if(stageReasons[b.status]){
  if(!stageReasons[b.status].includes(b.statusReason))return'Please choose a reason for this stage.';
  names['#statusReason']='statusReason';values[':statusReason']=b.statusReason;sets.push('#statusReason=:statusReason');
 }else removes.push('statusReason');
 if(b.status==='callback'){
  const at=typeof b.callbackAt==='string'&&b.callbackAt.length<=40?Date.parse(b.callbackAt):NaN;
  if(!Number.isFinite(at)||at<Date.now()-5*60000||at>Date.now()+CALLBACK_MAX_DAYS*86400000)return`Please choose a callback time within the next ${CALLBACK_MAX_DAYS} days.`;
  names['#callbackAt']='callbackAt';values[':callbackAt']=new Date(at).toISOString();sets.push('#callbackAt=:callbackAt');
 }else removes.push('callbackAt');
 return'';
}
async function updateLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const names={},values={},sets=[],removes=[],adds=[],conditions=['attribute_exists(id)','attribute_not_exists(deletedAt)'];
 let item=null;
 if(b.status!==undefined){
  const problem=stageChange(b,names,values,sets,removes);if(problem)return{error:problem};
  const [found]=await arrivalKeys([b.id])||[];
  if(!found)return{error:'Enquiry not found.',status:404};item=found;
  names['#workSk']='workSk';values[':workSk']=workKey(b.status,item.gsi1sk);sets.push('#workSk=:workSk');
  if(actor.role!=='owner'){conditions.push('#status<>:dnc');values[':dnc']=DO_NOT_CONTACT;}
 }
 if(b.note!==undefined){
  if(typeof b.note!=='string'||b.note.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(b.note))return{error:'Invalid note.'};
  names['#note']='note';values[':note']=b.note;sets.push('#note=:note');
  if(!item){const [found]=await arrivalKeys([b.id])||[];if(!found)return{error:'Enquiry not found.',status:404};item=found;}
 }
 /* A call counts only once the person who made it records how it went: their
  next stage change or note closes the open call and adds one to the lead's
  logged calls. The condition stops two saves from counting the same call twice. */
 const callLogged=Boolean(item&&item.callOpenBy===actor.uid);
 if(callLogged){
  values[':caller']=actor.uid;values[':loggedAt']=new Date().toISOString();values[':oneCall']=1;
  sets.push('lastCallLoggedAt=:loggedAt','lastCallLoggedBy=:caller');removes.push('callOpenBy','callOpenAt');adds.push('callsLogged :oneCall');
  conditions.push('callOpenBy=:caller');
 }
 if(!sets.length)return{error:'Invalid update.'};
 if(actor.role==='sales'){values[':me']=actor.uid;conditions.push('assignedTo=:me');}
 try{
  // The change and its audit commit together. Audit failure cannot leave an unrecorded change.
  const history=[];
  // The call is marked on the first entry the save writes, so the history says which save recorded it.
  if(b.status!==undefined)history.push(historyItem(actor,b.id,'stage',{status:b.status,...(values[':statusReason']?{statusReason:values[':statusReason']}:{}),...(values[':callbackAt']?{callbackAt:values[':callbackAt']}:{}),...(callLogged?{callLogged:true}:{})}));
  /* Since 2026-11-05, on the client's instruction, the note's text is kept in
     the history, so earlier notes are not lost when a new one is saved. The
     history table is encrypted and protected like the lead itself, and is read
     only by people who can open the lead. The access log still never holds it. */
  if(b.note!==undefined)history.push(historyItem(actor,b.id,'note',{note:b.note,...(callLogged&&b.status===undefined?{callLogged:true}:{})}));
  await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:`SET ${sets.join(', ')}${removes.length?` REMOVE ${removes.join(', ')}`:''}${adds.length?` ADD ${adds.join(', ')}`:''}`,ExpressionAttributeNames:names,ExpressionAttributeValues:values,ConditionExpression:conditions.join(' AND '),ReturnValuesOnConditionCheckFailure:'ALL_OLD'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.update',{leadId:b.id,fields:Object.keys(names).map(x=>names[x]),...(b.status!==undefined?{stage:b.status}:{}),...(adds.length?{callLogged:true}:{})}),ConditionExpression:'attribute_not_exists(id)'}},...history]}));
 }catch(e){
  const reason=e?.CancellationReasons?.[0];
  if(reason?.Code==='ConditionalCheckFailed'){
   const old=reason.Item;
   if(old&&!attr(old,'deletedAt')&&attr(old,'status')===DO_NOT_CONTACT&&(actor.role!=='sales'||attr(old,'assignedTo')===actor.uid))return{error:'This patient asked not to be contacted. Only an Owner can change this stage.',status:409};
   return{error:'Enquiry not found.',status:404};
  }
  throw e;
 }
 return{ok:true};
}
async function deleteLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const deletedAt=new Date().toISOString(),purgeAt=Math.floor(Date.now()/1000)+(7*24*60*60);
 try{
  await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET deletedAt=:deletedAt, purgeAt=:purgeAt, deletedBy=:deletedBy',ExpressionAttributeValues:{':deletedAt':deletedAt,':purgeAt':purgeAt,':deletedBy':actor.uid},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.delete',{leadId:b.id,purgeAt}),ConditionExpression:'attribute_not_exists(id)'}},historyItem(actor,b.id,'delete')]}));
 }catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function restoreLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 try{await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'REMOVE deletedAt, purgeAt, deletedBy',ConditionExpression:'attribute_exists(id) AND attribute_exists(deletedAt)'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.restore',{leadId:b.id}),ConditionExpression:'attribute_not_exists(id)'}},historyItem(actor,b.id,'restore')]}));}
 catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Deleted enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function importStatuses(actor,b){
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>BATCH_LIMIT)return{error:`Import must contain between 1 and ${BATCH_LIMIT} rows.`};
 // A stage that needs a reason or a callback time is set on the enquiry itself, not by import.
 if(b.items.some(x=>x&&typeof x==='object'&&needsDetail.has(x.status)&&x.status!=='not-qualified'))return{error:'Callback, Needs verification and Waiting on documents need details. Set them on the enquiry instead.'};
 if(!b.items.every(x=>x&&typeof x==='object'&&validId(x.id)&&statuses.has(x.status))||new Set(b.items.map(x=>x.id)).size!==b.items.length)return{error:'Invalid status import.'};
 const lock=actor.role!=='owner';
 const current=await arrivalKeys(b.items.map(x=>x.id));
 if(!current)return{error:'The status import includes an enquiry that is missing, in the Recycle Bin, or marked Do not contact.'};
 const TransactItems=b.items.map((x,i)=>({Update:{TableName:process.env.LEADS_TABLE,Key:{id:x.id},UpdateExpression:'SET #status=:status, workSk=:work REMOVE statusReason, callbackAt',ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:{':status':x.status,':work':workKey(x.status,current[i].gsi1sk),...(lock?{':dnc':DO_NOT_CONTACT}:{})},ConditionExpression:`attribute_exists(id) AND attribute_not_exists(deletedAt)${lock?' AND #status<>:dnc':''}`}}));
 TransactItems.push({Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.status.import',{count:b.items.length,leadIds:b.items.map(x=>x.id)}),ConditionExpression:'attribute_not_exists(id)'}});
 TransactItems.push(...b.items.map(x=>historyItem(actor,x.id,'stage',{status:x.status,source:'import'})));
 try{await db.send(new TransactWriteCommand({TransactItems}));}catch(e){if(e?.CancellationReasons?.some(x=>x?.Code==='ConditionalCheckFailed'))return{error:'The status import includes an enquiry that is missing, in the Recycle Bin, or marked Do not contact.'};throw e;}
 return{ok:true,updated:b.items.length};
}
// Resends the company inbox notice for one lead. The notice never holds the answers.
async function retryNotification(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.notify');
 if(!item)return{error:'Enquiry not found.',status:404};
 await audit(actor,'leads.companyNotification.requested',{leadId:b.id});
 let status='failed',messageId;
 try{messageId=await sendCompanyNotification(item);status='sent'}catch(error){console.error('company notification rejected by SES',{name:error?.name})}
 await db.send(new UpdateCommand({TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET notificationStatus=:status, notificationUpdatedAt=:at'+(messageId?', notificationMessageId=:messageId':''),ExpressionAttributeValues:{':status':status,':at':new Date().toISOString(),...(messageId?{':messageId':messageId}:{})},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}));
 await audit(actor,'leads.companyNotification.completed',{leadId:b.id,status});
 return{ok:true,notificationStatus:status,customerConfirmationStatus:item.customerConfirmationStatus||'pending'};
}
async function retryConfirmation(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const item=await readable(actor,b.id,'leads.confirmation.retry');
 if(!item)return{error:'Enquiry not found.',status:404};
 const out={Item:item};
 if(out.Item.customerConfirmationStatus==='sent')return{ok:true,customerConfirmationStatus:'sent'};
 await audit(actor,'leads.confirmation.requested',{leadId:b.id});
 let status='failed';
 try{await sendSubmissionConfirmation(out.Item.email,out.Item.source==='contact'?'contact':'eligibility',out.Item.id);status='sent'}catch(error){console.error('customer confirmation rejected by Resend',{name:error?.name})}
 await db.send(new UpdateCommand({TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:'SET customerConfirmationStatus=:status, customerConfirmationUpdatedAt=:at',ExpressionAttributeValues:{':status':status,':at':new Date().toISOString()},ConditionExpression:'attribute_exists(id) AND attribute_not_exists(deletedAt)'}));
 await audit(actor,'leads.confirmation.completed',{leadId:b.id,status});
 return{ok:true,customerConfirmationStatus:status};
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
 if(b.action==='leads.reshuffle')return reshuffleLeads(actor,b,ctx);
 if(b.action==='leads.dial')return dialLead(actor,b);
 if(b.action==='leads.history')return leadHistory(actor,b);
 if(b.action==='leads.team')return teamSummary(actor);
 if(b.action==='leads.team.activity')return teamActivity(actor,b);
 if(b.action==='alerts.list')return listAlerts();
 if(b.action==='alerts.set')return setAlerts(actor,b,ctx);
 if(b.action==='assign.auto.set')return setAutoAssign(actor,b,ctx);
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
 if(b.action==='leads.notify')return retryNotification(actor,b);
 if(b.action==='leads.confirmation.retry')return retryConfirmation(actor,b);
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
  if((body.action==='audit.list'&&actor.role!=='owner')||(actor.role!=='owner'&&!actor.features.includes(body.action==='leads.list'&&body.deleted===true?'recycle':features[body.action]))||(features[body.action]==='salesTeam'&&actor.role!=='owner'&&actor.role!=='manager')||(hidesContact(actor)&&(recordActions.has(body.action)||(body.action==='leads.list'&&body.deleted===true)))){await audit(actor,'access.denied',{attempted:body.action});return response(403,origin,{error:'You do not have access to that.'});}
  const result=await route(actor,body,{header:event.headers?.authorization||event.headers?.Authorization,origin});return response(result.status||('error' in result?400:200),origin,result);
 }catch{console.error('admin failure',{requestId:event.requestContext?.requestId});return response(503,origin,{error:'That did not work. Please try again.'});}
};
