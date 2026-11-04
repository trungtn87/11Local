import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMenu,formatPrice,currentMenu,menuPhotoIds,positiveVersion } from './menu-input.ts';
const entry=()=>({name:'Phở bò',description:'Tô thường',priceType:'fixed',priceMin:35000,priceMax:null,unit:'tô',available:true,startDate:'',endDate:'',photoId:null});
const menu=()=>({title:'Menu',photoIds:[],groups:[{name:'Món chính',kind:'menu',items:[entry()]}]});
test('price modes retain only relevant amounts; zero is an explicit fixed price',()=>{
  for(const type of ['fixed','from','range','free','contact']){
    const data=menu();Object.assign(data.groups[0].items[0],{priceType:type,priceMin:0,priceMax:50000});
    const i=parseMenu(data).groups[0].items[0];assert.equal(i.priceType,type);
    assert.equal(i.priceMin,['free','contact'].includes(type)?null:0);
    assert.equal(i.priceMax,type==='range'?50000:null);
  }
  const i=parseMenu(menu()).groups[0].items[0];assert.equal(formatPrice(i),'35.000 đ / tô');
  assert.equal(formatPrice({...i,priceType:'contact'}),'Liên hệ / tô');
});
test('reject malformed prices, missing names, invalid dates and excessive content',()=>{
  for(const patch of [{priceMin:-1},{priceMin:1.5},{priceMin:'35000'},{priceMin:NaN},{name:''},{priceType:'range',priceMin:50,priceMax:20},{startDate:'2026-02-30'},{startDate:'2026-11-05',endDate:'2026-11-04'},{available:'true'}]){
    const data=menu();Object.assign(data.groups[0].items[0],patch);assert.throws(()=>parseMenu(data));
  }
  const big=menu();big.groups[0].items=Array.from({length:201},entry);assert.throws(()=>parseMenu(big));
  assert.throws(()=>parseMenu({title:'Menu',groups:[],photoIds:[]}));
  for(const v of [0,-1,'1',1.2,null])assert.throws(()=>positiveVersion(v));
});
test('image-only menus work but foreign URL and duplicate references do not',()=>{
  const id='12345678-1234-4123-8123-123456789abc';
  assert.equal(parseMenu({title:'Bảng giá',photoIds:[id],groups:[]}).photoIds[0],id);
  assert.throws(()=>parseMenu({title:'Menu',photoIds:['https://bad.test/a.jpg'],groups:[]}));
  assert.throws(()=>parseMenu({title:'Menu',photoIds:[id,id],groups:[]}));
  const data=menu();Object.assign(data.groups[0].items[0],{photoId:id});
  assert.deepEqual(menuPhotoIds(parseMenu(data)),[id]);
});
test('public date filtering includes boundary days and preserves temporarily unavailable state',()=>{
  const data=menu();data.groups[0].items=[{...entry(),startDate:'2026-11-04',endDate:'2026-11-04',available:false}];
  const content=parseMenu(data);
  assert.equal(currentMenu(content,'2026-11-04').groups[0].items[0].available,false);
  assert.equal(currentMenu(content,'2026-11-05').groups.length,0);
  assert.equal(content.groups.length,1);
});
test('revision editing respects author, source, pending state and revoked actor',async()=>{
  const {canEditMenuRevision}=await import('./menu-input.ts');
  const r={status:'draft',source:'owner',submitted_by:'owner-a',version:1};
  assert.equal(canEditMenuRevision(r,false,'owner-a'),true);
  assert.equal(canEditMenuRevision(r,false,'owner-b'),false);
  assert.equal(canEditMenuRevision(r,false,null),false);
  assert.equal(canEditMenuRevision(r,true,null),false);
  assert.equal(canEditMenuRevision({...r,status:'pending'},false,'owner-a'),false);
  assert.equal(canEditMenuRevision({...r,status:'needs_info'},false,'owner-a'),true);
  assert.equal(canEditMenuRevision({...r,source:'admin'},true,null),true);
});
test('moderation rejects stale writes and repeat approvals; permits clearing abandoned drafts with reason',async()=>{
  const {parseMenuDecision,assertMenuDecision}=await import('./menu-input.ts');
  const decision=parseMenuDecision({action:'approve',expectedVersion:2});
  assert.doesNotThrow(()=>assertMenuDecision({status:'pending',version:2},decision));
  for(const status of ['approved','rejected','draft','needs_info'])assert.throws(()=>assertMenuDecision({status,version:2},decision));
  assert.throws(()=>assertMenuDecision({status:'pending',version:3},decision),/STALE_VERSION/);
  assert.throws(()=>parseMenuDecision({action:'reject',expectedVersion:1,note:''}));
  assert.throws(()=>parseMenuDecision({action:'needs_info',expectedVersion:1,note:'\u0000'}));
  assert.doesNotThrow(()=>assertMenuDecision({status:'draft',version:1},parseMenuDecision({action:'reject',expectedVersion:1,note:'Hủy bản nháp cũ'})));
});
