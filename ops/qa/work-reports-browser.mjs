// Run the production preview with work-reports-fixture.cjs and a private Chrome on 9238.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:3118';
const user={id:'a7710000-0000-4000-8000-000000000001',email:'fixture@example.invalid',user_metadata:{},app_metadata:{},aud:'authenticated',role:'authenticated'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.fixture';
const cookie='base64-'+encode({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user});
const target=await(await fetch('http://localhost:9238/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();const exceptions=[];
ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.id){const handler=pending.get(message.id);pending.delete(message.id);if(message.error)handler.reject(new Error(message.error.message));else handler.resolve(message.result);}
  else if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);
  else if(message.method==='Page.javascriptDialogOpening')void call('Page.handleJavaScriptDialog',{accept:false});
});
function call(method,params={}){return new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params}));});}
async function evaluate(expression){const result=await call('Runtime.evaluate',{expression:'(async()=>('+expression+'))()',returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Condition timeout: '+expression);}
const frame="document.querySelector('iframe')?.contentDocument";
try{
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setCookies',{cookies:[{name:'sb-otsgzpazmmnfeacysdnl-auth-token',value:cookie,url:base,path:'/',sameSite:'Lax'}]});
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:base+'/work-reports'});
  await wait(`${frame}?.querySelector('#portalSaveBtn')?.hidden === false`);
  assert.equal(await evaluate(`${frame}.querySelector('[data-key=reporter]').textContent`),'کاربر آزمایشی');
  assert.equal(await evaluate(`${frame}.querySelector('[data-key=username]').textContent`),user.email);
  assert.equal(await evaluate(`${frame}.querySelector('[data-key=dept]').textContent`),'فناوری اطلاعات');
  assert.equal(await evaluate(`${frame}.querySelector('[data-key=reporter]').contentEditable`),'false');
  assert.equal(await evaluate(`${frame}.querySelector('#reportDate').disabled`),true);
  const number=await evaluate(`${frame}.querySelector('[data-key=fileNo]').textContent`);
  assert.match(number,/^WR-\d{8}-000042$/);
  await evaluate(`(()=>{const d=${frame};const e=d.querySelector('#volumeBox');e.textContent='گزارش آزمایشی ذخیره و چاپ';e.dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('tbody[data-list=tasks] .ed').textContent='پیاده‌سازی ماژول گزارش کار';d.querySelector('#printEmptyRows').checked=false;d.querySelector('#portalSaveBtn').click();})()`);
  await wait(`${frame}.querySelector('#portalSaveStatus').textContent === 'در سامانه ذخیره شد'`);
  const formUrl=await evaluate(`document.querySelector('iframe').src`);
  assert.equal(await evaluate(`(await fetch(${JSON.stringify(formUrl)})).headers.get('cache-control')`),'private, no-store, max-age=0');
  const revision=await evaluate(`JSON.parse(${frame}.querySelector('#portalContext').textContent).revision`);
  assert(Number.isInteger(revision),'Embedded context contains the initial revision');
  await call('Page.reload');
  await wait(`${frame}?.querySelector('#volumeBox')?.textContent === 'گزارش آزمایشی ذخیره و چاپ'`);
  assert.equal(await evaluate(`${frame}.querySelector('[data-key=fileNo]').textContent`),number);
  assert.equal(await evaluate(`${frame}.querySelector('#printEmptyRows').checked`),false);
  // Reopening today's selected report must reload its saved document, not leave a perpetual loader.
  await evaluate("(()=>{window.previousReportFrame=document.querySelector('iframe');Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('گزارش امروز')).click();})()");
  await wait("document.querySelector('iframe') !== window.previousReportFrame");
  await wait(`${frame}?.querySelector('#volumeBox')?.textContent === 'گزارش آزمایشی ذخیره و چاپ'`);
  await wait("!Array.from(document.querySelectorAll('p[role=status]')).some(p=>p.textContent.includes('فرم در حال'))");
  const savedPayload=await evaluate(`JSON.parse(${frame}.querySelector('#embeddedData').textContent)`);
  const statuses=await evaluate(`(async()=>{
    const content=${JSON.stringify(savedPayload)};
    const response=await fetch(${JSON.stringify(formUrl)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:0,content})});
    return [response.status,await response.json()];
  })()`);
  assert.equal(statuses[0],409,'Stale save must be rejected');
  const denied=await fetch(formUrl,{method:'POST',headers:{cookie:'sb-otsgzpazmmnfeacysdnl-auth-token='+cookie,origin:'https://foreign.invalid','content-type':'application/json'},body:'{}'});
  assert.equal(denied.status,403,'Cross-origin write denied');
  const attack='</script><script>window.reportAttack=true</script>';
  await evaluate(`(()=>{const d=${frame};const e=d.querySelector('#volumeBox');e.textContent=${JSON.stringify(attack)};e.dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('#portalSaveBtn').click();})()`);
  await wait(`${frame}?.querySelector('#portalSaveStatus')?.textContent === 'در سامانه ذخیره شد'`);
  await call('Page.reload');
  await wait(`${frame}?.querySelector('#volumeBox')?.textContent === ${JSON.stringify(attack)}`);
  assert.equal(await evaluate("document.querySelector('iframe').contentWindow.reportAttack === undefined"),true,'Stored report text cannot execute scripts');
  await evaluate(`(()=>{const d=${frame};const e=d.querySelector('#volumeBox');e.textContent='گزارش آزمایشی ذخیره و چاپ';e.dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('#portalSaveBtn').click();})()`);
  await wait(`${frame}.querySelector('#portalSaveStatus').textContent === 'در سامانه ذخیره شد'`);
  const stored=await evaluate(`(await fetch(${JSON.stringify(formUrl+'?download=1')})).text()`);
  assert(stored.includes('گزارش آزمایشی ذخیره و چاپ'));assert(!stored.includes('id="portalContext"'));
  assert.equal(await evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('companyForms.draft')).length`),0,'Private draft must not leak into shared browser storage');
  await call('Page.captureScreenshot',{format:'png'}).then(result=>fs.writeFileSync('/tmp/portal-work-reports-desktop.png',Buffer.from(result.data,'base64')));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await new Promise(resolve=>setTimeout(resolve,200));
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Portal must fit mobile width');
  assert(await evaluate(`${frame}.documentElement.scrollWidth <= document.querySelector('iframe').clientWidth`),'Embedded form must fit mobile width');
  await call('Page.captureScreenshot',{format:'png'}).then(result=>fs.writeFileSync('/tmp/portal-work-reports-mobile.png',Buffer.from(result.data,'base64')));
  // Print the exact form document, without the portal shell.
  await call('Page.navigate',{url:formUrl});
  await wait(`document.querySelector('#volumeBox')?.textContent === 'گزارش آزمایشی ذخیره و چاپ'`);
  await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true}).then(result=>fs.writeFileSync('/tmp/portal-work-report-print.pdf',Buffer.from(result.data,'base64')));
  assert.equal(exceptions.length,0,exceptions.join('\n'));
  console.log('PASS: production preview embedded identity/defaults, save/reopen, stable number, stale-write and CSRF denial, HTML download, no local private drafts, desktop/mobile and A4 PDF.');
}finally{ws.close();}
