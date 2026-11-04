import { ImageOff } from 'lucide-react';

// Keep one approved Neon image per card. Only the visible first card is eager;
// off-screen cards decode asynchronously and use a smaller variant.
export function RealPlaceCover({ place, priority = false }) {
  const id = encodeURIComponent(place.cover_photo_id || '');
  return <div className="real-place-cover">
    <div className="real-place-no-photo"><ImageOff size={26}/><span>Chưa có ảnh</span></div>
    {place.cover_photo_id && <img
      src={'/api/place-photos/' + id + '?size=card'}
      srcSet={'/api/place-photos/' + id + '?size=thumb 260w, /api/place-photos/' + id + '?size=card 760w'}
      sizes="(max-width: 720px) 50vw, (max-width: 1200px) 33vw, 360px"
      alt={'Ảnh đại diện ' + place.name}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={(event) => { event.currentTarget.style.display = 'none'; }}
    />}
  </div>;
}
