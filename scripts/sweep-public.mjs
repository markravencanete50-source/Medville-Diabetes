import {readFile,writeFile} from 'node:fs/promises';
const base='https://medvillediabetes.com';
const sitemap=await readFile('dist/sitemap.xml','utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const results=[],assets=new Set(),brokenLinks=new Set();
const paths=new Set(urls.map(u=>new URL(u).pathname));
for(let i=0;i<urls.length;i+=5){await Promise.all(urls.slice(i,i+5).map(async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});const html=await r.text();const title=html.match(/<title>(.*?)<\/title>/)?.[1];results.push({url,status:r.status,title});for(const m of html.matchAll(/(?:src|href)="([^"<>]+)"/g)){const v=m[1].replaceAll('&amp;','&');if(v.startsWith('/assets/')||v.startsWith('https://res.cloudinary.com/'))assets.add(new URL(v,base).href);if(v.startsWith('/')&&!v.startsWith('//')){const p=new URL(v,base).pathname;if(!paths.has(p)&&p!=='/admin'&&!/\.[a-z0-9]{2,5}$/i.test(p))brokenLinks.add(p);}}}));}
const assetResults=[];const list=[...assets];
for(let i=0;i<list.length;i+=6)await Promise.all(list.slice(i,i+6).map(async url=>{try{const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)});assetResults.push({url,status:r.status})}catch{assetResults.push({url,status:'error'})}}));
const report={pages:results.length,duplicateTitles:results.filter((r,i)=>results.findIndex(x=>x.title===r.title)!==i),pageFailures:results.filter(r=>r.status!==200||!r.title),brokenInternalLinks:[...brokenLinks],assets:assetResults.length,assetFailures:assetResults.filter(r=>r.status!==200),results};
await writeFile('../sweep-public-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(report.pageFailures.length||report.assetFailures.length||report.brokenInternalLinks.length||report.duplicateTitles.length)process.exitCode=1;
