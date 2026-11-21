// Production-bundle browser regression check. APIs and OS sharing are mocked.
// PNG downloads and clipboard copying use real browser APIs. No real credentials.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), http = require('http'), path = require('path'), assert = require('assert'), crypto = require('crypto');
const root = path.resolve(process.argv[2] || 'www');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Pass a production build directory with base href /app/.');
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff'};
const server=http.createServer((req,res)=>{let name=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/^\/app\/?/,''))); if(!name.startsWith(root)){res.writeHead(403).end();return;}if(!fs.existsSync(name)||fs.statSync(name).isDirectory())name=path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');fs.createReadStream(name).pipe(res);});
const user={id:999,userId:999,name:'Sharing Test',username:'sharingtest',email:'test@example.invalid',role:'SELF',relationship:'SELF',dateOfBirth:'2000-01-01',gender:'MALE',petName:'PANDA',avatarName:'18-plus-male-1.webp',onboardingStep:7,onboardingCompleted:true,isOnboardingComplete:true,registrationCompleted:true};
async function open(browser, width, mode='unsupported',rank=4){
 const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
 await context.addInitScript(({user,mode})=>{
 const now=Date.now(),token='eyJhbGciOiJub25lIn0.'+btoa(JSON.stringify({sub:'999',exp:Math.floor(now/1000)+3600,role:'SELF'}))+'.test';
 for(const [k,v] of Object.entries({auth_token:token,user_id:'999',last_activity:String(now),login_time:String(now),user_data:JSON.stringify(user),user:JSON.stringify(user),superme_oidc_user:JSON.stringify(user),superme_oidc_access_token:token,superme_oidc_expires_at:String(now+3600000),superme_oidc_access_token_stored_at:String(now),superme_splash_completed_v1:'true',superme_role_selection_completed_v1:'true'}))localStorage.setItem(k,v);
 window.__shared=[];window.addEventListener('unhandledrejection',e=>console.error('UNHANDLED',JSON.stringify(e.reason,Object.getOwnPropertyNames(e.reason||{}))));
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>!['unsupported','clipboard-denied','clipboard-hang'].includes(mode)});
 Object.defineProperty(navigator,'share',{configurable:true,value:['unsupported','clipboard-denied','clipboard-hang'].includes(mode)?undefined:async payload=>{
  if(mode==='cancel')throw new DOMException('','AbortError');
  if(mode==='denied')throw new DOMException('Blocked by policy','NotAllowedError');
  if(!navigator.userActivation.isActive)throw new Error('No user activation');
  const file=payload.files[0];window.__shared.push({text:payload.text,name:file.name,type:file.type,size:file.size,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('')});
 }});
 if(mode==='expired')Object.defineProperty(navigator,'userActivation',{configurable:true,value:{isActive:false}});
 if(mode==='clipboard-hang')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(()=>{})}});
 if(mode==='clipboard-denied')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});
 },{user,mode});
 const counts={leaderboard:0,referral:0};
 await context.route('https://apis.google.com/js/platform.js', route=>route.fulfill({contentType:'text/javascript',body:"window.gapi={load:(_name,callback)=>callback(),auth2:{init:()=>Promise.resolve(),getAuthInstance:()=>({currentUser:{listen:()=>{}},signOut:()=>Promise.resolve()})}};"}));
 await context.route('https://sso.supermeapp.com/**',route=>{const p=new URL(route.request().url()).pathname;if(p.includes('openid-configuration'))return route.fulfill({json:{issuer:'https://sso.supermeapp.com',authorization_endpoint:'https://sso.supermeapp.com/oauth2/authorize',token_endpoint:'https://sso.supermeapp.com/oauth2/token',jwks_uri:'https://sso.supermeapp.com/oauth2/jwks',end_session_endpoint:'https://sso.supermeapp.com/oauth2/logout',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256']}});return route.fulfill({json:{keys:[]}});});
 await context.route('**/v1/**',route=>{const p=new URL(route.request().url()).pathname;let body={};if(p.endsWith('/leaderboard/coins')){counts.leaderboard++;body={scope:'GLOBAL',state:'OK',group:null,content:[{userId:999,rank,displayName:'Sharing Test',username:'sharingtest',coins:100}],currentUser:{userId:999,rank,displayName:'Sharing Test',coins:100},page:0,size:10,totalElements:10,totalPages:1,hasMore:false};}else if(p.endsWith('/generate-referral')){counts.referral++;if(mode==='referral-hang')return;body={referralCode:'BROWSER999'};}else if(p.includes('/auth/users/'))body=user;return route.fulfill({json:body});});
 if(mode==='image-hang')await context.route('**/assets/figma/leaderboard/share/*.png',()=>{});
 const page=await context.newPage();page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url().split('?')[0]);});const errors=[];page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER ERROR',m.text().slice(0,1000));});
 await page.goto('http://127.0.0.1:4531/app/leaderboard',{waitUntil:'domcontentloaded'});
 try{await page.locator('.share-rank__button').waitFor({timeout:30000});}catch(e){console.log('BOOT FAILURE',page.url(),(await page.locator('body').innerText()).slice(0,1500),errors);throw e;}
 return {context,page,counts,errors};
}
(async()=>{await new Promise(r=>server.listen(4531,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 for(const width of [1440,390]){
  const {context,page,counts,errors}=await open(browser,width);const before=counts.leaderboard;
  const downloadPromise=page.waitForEvent('download');await page.locator('.share-rank__button').click();const download=await downloadPromise;await download.saveAs(`/tmp/rank-share-${width}.png`);
  assert.equal(download.suggestedFilename(),'SuperMeApp-rank-4.png');
  assert.notDeepEqual(fs.readFileSync(`/tmp/rank-share-${width}.png`),fs.readFileSync(path.join(root,'assets/figma/leaderboard/share/rank-4.png')));
  assert.equal(fs.readFileSync(`/tmp/rank-share-${width}.png`).subarray(1,4).toString(),'PNG');
  await page.getByRole('button',{name:'Copy message',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.share-rank__feedback')?.textContent.includes('copied'));
  const message=await page.evaluate(()=>navigator.clipboard.readText());assert(message.includes('BROWSER999'));assert(message.includes('https://go.supermeapp.com/google-early-access'));assert(message.includes('https://go.supermeapp.com/apple-early-access'));assert.equal(message,await page.locator('#rank-share-message').inputValue());
  const again=page.waitForEvent('download');await page.getByRole('link',{name:'Download image'}).click();assert.equal((await again).suggestedFilename(),'SuperMeApp-rank-4.png');
  assert.equal(counts.leaderboard,before+1);assert.equal(counts.referral,1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/rank-share-fallback-${width}.png`});console.log(`PASS ${width}px: real button, personalized PNG download, repeat download, clipboard message, fresh APIs, no overflow/page errors`);await context.close();
 }
 for(const rank of [1,2,3,5,6,7,8,9,10]){const {context,page,errors}=await open(browser,390,'supported',rank);await page.locator('.share-rank__button').click();await page.waitForFunction(()=>window.__shared.length>0);const actual=await page.evaluate(()=>window.__shared[0]);const original=fs.readFileSync(path.join(root,`assets/figma/leaderboard/share/rank-${rank}.png`));assert.equal(actual.name,`SuperMeApp-rank-${rank}.png`);assert.notEqual(actual.hash,crypto.createHash('sha256').update(original).digest('hex'));assert.equal(actual.type,'image/png');assert(actual.text.includes('BROWSER999'));assert.deepEqual(errors,[]);console.log(`PASS rank ${rank}: browser share receives personalized PNG + actual API referral message (Web Share mocked)`);await context.close();}
 for(const [mode,message] of [['referral-hang','referral code could not be loaded in time'],['image-hang','image took too long']]){
  const {context,page}=await open(browser,390,mode);
  await page.locator('.share-rank__button').click();
  await page.waitForFunction(expected=>document.querySelector('.share-rank__feedback')?.textContent.includes(expected),message,{timeout:35000});
  assert.equal(await page.locator('.share-rank__button').isEnabled(),true);
  console.log(`PASS ${mode}: stalled preparation shows retry error and re-enables real button`);
  await context.close();
 }
 const clipboardHang=await open(browser,390,'clipboard-hang');
 const pendingDownload=clipboardHang.page.waitForEvent('download');
 await clipboardHang.page.locator('.share-rank__button').click();await pendingDownload;
 await clipboardHang.page.waitForFunction(()=>!document.querySelector('.share-rank__button').disabled);
 await clipboardHang.page.waitForFunction(()=>document.querySelector('.share-rank__feedback')?.textContent.includes('copy the message manually'));
 assert((await clipboardHang.page.locator('#rank-share-message').inputValue()).includes('BROWSER999'));
 console.log('PASS pending clipboard: download controls usable, manual copying available, button enabled');await clipboardHang.context.close();
 const deniedClipboard=await open(browser,390,'clipboard-denied');const clipboardDownload=deniedClipboard.page.waitForEvent('download');await deniedClipboard.page.locator('.share-rank__button').click();await clipboardDownload;await deniedClipboard.page.waitForFunction(()=>document.querySelector('.share-rank__feedback')?.textContent.includes('copy the message manually'));assert((await deniedClipboard.page.locator('#rank-share-message').inputValue()).includes('BROWSER999'));await deniedClipboard.page.getByRole('button',{name:'Copy message',exact:true}).click();console.log('PASS denied clipboard: selectable complete message and download remain available');await deniedClipboard.context.close();
 const slow=await open(browser,390,'expired',10);await slow.page.locator('.share-rank__button').click();await slow.page.getByRole('button',{name:'Share image',exact:true}).waitFor();await slow.page.evaluate(()=>Object.defineProperty(navigator,'userActivation',{value:{isActive:true},configurable:true}));await slow.page.getByRole('button',{name:'Share image',exact:true}).click();await slow.page.waitForFunction(()=>window.__shared.length===1);console.log('PASS expired activation: explicit Share image click reuses prepared data');await slow.context.close();
 const denied=await open(browser,390,'denied');await denied.page.locator('.share-rank__button').click();await denied.page.getByRole('link',{name:'Download image'}).waitFor();assert((await denied.page.locator('#rank-share-message').inputValue()).includes('BROWSER999'));console.log('PASS denied sharing: image download + message controls remain available');await denied.context.close();
 const cancel=await open(browser,390,'cancel');let downloads=0;cancel.page.on('download',()=>downloads++);await cancel.page.locator('.share-rank__button').click();await cancel.page.waitForFunction(()=>!document.querySelector('.share-rank__button').disabled);await cancel.page.locator('.rank-share-options').waitFor();assert((await cancel.page.locator('#rank-share-message').inputValue()).includes('BROWSER999'));assert.equal(downloads,0);console.log('PASS cancelled sharing: prepared image and message remain available, no unwanted download');await cancel.context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
