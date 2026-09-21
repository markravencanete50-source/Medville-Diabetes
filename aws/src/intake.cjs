const {DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const {DynamoDBDocumentClient,GetCommand,TransactWriteCommand}=require('@aws-sdk/lib-dynamodb');
const {createHash}=require('node:crypto');
const {validateSubmission}=require('../../functions/intake.js');
const {validateContactSubmission}=require('../../functions/contact.js');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
const origins=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
function response(statusCode,origin,body,extra={}){
 return {statusCode,headers:{'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{}),...extra},body:JSON.stringify(body)};
}
async function config(data){
 // Only public product/campaign identifiers, never answers, go to the content service.
 const res=await fetch(process.env.INTAKE_CONFIG_URL,{method:'POST',headers:{'Content-Type':'application/json',Origin:[...origins][0]},body:JSON.stringify({productInterest:data.productInterest,referralCode:data.referralCode}),signal:AbortSignal.timeout(5000)});
 if(!res.ok)throw new Error('catalog unavailable');
 const value=await res.json();
 if(!value||typeof value!=='object')throw new Error('invalid catalog response');
 return value;
}
function fingerprint(data){return createHash('sha256').update(JSON.stringify(data)).digest('hex');}
function duplicate(existing,data){
 if(!existing)return null;
 // A reused UUID must not acknowledge different answers as successfully saved.
 const matches=existing.requestHash?existing.requestHash===fingerprint(data):Object.entries(data).every(([k,v])=>k==='submissionId'||existing[k]===v);
 return matches?200:409;
}
exports.handler=async(event)=>{
 const origin=event.headers?.origin||event.headers?.Origin||'';
 if(!origins.has(origin))return response(403,'',{error:'Request not allowed.'});
 if(event.requestContext?.http?.method!=='POST')return response(405,origin,{error:'Method not allowed.'});
 if(process.env.INTAKE_ENABLED!=='true')return response(503,origin,{error:'Online submissions are not open yet.'});
 if(!(event.headers?.['content-type']||event.headers?.['Content-Type']||'').toLowerCase().startsWith('application/json'))return response(415,origin,{error:'JSON required.'});
 let raw=event.body||'';
 if(event.isBase64Encoded)raw=Buffer.from(raw,'base64').toString('utf8');
 if(Buffer.byteLength(raw)>8192)return response(413,origin,{error:'Request too large.'});
 let parsed;try{parsed=JSON.parse(raw)}catch{return response(400,origin,{error:'Please check the form fields.'})}
 const contact=event.rawPath==='/contact';
 const data=contact?validateContactSubmission(parsed):validateSubmission(parsed);
 if(!data)return response(400,origin,{error:'Please check the form fields.'});
 data.submissionId=data.submissionId.toLowerCase();
 const get=()=>db.send(new GetCommand({TableName:process.env.LEADS_TABLE,Key:{id:data.submissionId},ConsistentRead:true}));
 const receipt=(code)=>response(code,origin,code===200?{ok:true}:{error:'This submission was already saved. Please refresh before sending a new enquiry.'});
 try{
  const prior=duplicate((await get()).Item,data);if(prior)return receipt(prior);
  const catalog=contact?{}:await config(data);
  if(!contact&&(!catalog.product||typeof catalog.product.name!=='string'))return response(400,origin,{error:'Please choose an available product.'});
  const createdAt=new Date().toISOString(),now=Date.now(),bucket=Math.floor(now/3600000);
  const ip=event.requestContext?.http?.sourceIp;
  if(!ip)return response(503,origin,{error:'The submission could not be saved. Please try again.'});
  const rateId=createHash('sha256').update(`${bucket}:${ip}`).digest('hex');
  const {submissionId,...answers}=data;
  const referralCode=catalog.referralActive===true?data.referralCode:'';
  const lead={id:submissionId,...answers,referralCode,source:contact?'contact':referralCode?'influencer':'qualify',status:'new',note:'',message:contact?data.message:'',productInterest:contact?'':data.productInterest,productName:contact?'General question':catalog.product.name,injectsInsulinDaily:contact?'':data.injectsInsulinDaily,consentVersion:'2026-08-26',consentAt:createdAt,createdAt,notificationStatus:'not-configured',requestHash:fingerprint(data),gsi1pk:'LEAD',gsi1sk:`${createdAt}#${submissionId}`};
  try{
   await db.send(new TransactWriteCommand({TransactItems:[{Put:{TableName:process.env.LEADS_TABLE,Item:lead,ConditionExpression:'attribute_not_exists(id)'}},{Update:{TableName:process.env.RATE_TABLE,Key:{id:rateId},UpdateExpression:'SET expiresAt=:expiry ADD #count :one',ConditionExpression:'attribute_not_exists(#count) OR #count < :limit',ExpressionAttributeNames:{'#count':'count'},ExpressionAttributeValues:{':expiry':Math.floor(now/1000)+7200,':one':1,':limit':10}}}]}));
   return receipt(200);
  }catch(error){
   const after=duplicate((await get()).Item,data);if(after)return receipt(after);
   if(error?.CancellationReasons?.[1]?.Code==='ConditionalCheckFailed')return response(429,origin,{error:'Please try again later or call our team.'},{'Retry-After':'3600'});
   throw error;
  }
 }catch{
  console.error('intake failure',{requestId:event.requestContext?.requestId});
  return response(503,origin,{error:'The submission could not be saved. Please try again.'});
 }
};
