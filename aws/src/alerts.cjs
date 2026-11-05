const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,PutCommand,QueryCommand,ScanCommand,UpdateCommand}=require('@aws-sdk/lib-dynamodb');
const {randomUUID}=require('node:crypto');
const {sendStaffAlert}=require('./email.cjs');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
/*
 Staff email alerts. Runs every two minutes on a schedule.

 It reads lead keys, stages, assignment and times only (never a name, phone, email
 or answer) and sends three kinds of email, each a count with no patient detail:
 - Owners and the Sales manager: every enquiry that arrived since their last email.
 - Owners and the Sales manager: enquiries still at New with no number copied
   30 minutes after they arrived.
 - Each person: enquiries newly assigned to them (by hand, automatically or by a
   reshuffle), and their callbacks that are now due, greeted by their own first name.
 Each kind keeps its own watermark, which only moves forward after that email is
 accepted, so a failed send is retried on the next run and nothing is counted twice.
 Lead records are never written. Only open leads are read for each person: finished
 ones sit under "done#" in the assignment index and are never touched.
*/
const LOOKBACK_MS=24*60*60*1000,OVERDUE_MS=30*60*1000;
const validUid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const validEmail=x=>typeof x==='string'&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const later=(a,b)=>a&&(!b||a>b)?a:b;
const latest=(items,field,start)=>items.reduce((m,x)=>later(x[field],m),start);
async function all(input){const items=[];let key;do{const out=await db.send(new QueryCommand({...input,ExclusiveStartKey:key}));items.push(...(out.Items||[]));key=out.LastEvaluatedKey;}while(key);return items;}
async function subscribers(){
 const items=[];let key;
 do{const out=await db.send(new ScanCommand({TableName:process.env.ALERTS_TABLE,ExclusiveStartKey:key}));items.push(...(out.Items||[]));key=out.LastEvaluatedKey;}while(key);
 return items.filter(x=>x.enabled===true&&validUid(x.uid)&&validEmail(x.email));
}
// Not called within 30 minutes: still at New, and no number copied before the 30 minutes ran out.
const notCalled=x=>x.status==='new'&&(typeof x.lastDialAt!=='string'||Date.parse(x.lastDialAt)>Date.parse(x.createdAt)+OVERDUE_MS);
exports.handler=async()=>{
 const subs=await subscribers();
 if(!subs.length)return{sent:0};
 const now=Date.now(),nowIso=new Date(now).toISOString(),floor=new Date(now-LOOKBACK_MS).toISOString(),cutoff=new Date(now-OVERDUE_MS).toISOString();
 const watchers=subs.filter(x=>x.role==='owner'||x.role==='manager');
 // Arrivals since the earliest watermark, read once for every Owner and Sales manager.
 let arrivals=[];
 if(watchers.length){
  const since=watchers.reduce((min,x)=>{const a=later(x.newSince,floor),b=later(x.overdueSince||cutoff,floor);const w=a<b?a:b;return w<min?w:min;},nowIso);
  arrivals=await all({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk AND gsi1sk>:since',ExpressionAttributeValues:{':pk':'LEAD',':since':`${since}#￿`},ProjectionExpression:'id,createdAt,assignedTo,deletedAt,#status,lastDialAt',ExpressionAttributeNames:{'#status':'status'}});
  arrivals=arrivals.filter(x=>!x.deletedAt&&typeof x.createdAt==='string');
 }
 let sent=0;const touched=[];
 for(const sub of subs){
  const emails=[],marks={};
  if(sub.role==='owner'||sub.role==='manager'){
   const newSince=later(sub.newSince,floor);
   const fresh=arrivals.filter(x=>x.createdAt>newSince);
   if(fresh.length)emails.push({kind:'new',data:{count:fresh.length,unassigned:fresh.filter(x=>!x.assignedTo).length},ids:fresh.map(x=>x.id),marks:{newSince:latest(fresh,'createdAt',sub.newSince)}});
   if(!sub.overdueSince)marks.overdueSince=cutoff; // Starts now, so switching this on never sends a backlog.
   else{
    const since=later(sub.overdueSince,floor);
    const due=arrivals.filter(x=>x.createdAt>since&&x.createdAt<=cutoff);
    const late=due.filter(notCalled);
    const mark=latest(due,'createdAt',sub.overdueSince);
    if(late.length)emails.push({kind:'overdue',data:{count:late.length,unassigned:late.filter(x=>!x.assignedTo).length},ids:late.map(x=>x.id),marks:{overdueSince:mark}});
    else if(due.length)marks.overdueSince=mark; // Every one was called in time: move on without an email.
   }
  }
  const assignedSince=later(sub.assignedSince,floor),callbackSince=later(sub.callbackSince,floor);
  const mine=await all({TableName:process.env.LEADS_TABLE,IndexName:'AssigneeTimeline',KeyConditionExpression:'assignedTo=:uid AND begins_with(workSk,:open)',ExpressionAttributeValues:{':uid':sub.uid,':open':'open#'},ProjectionExpression:'id,#status,assignedAt,callbackAt,deletedAt',ExpressionAttributeNames:{'#status':'status'}});
  const live=mine.filter(x=>!x.deletedAt);
  const assigned=live.filter(x=>typeof x.assignedAt==='string'&&x.assignedAt>assignedSince);
  const callbacks=live.filter(x=>x.status==='callback'&&typeof x.callbackAt==='string'&&x.callbackAt<=nowIso&&x.callbackAt>callbackSince);
  if(assigned.length||callbacks.length){
   const personal={};
   if(assigned.length)personal.assignedSince=latest(assigned,'assignedAt',sub.assignedSince);
   if(callbacks.length)personal.callbackSince=latest(callbacks,'callbackAt',sub.callbackSince);
   emails.push({kind:'personal',data:{assignedCount:assigned.length,callbackCount:callbacks.length,name:sub.name},ids:[...assigned,...callbacks].map(x=>x.id),marks:personal});
  }
  if(!emails.length&&!Object.keys(marks).length)continue;
  let failed=false,delivered=0;
  for(const email of emails){
   const key=`${sub.uid}-${email.kind}-${Object.values(email.marks).filter(Boolean).join('-')}`;
   try{await sendStaffAlert(sub.email,email.kind,email.data,process.env.DASHBOARD_ORIGIN,key);delivered++;sent++;touched.push(...email.ids);Object.assign(marks,email.marks);}
   catch{failed=true;}
  }
  const values={':at':nowIso};const sets=[];
  if(emails.length){sets.push('lastStatus=:status','lastAttemptAt=:at');values[':status']=failed?'failed':'sent';}
  if(delivered)sets.push('lastSentAt=:at');
  for(const [field,value] of Object.entries(marks))if(value){sets.push(`${field}=:${field}`);values[`:${field}`]=value;}
  if(!sets.length)continue;
  await db.send(new UpdateCommand({TableName:process.env.ALERTS_TABLE,Key:{uid:sub.uid},UpdateExpression:`SET ${sets.join(', ')}`,ExpressionAttributeValues:values,ConditionExpression:'attribute_exists(uid)'})).catch(()=>{console.error('alert state update failed')});
 }
 if(sent){
  // One access-log entry per run that sent anything, naming the records it counted.
  const at=new Date().toISOString(),id=randomUUID();
  await db.send(new PutCommand({TableName:process.env.AUDIT_TABLE,Item:{id,gsi1pk:'AUDIT',gsi1sk:`${at}#${id}`,actorUid:'system',actorEmail:'',actorRole:'system',action:'alerts.sent',count:sent,leadIds:[...new Set(touched)].slice(0,500),at},ConditionExpression:'attribute_not_exists(id)'}));
 }
 return{sent};
};
