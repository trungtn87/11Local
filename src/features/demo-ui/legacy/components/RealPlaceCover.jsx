import { ImageOff } from 'lucide-react';

// The card shows exactly one approved, real Neon photo. No simulated destination images.
export function RealPlaceCover({ place }) {
  return <div className="real-place-cover">
    <div className="real-place-no-photo"><ImageOff size={26}/><span>Chưa có ảnh</span></div>
    {place.cover_photo_id && <img
      src={'/api/place-photos/' + place.cover_photo_id}
      alt={'Ảnh đại diện ' + place.name}
      loading="lazy"
      onError={(event) => { event.currentTarget.style.display = 'none'; }}
    />}
  </div>;
}
