import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function probe(settings){
 const directory=path.join(root,'.local','probe-'+randomUUID());await mkdir(directory,{recursive:true});
 const file=path.join(directory,'settings.json');await writeFile(file,JSON.stringify(settings));
 const child=spawn('dotnet',[path.join(root,'tests/Probe/bin/Release/net10.0-windows/Probe.dll'),file],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
 const records=[],pending=[];let errors='';
 child.stderr.on('data',value=>errors+=value);
 createInterface({input:child.stdout}).on('line',line=>{const record=JSON.parse(line);records.push(record);for(const item of [...pending])if(item.match(record)){pending.splice(pending.indexOf(item),1);clearTimeout(item.timer);item.resolve(record);}});
 const next=match=>new Promise((resolve,reject)=>{const found=records.find(match);if(found){resolve(found);return;}const item={match,resolve,reject,timer:setTimeout(()=>{pending.splice(pending.indexOf(item),1);reject(Error('Probe event timeout: '+errors));},12000)};pending.push(item);});
 const stop=async()=>{if(child.exitCode!==null)return;const exited=new Promise(resolve=>child.once('exit',resolve));child.stdin.end('\n');const timer=setTimeout(()=>child.kill(),5000);await exited;clearTimeout(timer);for(const item of pending){clearTimeout(item.timer);item.reject(Error('Probe stopped'));}};
 await next(value=>value.topic==='ready');return{records,next,stop};
}
