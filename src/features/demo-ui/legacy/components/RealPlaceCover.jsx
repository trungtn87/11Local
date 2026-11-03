import { PlaceArt } from './ui.jsx';

// Use one approved real image when present; keep an illustration only as fallback.
export function RealPlaceCover({ place }) {
  const kind = ['food', 'cafe', 'stay', 'sight'].includes(place.category_id) ? place.category_id : 'def';

  return (
    <div className="real-place-cover">
      <PlaceArt kind={kind} seed={place.name.length} label={false} />
      {place.cover_photo_id && (
        <img
          src={'/api/place-photos/' + place.cover_photo_id}
          alt={'Ảnh đại diện ' + place.name}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
}
