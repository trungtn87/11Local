import type { SVGProps } from "react";

/**
 * Original warm family album illustrations for "Gia đình Gấu" (Phương án 2).
 * Cute Family Scrapbook / Warm Pastel / Modern Family Journal style.
 * Non-copyrighted original vector artwork.
 */
export function GauLogoMark({ size, ...props }: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} fill="none" aria-hidden="true" {...props}>
      {/* Golden bear ear accent on the top-left of the roof */}
      <circle cx="28" cy="24" r="11" fill="#F8C64E" />
      <circle cx="28" cy="24" r="5.5" fill="#E59A18" />

      {/* Chimney on top-right of the roof */}
      <rect x="73" y="20" width="11" height="22" rx="4" fill="#FFFFFF" stroke="#6E4726" strokeWidth="4.5" />

      {/* House Body */}
      <path
        d="M21 52 L56 22 L91 52 V93 C91 97.4 87.4 101 83 101 H29 C24.6 101 21 97.4 21 93 V52 Z"
        fill="#FFFDF9"
        stroke="#6E4726"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Double Roof Line (Warm Brown + Cream overhang) */}
      <path
        d="M11 56 L56 17 L101 56"
        stroke="#FFF5E6"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 56 L56 17 L101 56"
        stroke="#6E4726"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pink / Coral Heart in the attic */}
      <path
        d="M56 51 C56 51 44 43 44 36.5 C44 32.5 47.2 30 50.8 30 C53.2 30 55 31.4 56 33.2 C57 31.4 58.8 30 61.2 30 C64.8 30 68 32.5 68 36.5 C68 43 56 51 56 51 Z"
        fill="#E65359"
      />

      {/* Cute Golden Teddy Bear peeking at the bottom doorway */}
      <circle cx="40" cy="65" r="7.5" fill="#F8C64E" stroke="#6E4726" strokeWidth="3.2" />
      <circle cx="40" cy="65" r="3.5" fill="#D9881E" />
      <circle cx="72" cy="65" r="7.5" fill="#F8C64E" stroke="#6E4726" strokeWidth="3.2" />
      <circle cx="72" cy="65" r="3.5" fill="#D9881E" />

      <ellipse cx="56" cy="79" rx="19" ry="17" fill="#F8C64E" stroke="#6E4726" strokeWidth="3.5" />
      {/* Rosy Cheeks */}
      <ellipse cx="44" cy="82" rx="3.5" ry="2.2" fill="#F27D82" opacity="0.75" />
      <ellipse cx="68" cy="82" rx="3.5" ry="2.2" fill="#F27D82" opacity="0.75" />
      {/* Cream Snout */}
      <ellipse cx="56" cy="83" rx="7.5" ry="6" fill="#FFF7E8" />
      <ellipse cx="56" cy="80.5" rx="3.2" ry="2.3" fill="#5A3921" />
      <path d="M52.5 84.5 Q56 87.5 59.5 84.5" stroke="#5A3921" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="48.5" cy="75.5" r="2.3" fill="#34251E" />
      <circle cx="63.5" cy="75.5" r="2.3" fill="#34251E" />
    </svg>
  );
}

export function GauHeroIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 420 270"
      fill="none"
      role="img"
      aria-label="Minh họa ngôi nhà ấm áp, gấu bông, cây xanh và khung ảnh Polaroid kỷ niệm gia đình"
      {...props}
    >
      <defs>
        <linearGradient id="gauSkyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CBE7F8" />
          <stop offset="52%" stopColor="#E7F4E8" />
          <stop offset="100%" stopColor="#FFF4D8" />
        </linearGradient>
        <linearGradient id="gauHillBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86B88E" />
          <stop offset="100%" stopColor="#5C936B" />
        </linearGradient>
        <linearGradient id="gauHillFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8DC86" />
          <stop offset="100%" stopColor="#8EBE5C" />
        </linearGradient>
        <filter id="polaroidShadow" x="-12%" y="-12%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#34251E" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Sunburst & soft clouds */}
      <circle cx="348" cy="48" r="46" fill="#FFF3C4" opacity="0.55" />
      <circle cx="348" cy="48" r="26" fill="#FFE082" opacity="0.75" />
      <path
        d="M52 54 C52 44 61 38 71 41 C77 32 92 32 98 41 C107 41 114 47 114 55 C114 61 107 66 98 66 H65 C57 66 52 61 52 54 Z"
        fill="#FFFFFF"
        opacity="0.82"
      />
      <path
        d="M210 38 C210 31 217 26 225 28 C230 22 241 22 246 28 C252 28 258 33 258 39 C258 44 252 48 246 48 H220 C214 48 210 44 210 38 Z"
        fill="#FFFFFF"
        opacity="0.7"
      />

      {/* Distant mountain ridges & lush green hills */}
      <path d="M0 196 Q95 140 205 176 T420 154 L420 270 L0 270 Z" fill="url(#gauHillBack)" opacity="0.55" />
      <path d="M0 216 Q135 178 265 204 T420 192 L420 270 L0 270 Z" fill="url(#gauHillFront)" />

      {/* Soft greenery leaves in top-right */}
      <g opacity="0.88">
        <path d="M390 12 C372 22 365 40 375 52 C389 44 398 28 390 12 Z" fill="#7CB964" />
        <path d="M412 28 C394 34 384 48 390 60 C404 56 415 44 412 28 Z" fill="#98CE73" />
      </g>

      {/* Polaroid Frame #1 (Left — Cozy Family Cottage & Pine Trees) */}
      <g transform="translate(18, 66) rotate(-6)" filter="url(#polaroidShadow)">
        <rect x="0" y="0" width="138" height="156" rx="14" fill="#FFFFFF" />
        <rect x="10" y="10" width="118" height="108" rx="9" fill="#E8F5E9" />
        {/* Mini landscape & cottage inside Polaroid */}
        <circle cx="102" cy="32" r="11" fill="#F8C64E" opacity="0.8" />
        <path d="M10 92 Q58 74 128 88 L128 118 L10 118 Z" fill="#9CCC65" />
        {/* Trees */}
        <circle cx="28" cy="78" r="12" fill="#66BB6A" />
        <rect x="26" y="86" width="4" height="10" rx="2" fill="#795548" />
        <circle cx="110" cy="80" r="10" fill="#66BB6A" />
        {/* Cozy House */}
        <rect x="44" y="58" width="50" height="40" rx="5" fill="#FFF9EE" stroke="#6E4726" strokeWidth="2.4" />
        <path d="M36 61 L69 34 L102 61 Z" fill="#E65359" stroke="#6E4726" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="62" y="74" width="14" height="24" rx="4" fill="#F8C64E" stroke="#6E4726" strokeWidth="2" />
        <path
          d="M69 53 C69 53 63 48.5 63 45 C63 43 64.6 41.5 66.5 41.5 C67.7 41.5 68.5 42.3 69 43.2 C69.5 42.3 70.3 41.5 71.5 41.5 C73.4 41.5 75 43 75 45 C75 48.5 69 53 69 53 Z"
          fill="#FFF5E6"
        />
        {/* Polaroid caption lines */}
        <rect x="28" y="128" width="58" height="5" rx="2.5" fill="#E65359" opacity="0.55" />
        <rect x="28" y="138" width="82" height="4" rx="2" fill="#D7CCC8" />
      </g>

      {/* Polaroid Frame #2 (Right — Cute Plush Teddy Bear & Sunlit Meadow) */}
      <g transform="translate(154, 24) rotate(3)" filter="url(#polaroidShadow)">
        <rect x="0" y="0" width="218" height="214" rx="18" fill="#FFFFFF" />
        <rect x="12" y="12" width="194" height="156" rx="12" fill="url(#gauSkyGrad)" />

        {/* Meadow hills inside main Polaroid */}
        <path d="M12 132 Q95 104 206 126 L206 168 L12 168 Z" fill="#AED581" />
        <path d="M12 144 Q120 124 206 140 L206 168 L12 168 Z" fill="#8BC34A" />

        {/* Little wildflowers */}
        <circle cx="38" cy="146" r="4" fill="#FFFFFF" />
        <circle cx="38" cy="146" r="1.8" fill="#F8C64E" />
        <circle cx="178" cy="148" r="4.5" fill="#FBE7E8" />
        <circle cx="178" cy="148" r="2" fill="#E65359" />
        <circle cx="190" cy="138" r="3.5" fill="#FFFFFF" />
        <circle cx="190" cy="138" r="1.5" fill="#F8C64E" />

        {/* Cute Plush Teddy Bear in Sun Hat & Coral Scarf */}
        <g transform="translate(56, 30)">
          {/* Sun Straw Hat Brim */}
          <ellipse cx="54" cy="28" rx="42" ry="13" fill="#F5D38C" stroke="#8C6239" strokeWidth="2.5" />
          {/* Ears */}
          <circle cx="26" cy="28" r="12" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.8" />
          <circle cx="26" cy="28" r="6" fill="#E59A18" />
          <circle cx="82" cy="28" r="12" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.8" />
          <circle cx="82" cy="28" r="6" fill="#E59A18" />
          {/* Hat Crown */}
          <path d="M26 26 C26 10 38 4 54 4 C70 4 82 10 82 26 Z" fill="#FCE4A6" stroke="#8C6239" strokeWidth="2.5" />
          <path d="M27 23 Q54 29 81 23" stroke="#E65359" strokeWidth="4.5" strokeLinecap="round" />

          {/* Body / Cozy Coral Sweater */}
          <path
            d="M24 94 C24 75 36 69 54 69 C72 69 84 75 84 94 L87 122 C73 127 35 127 21 122 Z"
            fill="#E65359"
            stroke="#6E4726"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path d="M39 72 Q54 81 69 72" stroke="#FFF5E6" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Waving Arms */}
          <path d="M25 84 C11 80 7 68 14 61 C20 55 28 65 31 76" fill="#E65359" stroke="#6E4726" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="13" cy="63" r="8" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.6" />
          <path d="M83 84 C96 88 100 100 93 108 C88 113 80 107 77 96" fill="#E65359" stroke="#6E4726" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="91" cy="105" r="8" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.6" />

          {/* Head */}
          <ellipse cx="54" cy="48" rx="29" ry="25" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.8" />
          {/* Rosy Cheeks */}
          <ellipse cx="34" cy="53" rx="5.5" ry="3.4" fill="#F27D82" opacity="0.72" />
          <ellipse cx="74" cy="53" rx="5.5" ry="3.4" fill="#F27D82" opacity="0.72" />
          {/* Cream Snout */}
          <ellipse cx="54" cy="54" rx="11.5" ry="8.5" fill="#FFF7E8" />
          <ellipse cx="54" cy="50.5" rx="4.8" ry="3.4" fill="#5A3921" />
          <path d="M48 56.5 Q54 62 60 56.5" stroke="#5A3921" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Happy Eyes */}
          <circle cx="41" cy="44" r="3.2" fill="#34251E" />
          <circle cx="42" cy="42.9" r="1.1" fill="#FFFFFF" />
          <circle cx="67" cy="44" r="3.2" fill="#34251E" />
          <circle cx="68" cy="42.9" r="1.1" fill="#FFFFFF" />
        </g>

        {/* Bottom Polaroid Caption & Heart */}
        <rect x="24" y="182" width="96" height="6" rx="3" fill="#34251E" opacity="0.18" />
        <rect x="24" y="194" width="64" height="5" rx="2.5" fill="#E65359" opacity="0.35" />
        <path
          d="M186 195 C186 195 177 188.5 177 183.5 C177 180.5 179.4 178.5 182.2 178.5 C184 178.5 185.3 179.5 186 180.8 C186.7 179.5 188 178.5 189.8 178.5 C192.6 178.5 195 180.5 195 183.5 C195 188.5 186 195 186 195 Z"
          fill="#E65359"
        />
      </g>
    </svg>
  );
}

export function GauEmptyMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 110" fill="none" aria-hidden="true" {...props}>
      <circle cx="60" cy="56" r="46" fill="#FFF5E6" stroke="#F3DFC1" strokeWidth="2" />
      {/* Mini Polaroid Card behind bear */}
      <rect x="24" y="24" width="34" height="40" rx="6" transform="rotate(-10 24 24)" fill="#FFFFFF" stroke="#E5D5C3" strokeWidth="2" />
      <rect x="28" y="28" width="26" height="24" rx="3" transform="rotate(-10 28 28)" fill="#FBE7E8" />
      {/* Ears */}
      <circle cx="40" cy="33" r="9.5" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.6" />
      <circle cx="40" cy="33" r="4.5" fill="#E59A18" />
      <circle cx="80" cy="33" r="9.5" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.6" />
      <circle cx="80" cy="33" r="4.5" fill="#E59A18" />
      {/* Coral Sweater */}
      <path d="M36 84 C36 70 46 65 60 65 C74 65 84 70 84 84 L86 92 L34 92 Z" fill="#E65359" stroke="#6E4726" strokeWidth="2.6" strokeLinejoin="round" />
      {/* Head */}
      <ellipse cx="60" cy="50" rx="23" ry="19.5" fill="#F8C64E" stroke="#6E4726" strokeWidth="2.6" />
      <ellipse cx="46" cy="54" rx="4" ry="2.5" fill="#F27D82" opacity="0.7" />
      <ellipse cx="74" cy="54" rx="4" ry="2.5" fill="#F27D82" opacity="0.7" />
      <ellipse cx="60" cy="55" rx="8.5" ry="6.5" fill="#FFF7E8" />
      <ellipse cx="60" cy="52" rx="3.6" ry="2.5" fill="#5A3921" />
      <path d="M55.5 57 Q60 61 64.5 57" stroke="#5A3921" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="47" r="2.4" fill="#34251E" />
      <circle cx="70" cy="47" r="2.4" fill="#34251E" />
      {/* Cute heart album in paws */}
      <rect x="47" y="75" width="26" height="19" rx="6" fill="#FFF5E6" stroke="#6E4726" strokeWidth="2.2" />
      <path
        d="M60 88 C60 88 54.5 84 54.5 81 C54.5 79.2 56 78 57.6 78 C58.7 78 59.5 78.7 60 79.5 C60.5 78.7 61.3 78 62.4 78 C64 78 65.5 79.2 65.5 81 C65.5 84 60 88 60 88 Z"
        fill="#E65359"
      />
    </svg>
  );
}
