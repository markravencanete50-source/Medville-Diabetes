const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,GetCommand,PutCommand,QueryCommand,TransactWriteCommand}=require('@aws-sdk/lib-dynamodb');
const {randomUUID}=require('node:crypto');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
const origins=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
const statuses=new Set(['new','contacted','qualified','not-qualified','closed']);
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const features={'leads.list':'leads','leads.get':'leads','leads.update':'leads','leads.stats':'overview','leads.export':'leads','leads.notify':'leads','audit.list':'audit','influencers.counts':'influencers'};
async function authenticate(header,origin){
 if(typeof header!=='string'||!header.startsWith('Bearer ')||header.length>10000)return null;
 // The identity service checks revocation, disabled accounts, session age and current claims.
 // Only the workforce token is transmitted; no patient IDs, actions or fields are sent.
 const r=await fetch(process.env.IDENTITY_VERIFY_URL,{method:'POST',headers:{Authorization:header,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'auth.session'}),signal:AbortSignal.timeout(5000)});
 if(r.status===401||r.status===403)return null;
 if(!r.ok)throw new Error('identity unavailable');
 const {actor}=await r.json();
 if(!actor||typeof actor.uid!=='string'||!['owner','marketing','sales'].includes(actor.role)||!Array.isArray(actor.features))return null;
 return actor;
}
function response(statusCode,origin,body){return{statusCode,headers:{'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})},body:JSON.stringify(body)}}
function lead(item){
 const fields=['id','firstName','lastName','email','phone','city','state','injectsInsulinDaily','productInterest','productName','referralCode','source','message','notificationStatus','status','note','createdAt'];
 return Object.fromEntries(fields.map(k=>[k,typeof item[k]==='string'?item[k]:'']));
}
function cursor(value){
 if(value===undefined)return undefined;
 if(typeof value!=='string'||value.length>1200)throw new Error('invalid cursor');
 const out=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
 if(!out||!validId(out.id)||out.gsi1pk!=='LEAD'||typeof out.gsi1sk!=='string'||out.gsi1sk.length>100||Object.keys(out).length!==3)throw new Error('invalid cursor');
 return out;
}
const next=value=>value?Buffer.from(JSON.stringify(value)).toString('base64url'):null;
function auditItem(actor,action,detail={}){
 const at=new Date().toISOString(),id=randomUUID();
 return{id,gsi1pk:'AUDIT',gsi1sk:`${at}#${id}`,actorUid:actor.uid,actorEmail:actor.email||'',actorRole:actor.role,action,...detail,at};
}
async function audit(actor,action,detail={}){await db.send(new PutCommand({TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,action,detail),ConditionExpression:'attribute_not_exists(id)'}))}
async function listLeads(actor,b){
 let key;try{key=cursor(b.cursor)}catch{return{error:'Invalid page.'}};
 const input={TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'LEAD'},ScanIndexForward:false,Limit:50,ExclusiveStartKey:key};
 if(b.status){if(!statuses.has(b.status))return{error:'Invalid stage.'};input.FilterExpression='#status=:status';input.ExpressionAttributeNames={'#status':'status'};input.ExpressionAttributeValues[':status']=b.status;}
 const out=await db.send(new QueryCommand(input));
 await audit(actor,'leads.list',{count:out.Items?.length||0,leadIds:(out.Items||[]).map(x=>x.id)});
 return{leads:(out.Items||[]).map(lead),nextCursor:next(out.LastEvaluatedKey)};
}
async function getLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const out=await db.send(new GetCommand({TableName:process.env.LEADS_TABLE,Key:{id:b.id},ConsistentRead:true}));
 if(!out.Item)return{error:'Enquiry not found.',status:404};
 await audit(actor,'leads.read',{leadId:b.id});return{lead:lead(out.Item)};
}
async function updateLead(actor,b){
 if(!validId(b.id))return{error:'Invalid enquiry.'};
 const names={},values={},sets=[];
 if(b.status!==undefined){if(!statuses.has(b.status))return{error:'Invalid stage.'};names['#status']='status';values[':status']=b.status;sets.push('#status=:status');}
 if(b.note!==undefined){if(typeof b.note!=='string'||b.note.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(b.note))return{error:'Invalid note.'};names['#note']='note';values[':note']=b.note;sets.push('#note=:note');}
 if(!sets.length)return{error:'Invalid update.'};
 try{
  // The change and its audit commit together. Audit failure cannot leave an unrecorded change.
  await db.send(new TransactWriteCommand({TransactItems:[{Update:{TableName:process.env.LEADS_TABLE,Key:{id:b.id},UpdateExpression:`SET ${sets.join(', ')}`,ExpressionAttributeNames:names,ExpressionAttributeValues:values,ConditionExpression:'attribute_exists(id)'}},{Put:{TableName:process.env.AUDIT_TABLE,Item:auditItem(actor,'leads.update',{leadId:b.id,fields:Object.keys(names).map(x=>names[x])}),ConditionExpression:'attribute_not_exists(id)'}}]}));
 }catch(e){if(e?.CancellationReasons?.[0]?.Code==='ConditionalCheckFailed')return{error:'Enquiry not found.',status:404};throw e;}
 return{ok:true};
}
async function stats(actor,countsOnly=false){
 let key,total=0;const result={total:0,insulinYes:0,byStatus:{},byState:{},byProduct:{},byDay:{}};const counts={};
 do{
  const out=await db.send(new QueryCommand({TableName:process.env.LEADS_TABLE,IndexName:'LeadTimeline',KeyConditionExpression:'gsi1pk=:pk',ExpressionAttributeValues:{':pk':'LEAD'},ProjectionExpression:countsOnly?'referralCode':'#status,#state,productName,injectsInsulinDaily,createdAt',...(countsOnly?{}:{ExpressionAttributeNames:{'#status':'status','#state':'state'}}),ExclusiveStartKey:key}));
  for(const x of out.Items||[]){total++;if(countsOnly){if(x.referralCode)counts[x.referralCode]=(counts[x.referralCode]||0)+1;continue;}if(x.injectsInsulinDaily==='yes')result.insulinYes++;for(const [map,k] of [[result.byStatus,x.status],[result.byState,x.state],[result.byProduct,x.productName]])if(k)map[k]=(map[k]||0)+1;const day=typeof x.createdAt==='string'?x.createdAt.slice(0,10):'';if(day)result.byDay[day]=(result.byDay[day]||0)+1;}
  key=out.LastEvaluatedKey;
 }while(key);
 await audit(actor,countsOnly?'influencers.counts':'leads.stats',{count:total});
 result.total=total;return countsOnly?{counts}:result;
}
async function route(actor,b){
 if(b.action==='leads.list')return listLeads(actor,b);
 if(b.action==='leads.get')return getLead(actor,b);
 if(b.action==='leads.update')return updateLead(actor,b);
 if(b.action==='leads.stats')return stats(actor);
 if(b.action==='influencers.counts')return stats(actor,true);
 if(b.action==='leads.export'){
  if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>500||!b.ids.every(validId)||new Set(b.ids).size!==b.ids.length)return{error:'Invalid export.'};
  await audit(actor,'leads.export',{count:b.ids.length,leadIds:b.ids});return{ok:true};
 }
 if(b.action==='leads.notify')return{error:'Email notifications are not configured. Review new enquiries in the dashboard.',status:503};
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
  if((body.action==='audit.list'&&actor.role!=='owner')||(actor.role!=='owner'&&!actor.features.includes(features[body.action]))){await audit(actor,'access.denied',{attempted:body.action});return response(403,origin,{error:'You do not have access to that.'});}
  const result=await route(actor,body);return response(result.status||('error' in result?400:200),origin,result);
 }catch{console.error('admin failure',{requestId:event.requestContext?.requestId});return response(503,origin,{error:'That did not work. Please try again.'});}
};
