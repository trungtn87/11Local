/* eslint-disable @next/next/no-img-element -- Uses bounded variants from the moderated photo API. */
import type { MenuContent } from '@/lib/menu-input';
import { formatPrice } from '@/lib/menu-input';
import styles from './menu.module.css';
export function MenuView({content,publishedAt}:{content:MenuContent;publishedAt?:string}){
  return <section className={styles.publicMenu}><h2>{content.title}</h2>
    {content.photoIds.length>0&&<div className={styles.images}>{content.photoIds.map((id,i)=><a key={id} href={'/api/place-photos/'+id} target="_blank" rel="noopener noreferrer">
      <img loading="lazy" src={'/api/place-photos/'+id+'?size=detail'} alt={'Ảnh menu / bảng giá '+(i+1)}/><span>Xem ảnh đầy đủ</span>
    </a>)}</div>}
    {content.groups.map((group,gi)=><div key={gi}><h3>{group.name}</h3><ul>{group.items.map((item,i)=><li key={i}>
      {item.photoId&& <img loading="lazy" src={'/api/place-photos/'+item.photoId+'?size=card'} alt={item.name}/>}
      <div><strong>{item.name}</strong>{item.description&&<p>{item.description}</p>}{!item.available&&<small>Tạm ngừng phục vụ</small>}{(item.startDate||item.endDate)&&<small>Áp dụng: {item.startDate||'…'} – {item.endDate||'…'}</small>}</div><b>{formatPrice(item)}</b>
    </li>)}</ul></div>)}
    {publishedAt&&<small>Cập nhật: {new Date(publishedAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</small>}
    <p className={styles.note}>Giá do địa điểm cung cấp, có thể thay đổi. Liên hệ địa điểm để xác nhận.</p>
  </section>;
}
