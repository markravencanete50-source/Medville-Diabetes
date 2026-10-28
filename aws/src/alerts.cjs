const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,PutCommand,QueryCommand,ScanCommand,UpdateCommand}=require('@aws-sdk/lib-dynamodb');
const {randomUUID}=require('node:crypto');
const {sendStaffAlert}=require('./email.cjs');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
/*
 Staff email alerts. Runs every two minutes on a schedule.

 It reads lead keys, stages, assignment and times only (never a name, phone, email
 or answer) and sends each subscribed staff member one email that counts what needs
 them: new enquiries waiting to be assigned (Owner and Sales manager), enquiries
 newly assigned to them, and their callbacks that are now due. Each person's
 watermark only moves forward after their email is accepted, so a failed send is
 retried on the next run and nothing is counted twice. Lead records are never
 written: callbacks are tracked by the same kind of watermark, on the callback time.
*/
const LOOKBACK_MS=24*60*60*1000;
const validUid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const validEmail=x=>typeof x==='string'&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const later=(a,b)=>a&&(!b||a>b)?a:b;
async function all(input){const items=[];let key;do{const out=await db.send(new QueryCommand({...input,ExclusiveStartKey:key}));items.push(...(out.Items||[]));key=out.LastEvaluatedKey;}while(key);return items;}
async function subscribers(){
 const items=[];let key;
 do{const out=await db.send(new ScanCommand({TableName:process.env.ALERTS_TABLE,ExclusiveStartKey:key}));items.push(...(out.Items||[]));key=out.LastEvaluatedKey;}while(key);
 return items.filter(x=>x.enabled===true&&validUid(x.uid)&&validEmail(x.email));
}
exports.handler=async()=>{
 const subs=await subscribers();
 if(!subs.length)return{sent:0};
 const now=Date.now(),nowIso=new Date(now).toISOString(),floor=new Date(now-LOOKBACK_MS).toISOString();
 const watchers=subs.filter(x=>x.role==='owner'||x.role==='manager');
 // New enquiries since the earliest watermark, read once for every Owner and Sales manager.
 let fresh=[];
 if(watchers.length){
  const since=watchers.reduce((min,x)=>{const w=later(x.newSince,floor);return w<min?w:min;},nowIso);
  fresh=await all({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk AND gsi1sk>:since',ExpressionAttributeValues:{':pk':'LEAD',':since':`${since}#￿`},ProjectionExpression:'id,createdAt,assignedTo,deletedAt'});
  fresh=fresh.filter(x=>!x.deletedAt&&typeof x.createdAt==='string');
 }
 let sent=0;const touched=[];
 for(const sub of subs){
  const newSince=later(sub.newSince,floor),assignedSince=later(sub.assignedSince,floor),callbackSince=later(sub.callbackSince,floor);
  const unassignedNew=sub.role==='owner'||sub.role==='manager'?fresh.filter(x=>x.createdAt>newSince&&!x.assignedTo):[];
  const mine=await all({TableName:process.env.LEADS_TABLE,IndexName:'AssigneeTimeline',KeyConditionExpression:'assignedTo=:uid',ExpressionAttributeValues:{':uid':sub.uid},ProjectionExpression:'id,#status,assignedAt,callbackAt,deletedAt',ExpressionAttributeNames:{'#status':'status'}});
  const live=mine.filter(x=>!x.deletedAt);
  const assigned=live.filter(x=>typeof x.assignedAt==='string'&&x.assignedAt>assignedSince);
  const due=live.filter(x=>x.status==='callback'&&typeof x.callbackAt==='string'&&x.callbackAt<=nowIso&&x.callbackAt>callbackSince);
  const counts={newCount:unassignedNew.length,assignedCount:assigned.length,callbackCount:due.length};
  if(!counts.newCount&&!counts.assignedCount&&!counts.callbackCount)continue;
  let status='sent';
  try{await sendStaffAlert(sub.email,counts,process.env.DASHBOARD_ORIGIN);sent++;}catch{status='failed';}
  if(status==='sent'){
   touched.push(...unassignedNew.map(x=>x.id),...assigned.map(x=>x.id),...due.map(x=>x.id));
  }
  const values={':status':status,':at':nowIso};const sets=['lastStatus=:status','lastAttemptAt=:at'];
  if(status==='sent'){
   sets.push('lastSentAt=:at');
   const newMark=unassignedNew.reduce((m,x)=>later(x.createdAt,m),sub.newSince);
   const assignedMark=assigned.reduce((m,x)=>later(x.assignedAt,m),sub.assignedSince);
   if(newMark){sets.push('newSince=:newSince');values[':newSince']=newMark;}
   if(assignedMark){sets.push('assignedSince=:assignedSince');values[':assignedSince']=assignedMark;}
   const callbackMark=due.reduce((m,x)=>later(x.callbackAt,m),sub.callbackSince);
   if(callbackMark){sets.push('callbackSince=:callbackSince');values[':callbackSince']=callbackMark;}
  }
  await db.send(new UpdateCommand({TableName:process.env.ALERTS_TABLE,Key:{uid:sub.uid},UpdateExpression:`SET ${sets.join(', ')}`,ExpressionAttributeValues:values,ConditionExpression:'attribute_exists(uid)'})).catch(()=>{console.error('alert state update failed')});
 }
 if(sent){
  // One access-log entry per run that sent anything, naming the records it counted.
  const at=new Date().toISOString(),id=randomUUID();
  await db.send(new PutCommand({TableName:process.env.AUDIT_TABLE,Item:{id,gsi1pk:'AUDIT',gsi1sk:`${at}#${id}`,actorUid:'system',actorEmail:'',actorRole:'system',action:'alerts.sent',count:sent,leadIds:[...new Set(touched)].slice(0,500),at},ConditionExpression:'attribute_not_exists(id)'}));
 }
 return{sent};
};
