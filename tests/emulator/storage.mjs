import {after,before,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {ref,uploadBytes,deleteObject} from 'firebase/storage';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-medville-test',storage:{host:'127.0.0.1',port:9196,rules:await readFile('storage.rules','utf8')}})});
after(async()=>{await env?.cleanup()});
test('image storage enforces features and MIME types on both create and update',async()=>{
 const db=env.authenticatedContext('synthetic-blog',{role:'marketing',features:['blog']}).storage();
 const img=ref(db,'site/blog/synthetic.webp');
 await assertSucceeds(uploadBytes(img,new Uint8Array([1]),{contentType:'image/webp'}));
 await assertFails(uploadBytes(img,new Uint8Array([1]),{contentType:'text/html'}));
 await assertFails(uploadBytes(ref(db,'site/products/forbidden.webp'),new Uint8Array([1]),{contentType:'image/webp'}));
 await assertFails(uploadBytes(ref(db,'site/pages/forbidden.webp'),new Uint8Array([1]),{contentType:'image/webp'}));
 await assertSucceeds(deleteObject(img));
});
test('anonymous and roleless claims cannot upload images',async()=>{for(const ctx of [env.unauthenticatedContext(),env.authenticatedContext('roleless',{features:['content']})])await assertFails(uploadBytes(ref(ctx.storage(),'site/pages/forbidden.webp'),new Uint8Array([1]),{contentType:'image/webp'}));});
