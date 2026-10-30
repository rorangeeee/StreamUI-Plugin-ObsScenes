import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {websocketServer} from './ws-fixture.mjs';
import {probe} from './probe.mjs';
test('OBS plugin authenticates, observes scenes and deduplicates repeated names',async()=>{
 let authenticated=false;const hash=value=>createHash('sha256').update(value).digest('base64');
 const server=await websocketServer({opened(socket,_,send){send(socket,{op:0,d:{authentication:{salt:'salt',challenge:'challenge'}}});},message(value,socket,_,send){
  if(value.op===1){authenticated=value.d.authentication===hash(hash('test-passwordsalt')+'challenge');send(socket,{op:2,d:{negotiatedRpcVersion:1}});}
  if(value.op===6)send(socket,{op:7,d:{requestId:value.d.requestId,requestStatus:{result:true},responseData:{currentProgramSceneName:'Game'}}});
 }});
 const process=await probe({enabled:true,url:server.url,password:'test-password'});
 try{
  await process.next(value=>value.topic==='scene-changed'&&value.data.name==='Game');assert.ok(authenticated);
  for(const socket of server.clients)server.send(socket,{op:5,d:{eventType:'SceneTransitionStarted',eventData:{transitionName:'Fade'}}});
  await process.next(value=>value.topic==='status'&&value.data.transition?.phase==='started');
  for(const name of ['Camera','Camera','Unbound'])for(const socket of server.clients)server.send(socket,{op:5,d:{eventType:'CurrentProgramSceneChanged',eventData:{sceneName:name}}});
  await process.next(value=>value.topic==='scene-changed'&&value.data.name==='Unbound');
  assert.equal(process.records.filter(value=>value.topic==='scene-changed'&&value.data.name==='Camera').length,1);
  assert.ok(!JSON.stringify(process.records).includes('test-password'));
 }finally{await process.stop();server.close();}
});
