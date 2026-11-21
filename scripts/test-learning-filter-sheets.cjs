const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), http = require('http'), path = require('path'), assert = require('assert'), crypto = require('crypto');
const root = process.env.LEARNING_BUILD || '/tmp/superme-learning-revamp-final';
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff'};
const server=http.createServer((req,res)=>{let name=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/^\/app\/?/,''))); if(!name.startsWith(root)){res.writeHead(403).end();return;}if(!fs.existsSync(name)||fs.statSync(name).isDirectory())name=path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');fs.createReadStream(name).pipe(res);});
const user={id:999,userId:999,name:'Sharing Test',username:'sharingtest',email:'test@example.invalid',role:'SELF',relationship:'SELF',dateOfBirth:'2000-01-01',gender:'MALE',petName:'PANDA',avatarName:'18-plus-male-1.webp',onboardingStep:7,onboardingCompleted:true,isOnboardingComplete:true,registrationCompleted:true};
async function open(browser, width, mode='unsupported',rank=4){
 const viewer={...user,petName:['unsupported','parent','child'].includes(mode)?'PANDA':mode.toUpperCase(),...(['parent','child'].includes(mode)?{role:mode.toUpperCase(),relationship:mode.toUpperCase(),dateOfBirth:mode==='child'?'2012-01-01':'2000-01-01'}:{})};
 const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
 await context.addInitScript(({user,mode})=>{
 const now=Date.now(),token='eyJhbGciOiJub25lIn0.'+btoa(JSON.stringify({sub:'999',exp:Math.floor(now/1000)+3600,role:'SELF'}))+'.test';
 for(const [k,v] of Object.entries({auth_token:token,user_id:'999',last_activity:String(now),login_time:String(now),user_data:JSON.stringify(user),user:JSON.stringify(user),superme_oidc_user:JSON.stringify(user),superme_oidc_access_token:token,superme_oidc_expires_at:String(now+3600000),superme_oidc_access_token_stored_at:String(now),superme_splash_completed_v1:'true',superme_role_selection_completed_v1:'true'}))localStorage.setItem(k,v);
 localStorage.setItem('superme_buddy_pet_data',JSON.stringify({petType:mode==='unsupported'?'panda':mode,currentAge:1,activityCounts:{},totalActivityScore:0,currentStreak:0,longestStreak:0,totalDaysOpened:0,lastOpenDate:null,createdAt:new Date().toISOString()}));window.__shared=[];window.addEventListener('unhandledrejection',e=>console.error('UNHANDLED',JSON.stringify(e.reason,Object.getOwnPropertyNames(e.reason||{}))));
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>mode!=='unsupported'});
 Object.defineProperty(navigator,'share',{configurable:true,value:mode==='unsupported'?undefined:async payload=>{
  if(mode==='cancel')throw new DOMException('','AbortError');
  if(mode==='denied')throw new DOMException('Blocked by policy','NotAllowedError');
  if(!navigator.userActivation.isActive)throw new Error('No user activation');
  const file=payload.files[0];window.__shared.push({text:payload.text,name:file.name,type:file.type,size:file.size,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('')});
 }});
 if(mode==='expired')Object.defineProperty(navigator,'userActivation',{configurable:true,value:{isActive:false}});
 if(mode==='clipboard-denied')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});
 },{user:viewer,mode});
 const counts={leaderboard:0,referral:0};
 await context.route('https://apis.google.com/js/platform.js', route=>route.fulfill({contentType:'text/javascript',body:"window.gapi={load:(_name,callback)=>callback(),auth2:{init:()=>Promise.resolve(),getAuthInstance:()=>({currentUser:{listen:()=>{}},signOut:()=>Promise.resolve()})}};"}));
 await context.route('https://sso.supermeapp.com/**',route=>{const p=new URL(route.request().url()).pathname;if(p.includes('openid-configuration'))return route.fulfill({json:{issuer:'https://sso.supermeapp.com',authorization_endpoint:'https://sso.supermeapp.com/oauth2/authorize',token_endpoint:'https://sso.supermeapp.com/oauth2/token',jwks_uri:'https://sso.supermeapp.com/oauth2/jwks',end_session_endpoint:'https://sso.supermeapp.com/oauth2/logout',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256']}});return route.fulfill({json:{keys:[]}});});
 const categories=['Education','How-to','Arts & Creativity','Entertainment','Fitness','Animals & Nature','Food','STEM','Motivational','Gaming','People & Vlogs','Productivity'].map((categoryName,i)=>({id:i+1,categoryName,pendingCount:1}));
 const challenge=(id,done=false)=>({challengeId:id,slug:'quiz-'+id,name:'Quiz '+id,description:'Test your knowledge',category:'QUIZ',difficulty:'HARD',difficultyDisplay:'Hard',coins:50,coinsForCorrectAnswer:5,trophies:1,timeDuration:'5 min',thumbnailImageUrl:new URL('assets/learnings/tab-quiz.webp', process.env.LEARNING_ASSET_BASE || 'http://127.0.0.1:4200/').href,totalQuestions:5,questions:[],userLearningStatus:done?'COMPLETED':'PENDING'});
 const article=(id,done=false)=>({id,slug:'article-'+id,title:'Science-backed study hacks '+id,description:'Study better',thumbnailUrl:new URL('assets/learnings/tab-articles.webp', process.env.LEARNING_ASSET_BASE || 'http://127.0.0.1:4200/').href,coins:10,timeDuration:'SHORT',tags:['study'],alreadyRead:done});
 await context.route('**/v1/**',route=>{const url=new URL(route.request().url()),p=url.pathname;let body={};
 if(p.endsWith('/challenges/categories/summary')) body=categories;
 else if(p.endsWith('/articles/categories')) body=[{id:3,categoryName:'Education',pendingCount:1,completedCount:1}];
 else if(p.endsWith('/category'))body=[{id:4,categoryName:'Digital Life',status:'ACTIVE',courseCount:2}];
 else if(p.endsWith('/courses/by-category'))body=[{id:301,courseName:'Spend Smart',noOfLessons:15,difficulty:'BEGINNER',totalCoins:100,duration:30,isCourseCompleted:false,thumbnailUrl:new URL('assets/learnings/tab-masterclass.webp', process.env.LEARNING_ASSET_BASE || 'http://127.0.0.1:4200/').href},{id:302,courseName:'Digital Skills',noOfLessons:12,totalCoins:90,duration:25,isCourseCompleted:true}];
 else if(p.endsWith('/challenges'))body=url.searchParams.get('category')==='Education'?[challenge(101),challenge(102,true)]:[challenge(103),challenge(104,true)];
 else if(p.match(/\/challenges\/\d+$/))body=challenge(Number(p.split('/').pop()));
 else if(p.endsWith('/articles'))body={pendingArticles:[article(201)],completedArticles:[article(202,true)]};
 else if(p.includes('/auth/users/'))body=viewer;
 else if(p.includes('stats'))body={coins:300};
 return route.fulfill({json:body});});
 const page=await context.newPage();page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url().split('?')[0]);});const errors=[];page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER ERROR',m.text().slice(0,1000));});
 await page.goto((process.env.LEARNING_TEST_URL || 'http://127.0.0.1:4200/content?tab=quizzes'),{waitUntil:'domcontentloaded'});
 try{await page.locator(mode==='parent'?'.parent-learning-page':'app-learnings-landing .lp-card').first().waitFor({timeout:30000});}catch(e){console.log('BOOT FAILURE',page.url(),(await page.locator('body').innerText()).slice(0,1500),errors);throw e;}
 await page.locator('.superme-native-splash').waitFor({state:'hidden',timeout:20000});await page.evaluate(()=>document.fonts.ready);return {context,page,counts,errors};
}
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try {
for(const width of [320,390,768,1440]) {
 const {context,page,errors}=await open(browser,width);
 await page.getByRole('button',{name:'Filter by category',exact:true}).click();
 const modal=page.locator('ion-modal.lp-filter-modal');await modal.getByRole('heading',{name:'Choose a category'}).waitFor();
 await page.waitForTimeout(400);
 const geometry=await modal.evaluate(e=>{const b=e.shadowRoot.querySelector('[part=content]').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,vw:innerWidth,vh:innerHeight};});
 if(width>=768){assert(Math.abs(geometry.y-(geometry.vh-geometry.h)/2)<5);assert(Math.abs(geometry.x-(geometry.vw-geometry.w)/2)<5);assert(geometry.w<=480);}else assert(Math.abs(geometry.y+geometry.h-geometry.vh)<5);
 assert.equal(await modal.locator('.lp-category-options > button').count(),13);
 assert.equal(await modal.locator('.lp-category-options').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),4);
 assert.equal(await modal.locator('.lp-sheet').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await page.screenshot({path:`/tmp/learning-category-sheet-${width}.png`});
 await modal.getByRole('button',{name:'Education',exact:true}).click();
 await page.waitForTimeout(400);assert.equal(await page.locator('.lp-list li').count(),2);
 await page.getByRole('button',{name:'Filter by progress',exact:true}).click();await modal.getByRole('radio',{name:'Pending',exact:true}).waitFor();
 await page.waitForTimeout(400);await page.screenshot({path:`/tmp/learning-progress-sheet-${width}.png`});
 await modal.getByRole('radio',{name:'Pending',exact:true}).click();await page.waitForTimeout(400);assert.equal(await page.locator('.lp-list li').count(),1);
 await page.getByRole('button',{name:'Filter by progress',exact:true}).click();await modal.getByRole('radio',{name:'Pending',exact:true}).waitFor();assert.equal(await modal.getByRole('radio',{name:'Pending',exact:true}).getAttribute('aria-checked'),'true');await modal.getByRole('button',{name:'Close filters'}).click();await page.waitForTimeout(400);assert.equal(await page.locator('.lp-list li').count(),1);
 for(const tab of ['articles','masterclass']) {
  await page.locator('#learning-tab-'+tab).click();
  await page.getByRole('button',{name:'Filter by category',exact:true}).click();await modal.getByRole('heading',{name:'Choose a category'}).waitFor();
  assert.equal(await modal.locator('.lp-category-options > button').count(),2);
  await modal.getByRole('button',{name:'Close filters'}).click();await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Filter by progress',exact:true}).click();await modal.getByRole('radio',{name:'Completed',exact:true}).click();await page.waitForTimeout(400);
  assert.equal(await page.locator('.lp-list li').count(),1);
 }
 assert.deepEqual(errors,[]);console.log('PASS',width,'category grid, icons, progress selection, dismissal and actual filtered results');await context.close();
}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
