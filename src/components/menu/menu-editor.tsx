'use client';
/* eslint-disable @next/next/no-img-element -- Bounded image variants are served by the existing moderated photo API. */
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { MenuContent,MenuGroup,MenuItem } from '@/lib/menu-input';
import { MenuView } from './menu-view';
import styles from './menu.module.css';
type Revision={id:string;version:number;status:string;content:MenuContent;decision_note:string|null;created_at:string};
type Data={place:{id:string;name:string;slug:string};menu:{version:number;content:MenuContent|null;hidden:boolean;published_at:string|null};open:Revision|null;revisions:Revision[];photos:{id:string;caption:string|null}[];admin:boolean;canEdit:boolean};
const empty=():MenuContent=>({title:'Menu và bảng giá',photoIds:[],groups:[]});
const item=():MenuItem=>({name:'',description:'',priceType:'fixed',priceMin:0,priceMax:null,unit:'',available:true,startDate:'',endDate:'',photoId:null});
const statuses:Record<string,string>={draft:'Bản nháp',pending:'Chờ duyệt',needs_info:'Cần bổ sung',approved:'Đã duyệt',rejected:'Đã từ chối'};
const errors:Record<string,string>={LOGIN_REQUIRED:'Hãy đăng nhập Google hoặc Admin trước.',FORBIDDEN:'Bạn không có quyền thực hiện thao tác này.',STALE_VERSION:'Dữ liệu đã thay đổi. Hãy tải lại trước khi sửa hoặc duyệt.',PENDING_REVISION:'Đã có bản đang chờ duyệt.',PHOTOS_NOT_APPROVED:'Ảnh chưa được duyệt hoặc không thuộc địa điểm này.',PERMISSION_REVOKED:'Người gửi đã bị thu hồi quyền quản lý.',PLACE_NOT_EDITABLE:'Địa điểm hiện không cho phép chủ quán chỉnh sửa.',INVALID_GROUP:'Mỗi nhóm cần có ít nhất một mục.',INVALID_GROUPS:'Menu có tối đa 20 nhóm.',INVALID_ITEM_LIMIT:'Menu có tối đa 200 mục.',INVALID_PHOTOS:'Chọn tối đa 10 ảnh menu, không chọn trùng ảnh.',ALREADY_REVIEWED:'Bản cập nhật đã được xử lý. Hãy tải lại.',INVALID_EMPTY_MENU:'Hãy thêm ít nhất một mục hoặc ảnh menu.',INVALID_PRICE_RANGE:'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.',INVALID_PRICE:'Giá phải là số nguyên từ 0 đến 1 tỷ đồng.',INVALID_DATE_RANGE:'Ngày kết thúc phải sau ngày bắt đầu.',INVALID_NOTE:'Hãy nhập lý do (tối đa 1.200 ký tự).',INVALID_TEXT:'Tên hoặc mô tả bị thiếu, quá dài hoặc không hợp lệ.'};
async function read(url:string,options?:RequestInit){const r=await fetch(url,{cache:'no-store',...options});const b=await r.json();if(!r.ok)throw new Error(b.error||'UNAVAILABLE');return b;}
export function MenuEditor({placeId}:{placeId:string}){
  const [data,setData]=useState<Data|null>(null);const [content,setContent]=useState<MenuContent>(empty);
  const [loadKey,setLoadKey]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [note,setNote]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    read('/api/managed-places/'+placeId+'/menu',{signal:controller.signal})
      .then((body:Data)=>{setData(body);setContent(body.open?.content||body.menu.content||empty());setError('');})
      .catch(e=>{if(e.name!=='AbortError')setError(errors[e.message]||'Chưa tải được menu. Vui lòng thử lại.');});
    return()=>controller.abort();
  },[placeId,loadKey]);
  const endpoint='/api/managed-places/'+placeId+'/menu';
  const patchGroup=(index:number,patch:Partial<MenuGroup>)=>setContent(c=>({...c,groups:c.groups.map((g,i)=>i===index?{...g,...patch}:g)}));
  const patchItem=(group:number,index:number,patch:Partial<MenuItem>)=>setContent(c=>({...c,groups:c.groups.map((g,i)=>i===group?{...g,items:g.items.map((v,j)=>j===index?{...v,...patch}:v)}:g)}));
  const reorder=(group:number,index:number,offset:number)=>setContent(c=>({...c,groups:c.groups.map((g,i)=>{if(i!==group)return g;const items=[...g.items];[items[index],items[index+offset]]=[items[index+offset],items[index]];return {...g,items};})}));
  async function operation(url:string,method:string,payload:unknown,success:string){
    if(busy)return;setBusy(true);setError('');setMessage('');
    try{await read(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});setMessage(success);setLoadKey(k=>k+1);}
    catch(e){const code=(e as Error).message;setError(errors[code]||'Không lưu được thay đổi. Hãy kiểm tra thông tin và thử lại.');}
    finally{setBusy(false);}
  }
  const save=(action:'save'|'submit')=>data&&operation(endpoint,'PUT',{action,content,expectedVersion:data.menu.version,revisionId:data.open?.id??null,revisionVersion:data.open?.version??null},action==='save'?'Đã lưu bản nháp.':'Đã gửi duyệt. Bản đang công khai tiếp tục hiển thị.');
  const decide=(action:string)=>data?.open&&operation('/api/admin/menus/'+data.open.id+'/decision','POST',{action,note,expectedVersion:data.open.version},'Đã xử lý bản cập nhật.');
  async function upload(file:File){
    if(!data||busy)return;setBusy(true);setError('');
    try{
      const form=new FormData();form.set('file',file);form.set('caption','Ảnh menu / bảng giá');
      const result=await read(data.admin?'/api/admin/places/'+placeId+'/photos':'/api/managed-places/'+placeId+'/photos',{method:'POST',body:form});
      if(data.admin&&result.photo?.id)setData({...data,photos:[{id:result.photo.id,caption:'Ảnh menu / bảng giá'},...data.photos]});
      setMessage(data.admin?'Đã tải ảnh. Chọn ảnh mới bên dưới để đưa vào menu.':'Đã gửi ảnh chờ duyệt. Sau khi Admin duyệt ảnh, tải lại để chọn vào menu.');
    }catch{setError('Không tải được ảnh. Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 10MB.');}
    finally{setBusy(false);}
  }
  return <main className={styles.editor}>
    <header><a href={data?.admin?'/admin/menu':'/quan-ly/'+placeId}>← Quay lại quản lý</a><h1>Menu và bảng giá</h1><h2>{data?.place.name}</h2><p>Bản chỉnh sửa chỉ công khai sau khi Admin duyệt.</p></header>
    <div className={styles.actions}><button disabled={busy} onClick={()=>{if(confirm('Tải lại sẽ bỏ phần chưa lưu. Tiếp tục?'))setLoadKey(k=>k+1);}}>Tải lại</button><Link href="/admin">Đăng nhập Admin</Link><Link href="/dang-nhap">Đăng nhập Google</Link></div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status">{message}</p>}
    {!data&&!error&&<p>Đang tải menu…</p>}
    {data&&<>
      <p>Trạng thái: <strong>{data.open?statuses[data.open.status]:data.menu.content?(data.menu.hidden?'Đang ẩn':'Đã công khai'):'Chưa có menu'}</strong></p>
      {data.open?.decision_note&&<blockquote>Phản hồi Admin: {data.open.decision_note}</blockquote>}
      <fieldset disabled={busy||!data.canEdit}>
        <label>Tiêu đề<input maxLength={120} value={content.title} onChange={e=>setContent({...content,title:e.target.value})}/></label>
        <h3>Ảnh menu / bảng giá gốc</h3><p>Chọn ảnh đã được duyệt của địa điểm. Có thể tải ảnh mới để gửi duyệt trước.</p>
        <input aria-label="Tải ảnh menu" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/>
        <div className={styles.photos}>{data.photos.map(p=><label key={p.id}>
          <img loading="lazy" src={'/api/place-photos/'+p.id+'?size=card'} alt={p.caption||'Ảnh địa điểm'}/>
          <span><input type="checkbox" checked={content.photoIds.includes(p.id)} onChange={e=>setContent({...content,photoIds:e.target.checked?[...content.photoIds,p.id]:content.photoIds.filter(id=>id!==p.id)})}/> Chọn ảnh menu</span>
        </label>)}</div>
        {content.groups.map((group,gi)=><section key={gi} className={styles.group}>
          <div className={styles.row}><label>Tên nhóm<input value={group.name} maxLength={100} onChange={e=>patchGroup(gi,{name:e.target.value})}/></label>
            <label>Loại<select value={group.kind} onChange={e=>patchGroup(gi,{kind:e.target.value as MenuGroup['kind']})}>{Object.entries({menu:'Món ăn / đồ uống',services:'Dịch vụ',tickets:'Giá vé',rooms:'Giá phòng',prices:'Giá tham khảo'}).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <button onClick={()=>{if(confirm('Xóa nhóm này khỏi bản nháp?'))setContent({...content,groups:content.groups.filter((_,i)=>i!==gi)});}}>Xóa nhóm</button>
            <button disabled={gi===0} onClick={()=>{const groups=[...content.groups];[groups[gi-1],groups[gi]]=[groups[gi],groups[gi-1]];setContent({...content,groups});}}>↑ Nhóm</button>
          </div>
          {group.items.map((v,ii)=><div key={ii} className={styles.item}>
            <div className={styles.row}><label>Tên mục<input maxLength={160} value={v.name} onChange={e=>patchItem(gi,ii,{name:e.target.value})}/></label><label>Đơn vị tính<input maxLength={40} placeholder="món, người, đêm…" value={v.unit} onChange={e=>patchItem(gi,ii,{unit:e.target.value})}/></label></div>
            <label>Mô tả<textarea maxLength={500} value={v.description} onChange={e=>patchItem(gi,ii,{description:e.target.value})}/></label>
            <div className={styles.row}><label>Kiểu giá<select value={v.priceType} onChange={e=>patchItem(gi,ii,{priceType:e.target.value as MenuItem['priceType'],priceMin:v.priceMin??0,priceMax:v.priceMax??0})}>{Object.entries({fixed:'Giá cố định',from:'Giá từ',range:'Khoảng giá',free:'Miễn phí',contact:'Liên hệ'}).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
              {['fixed','from','range'].includes(v.priceType)&&<label>{v.priceType==='range'?'Giá thấp nhất':'Giá (VND)'}<input type="number" min="0" max="1000000000" step="1" value={v.priceMin??''} onChange={e=>patchItem(gi,ii,{priceMin:e.target.value===''?null:Number(e.target.value)})}/></label>}
              {v.priceType==='range'&&<label>Giá cao nhất<input type="number" min="0" max="1000000000" step="1" value={v.priceMax??''} onChange={e=>patchItem(gi,ii,{priceMax:e.target.value===''?null:Number(e.target.value)})}/></label>}
            </div>
            <div className={styles.row}><label>Áp dụng từ<input type="date" value={v.startDate} onChange={e=>patchItem(gi,ii,{startDate:e.target.value})}/></label><label>Đến ngày<input type="date" value={v.endDate} onChange={e=>patchItem(gi,ii,{endDate:e.target.value})}/></label>
              <label>Ảnh minh họa<select value={v.photoId||''} onChange={e=>patchItem(gi,ii,{photoId:e.target.value||null})}><option value="">Không có ảnh</option>{data.photos.map((p,i)=><option key={p.id} value={p.id}>{p.caption||'Ảnh '+(i+1)}</option>)}</select></label>
            </div>
            <label><span><input type="checkbox" checked={v.available} onChange={e=>patchItem(gi,ii,{available:e.target.checked})}/> Còn phục vụ</span></label>
            <div className={styles.actions}><button onClick={()=>patchGroup(gi,{items:group.items.filter((_,i)=>i!==ii)})}>Xóa mục</button><button disabled={ii===0} onClick={()=>reorder(gi,ii,-1)}>↑</button><button disabled={ii===group.items.length-1} onClick={()=>reorder(gi,ii,1)}>↓</button></div>
          </div>)}
          <button onClick={()=>patchGroup(gi,{items:[...group.items,item()]})}>+ Thêm mục</button>
        </section>)}
        <button onClick={()=>setContent({...content,groups:[...content.groups,{name:'Nhóm mới',kind:'menu',items:[item()]}]})}>+ Thêm nhóm</button>
        <div className={styles.actions}><button onClick={()=>void save('save')}>Lưu nháp</button><button className={styles.primary} onClick={()=>void save('submit')}>Gửi Admin duyệt</button></div>
      </fieldset>
      {!data.canEdit&&<p>Bản đang được xử lý hoặc thuộc người quản lý khác. Bạn có thể xem nội dung bên dưới.</p>}
      {data.admin&&data.open&&<section className={styles.group}><h3>Kiểm duyệt</h3><label>Phản hồi / lý do<textarea maxLength={1200} value={note} onChange={e=>setNote(e.target.value)}/></label><div className={styles.actions}>
        {data.open.status==='pending'&&<><button disabled={busy} onClick={()=>void decide('approve')}>Duyệt và công khai</button><button disabled={busy} onClick={()=>void decide('needs_info')}>Yêu cầu bổ sung</button></>}
        <button disabled={busy} onClick={()=>void decide('reject')}>Từ chối bản cập nhật</button>
      </div></section>}
      {data.admin&&data.menu.content&&<button disabled={busy} onClick={()=>void operation('/api/admin/menus/'+placeId,'PATCH',{expectedVersion:data.menu.version,hidden:!data.menu.hidden},'Đã đổi trạng thái hiển thị.')}>{data.menu.hidden?'Khôi phục menu công khai':'Ẩn menu công khai'}</button>}
      <details><summary>Xem trước bản đang chỉnh sửa</summary><MenuView content={content}/></details>
      {data.menu.content&&<details><summary>Bản đang công khai {data.menu.hidden?'(đang ẩn)':''}</summary><MenuView content={data.menu.content} publishedAt={data.menu.published_at||undefined}/></details>}
      <h3>Lịch sử cập nhật</h3>{data.revisions.map(r=><details key={r.id}><summary>{statuses[r.status]} · {new Date(r.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</summary>{r.decision_note&&<p>{r.decision_note}</p>}<MenuView content={r.content}/></details>)}
      <p>Ảnh do cộng đồng đóng góp được giữ riêng; thao tác menu không xóa ảnh địa điểm.</p>
    </>}
  </main>;
}
