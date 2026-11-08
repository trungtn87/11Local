import Link from "next/link";
import {GauLogoMark} from "@/components/gau-mascot";
export function SiteNav(){
const nav=[["/","Trang chủ"],["/album","Album"],["/ban-do","Bản đồ"],["/dong-thoi-gian","Gấu lớn lên"],["/dong-gop","Đăng ảnh"]];
return <><header className="site-header"><Link className="brand" href="/"><GauLogoMark size={46}/><span>Nhà của Gấu<small>Nơi lưu giữ yêu thương</small></span></Link><nav className="site-links">{nav.map(([href,name])=><Link key={href} href={href}>{name}</Link>)}</nav><Link className="account-link" href="/tai-khoan">Tài khoản</Link></header><nav className="mobile-nav" aria-label="Điều hướng di động">{nav.map(([href,name])=><Link key={href} href={href}>{name}</Link>)}</nav></>;
}