import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntakeConfigHandler } from '../functions/intake-config.js';
const origin='https://www.medvillediabetes.com';
async function request(body,fail=false){let reads=0;const handler=createIntakeConfigHandler({origins:[origin],resolveProduct:async()=>{reads++;if(fail)throw Error('private');return{name:'Synthetic product'}},resolveReferral:async()=>true});const res={headers:{},set(k,v){this.headers[k]=v},status(s){this.code=s;return this},json(b){this.body=b},send(){}};await handler({body,method:'POST',get:k=>k==='Origin'?origin:'application/json'},res);return{...res,reads};}
test('public intake metadata exposes only product name and campaign active state',async()=>{const r=await request({productInterest:'dexcom-g7',referralCode:'synthetic'});assert.equal(r.code,200);assert.deepEqual(r.body,{product:{name:'Synthetic product'},referralActive:true});});
test('public intake metadata rejects patient fields, malformed slugs and object prototypes',async()=>{for(const b of [{productInterest:'dexcom-g7',firstName:'Synthetic'},null,[],{productInterest:'../x'},{productInterest:'x',referralCode:{}}]){const r=await request(b);assert.equal(r.code,400);assert.equal(r.reads,0);}});
test('public metadata outage returns no untrusted fallback',async()=>{assert.equal((await request({productInterest:'dexcom-g7'},true)).code,503)});
