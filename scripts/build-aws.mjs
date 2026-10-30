import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
let template=(await readFile('aws/medville-phi-stack.yaml','utf8')).replace(/\r\n/g,'\n');
for(const [resource,name] of [['IntakeFunction','intake'],['AdminFunction','admin'],['AlertsFunction','alerts'],['CompanyEmailEventFunction','notificationEvent']]){
 const result=await build({entryPoints:[`aws/src/${name}.cjs`],bundle:true,platform:'node',target:'node22',format:'cjs',external:['@aws-sdk/*'],write:false});
 const start=template.indexOf('        ZipFile: |',template.indexOf(`  ${resource}:`));
 const offset=template.slice(start).search(/\n  [A-Za-z]\w*:\n/);
 const end=offset<0?-1:start+offset;
 if(start<0||end<0||!template.includes(`  ${resource}:`))throw new Error('Missing template resource: '+resource);
 template=template.slice(0,start)+'        ZipFile: |\n'+result.outputFiles[0].text.trimEnd().split('\n').map(x=>x?'          '+x:'').join('\n')+'\n'+template.slice(end);
}
if(process.argv.includes('--check')){
 if(template!==(await readFile('aws/medville-phi-stack.yaml','utf8')).replace(/\r\n/g,'\n'))throw new Error('AWS template differs from source. Run npm run build:aws.');
}else await writeFile('aws/medville-phi-stack.yaml',template);
