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

test('a Stinger destination is reported at transition start with the original clock, without replaying at video end', async () => {
 let current='Game', pendingProbe=null, deferProbe=false, requests=0;
 const event=(server,type)=>{for(const socket of server.clients)server.send(socket,{op:5,d:{eventType:type,eventData:{transitionName:'Delay'}}});};
 const reply=(send,socket,value,name)=>send(socket,{op:7,d:{requestId:value.d.requestId,requestStatus:{result:true},responseData:{sceneName:name}}});
 const server=await websocketServer({opened(socket,_,send){send(socket,{op:0,d:{}});},message(value,socket,_,send){
  if(value.op===1){assert.equal(value.d.eventSubscriptions&16,16);send(socket,{op:2,d:{}});}
  if(value.op===6){requests++;if(deferProbe){pendingProbe={send,socket,value};}else reply(send,socket,value,requests===2?'Game':current);}
 }});
 const process=await probe({enabled:true,url:server.url});
 try{
  await process.next(value=>value.topic==='scene-changed'&&value.data.name==='Game');
  current='Camera';event(server,'SceneTransitionStarted');
  const started=await process.next(value=>value.topic==='status'&&value.data.transition?.phase==='started');
  const changed=await process.next(value=>value.topic==='scene-changed'&&value.data.name==='Camera');
  assert.ok(requests>=3,'start queries the program scene and retries a response that raced the OBS UI thread');
  assert.equal(changed.data.id,started.data.transition.id);
  assert.equal(changed.data.startedAt,started.data.transition.startedAt);
  for(const socket of server.clients)server.send(socket,{op:5,d:{eventType:'CurrentProgramSceneChanged',eventData:{sceneName:'Camera'}}});
  event(server,'SceneTransitionEnded');event(server,'SceneTransitionVideoEnded');
  await process.next(value=>value.topic==='status'&&value.data.transition?.phase==='video-ended');
  assert.equal(process.records.filter(value=>value.topic==='scene-changed'&&value.data.name==='Camera').length,1);
  // Simulate a health/end query which was still reading the old destination.
  deferProbe=true;event(server,'SceneTransitionEnded');
  for(let i=0;i<100&&!pendingProbe;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(pendingProbe);
  const stale=pendingProbe;pendingProbe=null;
  deferProbe=false;current='Game';event(server,'SceneTransitionStarted');
  await process.next(value=>value.topic==='scene-changed'&&value.data.name==='Game'&&value!==process.records.find(item=>item.topic==='scene-changed'));
  reply(stale.send,stale.socket,stale.value,'Camera');
  event(server,'SceneTransitionVideoEnded');
  await process.next(value=>value.topic==='status'&&value.data.scene==='Game'&&value.data.transition?.phase==='video-ended');
  assert.equal(process.records.filter(value=>value.topic==='scene-changed'&&value.data.name==='Camera').length,1,'a stale query cannot restore the previous scene');
 }finally{await process.stop();server.close();}
});
