import type { SVGProps } from "react";

/**
 * Refined, mature editorial family-album illustrations for "Nhà của Gấu".
 * Aesthetics: Kinfolk / Studio Ghibli landscape & archival Polaroid collage,
 * replacing juvenile cartoon characters with a sophisticated architectural emblem
 * and layered family keepsake photography cards.
 */
export function GauLogoMark({ size, ...props }: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="gauEmblemBg" x1="12" y1="8" x2="100" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#F6E5C6" />
        </linearGradient>
        <linearGradient id="gauRoofWarm" x1="22" y1="22" x2="90" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9534F" />
          <stop offset="1" stopColor="#B83E3A" />
        </linearGradient>
        <linearGradient id="gauHoneyHeart" x1="56" y1="48" x2="56" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAD461" />
          <stop offset="1" stopColor="#E4A224" />
        </linearGradient>
      </defs>

      {/* Refined Archival Crest Frame */}
      <rect x="6" y="6" width="100" height="100" rx="26" fill="url(#gauEmblemBg)" stroke="#C69C6D" strokeWidth="2.4" />
      <rect x="12" y="12" width="88" height="88" rx="20" stroke="#E4CCB0" strokeWidth="1.2" />

      {/* Subtle Bear Ear Silhouette integrated behind the Roof (Minimalist Monogram) */}
      <circle cx="33" cy="34" r="9.5" fill="#F9C84B" stroke="#7A563B" strokeWidth="2.2" />
      <circle cx="33" cy="34" r="4.2" fill="#DC9B22" opacity="0.55" />
      <circle cx="79" cy="34" r="9.5" fill="#F9C84B" stroke="#7A563B" strokeWidth="2.2" />
      <circle cx="79" cy="34" r="4.2" fill="#DC9B22" opacity="0.55" />

      {/* Architectural Cottage Body */}
      <path
        d="M28 46V80C28 82.2 29.8 84 32 84H80C82.2 84 84 82.2 84 80V46"
        fill="#FFFDF9"
        stroke="#7A563B"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Gable Roof (Soft Red) */}
      <path
        d="M19 49L56 21L93 49"
        stroke="url(#gauRoofWarm)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M27 49H85" stroke="#F9C84B" strokeWidth="2.4" strokeLinecap="round" />

      {/* Golden Heart Emblem in Center of Home */}
      <path
        d="M56 69C56 69 45 61.8 45 55.2C45 51.4 48 48.8 51.5 48.8C53.7 48.8 55.2 50 56 51.5C56.8 50 58.3 48.8 60.5 48.8C64 48.8 67 51.4 67 55.2C67 61.8 56 69 56 69Z"
        fill="url(#gauHoneyHeart)"
        stroke="#7A563B"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Open Keepsake Album Pages at Base */}
      <path
        d="M24 85C35 81 46 82 56 86C66 82 77 81 88 85"
        stroke="#7A563B"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 90C37 86.8 47 87.5 56 91C65 87.5 75 86.8 84 90"
        stroke="#C69C6D"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function GauHeroIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 440 290"
      fill="none"
      role="img"
      aria-label="Bộ sưu tập khung ảnh ký ức gia đình Nhà của Gấu bên ngôi nhà ấm áp và thiên nhiên"
      {...props}
    >
      <defs>
        <linearGradient id="heroWarmSky" x1="50" y1="24" x2="350" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF9" />
          <stop offset="0.52" stopColor="#FDF2D8" />
          <stop offset="1" stopColor="#F5DBA8" />
        </linearGradient>
        <linearGradient id="heroSunGlow" x1="288" y1="36" x2="288" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9C84B" stopOpacity="0.65" />
          <stop offset="1" stopColor="#F9C84B" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cottageRoof" x1="110" y1="74" x2="240" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9534F" />
          <stop offset="1" stopColor="#B63C38" />
        </linearGradient>
        <clipPath id="mainPhotoClip">
          <rect x="44" y="26" width="316" height="206" rx="16" />
        </clipPath>
      </defs>

      {/* Secondary Tilted Archival Photo Card in Background (Left) */}
      <g transform="rotate(-4.5 180 135)">
        <rect x="30" y="24" width="308" height="214" rx="20" fill="#F4E4C8" stroke="#D5B895" strokeWidth="1.5" />
      </g>

      {/* Main Framed Family Landscape Photograph */}
      <g>
        <rect x="34" y="16" width="336" height="236" rx="22" fill="#FFFDF9" stroke="#C8A67E" strokeWidth="2" />

        <g clipPath="url(#mainPhotoClip)">
          {/* Golden Hour Sky */}
          <rect x="44" y="26" width="316" height="206" fill="url(#heroWarmSky)" />

          {/* Warm Afternoon Sun & Distant Highland Ridges */}
          <circle cx="292" cy="74" r="42" fill="url(#heroSunGlow)" />
          <circle cx="292" cy="74" r="19" fill="#F9C84B" opacity="0.82" />

          {/* Layered Mountain Silhouette */}
          <path
            d="M44 168C92 134 144 136 196 158C244 128 304 126 360 156V232H44V168Z"
            fill="#D8E5C5"
            opacity="0.75"
          />
          <path d="M44 184Q150 154 256 178T360 172V232H44V184Z" fill="#BDD4A0" />
          <path d="M44 200Q168 178 286 196T360 192V232H44V200Z" fill="#A8C686" />

          {/* Warm Cobblestone Courtyard Path */}
          <path
            d="M168 188C178 202 162 216 184 232H226C204 216 208 202 192 188H168Z"
            fill="#EED8B8"
          />

          {/* Cypress & Botanical Trees around the Home */}
          <g opacity="0.92">
            <circle cx="88" cy="144" r="22" fill="#89AC65" />
            <circle cx="106" cy="134" r="18" fill="#A2C17E" />
            <path d="M88 142V188" stroke="#6E4F35" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="272" cy="148" r="18" fill="#89AC65" />
            <path d="M272 146V184" stroke="#6E4F35" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Warm Family Timber Villa / Cottage */}
          <g transform="translate(106, 68)">
            {/* Chimney */}
            <rect x="108" y="8" width="15" height="30" rx="3" fill="#C65F4E" stroke="#6E4F35" strokeWidth="2" />
            {/* Soft Chimney Smoke */}
            <path
              d="M116 3C116 -3 123 -5 125 -10C127 -15 121 -19 124 -23"
              stroke="#FFFDF9"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.75"
            />

            {/* Main House Walls */}
            <rect x="18" y="46" width="122" height="76" rx="6" fill="#FFFBF3" stroke="#6E4F35" strokeWidth="2.2" />
            <path d="M24 66H134M24 86H134M24 106H134" stroke="#F0E3CE" strokeWidth="1.2" />

            {/* Architectural Gable Roof */}
            <path
              d="M4 50L79 6L154 50Z"
              fill="url(#cottageRoof)"
              stroke="#6E4F35"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M16 50H142" stroke="#F9C84B" strokeWidth="3.2" strokeLinecap="round" />

            {/* Attic Window */}
            <circle cx="79" cy="31" r="9" fill="#FFF4E0" stroke="#6E4F35" strokeWidth="1.9" />
            <path d="M79 22V40M70 31H88" stroke="#8B6A4E" strokeWidth="1.3" />

            {/* Arched Timber Door */}
            <path
              d="M65 122V82C65 74.3 71.3 68 79 68C86.7 68 93 74.3 93 82V122H65Z"
              fill="#B67C4B"
              stroke="#6E4F35"
              strokeWidth="2"
            />
            <circle cx="87" cy="96" r="2.2" fill="#F9C84B" />

            {/* Warm Glowing Windows */}
            <rect x="30" y="68" width="24" height="26" rx="3.5" fill="#FDE49B" stroke="#6E4F35" strokeWidth="1.9" />
            <path d="M42 68V94M30 81H54" stroke="#8B6A4E" strokeWidth="1.3" />
            <rect x="104" y="68" width="24" height="26" rx="3.5" fill="#FDE49B" stroke="#6E4F35" strokeWidth="1.9" />
            <path d="M116 68V94M104 81H128" stroke="#8B6A4E" strokeWidth="1.3" />

            {/* Garden Shrubs & Flowers */}
            <path
              d="M10 123C10 115 17 111 25 114C30 110 40 112 42 119C47 119 49 123 46 125H12Z"
              fill="#84A860"
              stroke="#6E4F35"
              strokeWidth="1.8"
            />
            <circle cx="24" cy="118" r="2" fill="#F9C84B" />
            <circle cx="34" cy="117" r="2" fill="#D9534F" />
          </g>
        </g>

        {/* Inner Archival Frame Border & Photo Mounting Corners */}
        <rect x="44" y="26" width="316" height="206" rx="16" stroke="#E5CEAE" strokeWidth="1.5" />
        <path
          d="M38 40L54 24M350 24L366 40M38 218L54 234"
          stroke="#B88E5E"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Handwritten-style Caption Bar on Main Photo */}
        <path d="M156 241H248" stroke="#C8A67E" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* Overlapping Polaroid Card 1 (Bottom-Left): Vintage Camera & Travel Compass */}
      <g transform="translate(16, 152) rotate(-6)">
        <rect x="0" y="0" width="96" height="108" rx="12" fill="#FFFDF9" stroke="#C69C6D" strokeWidth="1.8" />
        <rect x="8" y="8" width="80" height="68" rx="8" fill="#FAF1DF" stroke="#E5CEAE" strokeWidth="1.2" />
        {/* Minimalist Retro Camera Icon */}
        <rect x="24" y="28" width="48" height="32" rx="7" fill="#8B6A4E" stroke="#5C432E" strokeWidth="1.8" />
        <path d="M36 28L40 22H56L60 28" fill="#D9534F" stroke="#5C432E" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="48" cy="44" r="10" fill="#FFFDF9" stroke="#5C432E" strokeWidth="1.8" />
        <circle cx="48" cy="44" r="5" fill="#F9C84B" />
        <circle cx="63" cy="35" r="2" fill="#F9C84B" />
        {/* Polaroid Caption Lines */}
        <path d="M24 88H72" stroke="#8B6A4E" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        <path d="M34 96H62" stroke="#D9534F" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* Overlapping Polaroid Card 2 (Bottom-Right): Minimalist Bear Plush & Ceramic Honey Jar Still-Life */}
      <g transform="translate(300, 126) rotate(4.5)">
        <rect x="0" y="0" width="118" height="136" rx="14" fill="#FFFDF9" stroke="#C69C6D" strokeWidth="2" />
        <rect x="9" y="9" width="100" height="90" rx="9" fill="#FFF6E4" stroke="#E5CEAE" strokeWidth="1.2" />

        {/* Subtle Minimalist Plush Bear Silhouette (Warm & Tasteful) */}
        <g transform="translate(20, 20)">
          <circle cx="15" cy="12" r="6.5" fill="#F4BE44" stroke="#6E4F35" strokeWidth="1.8" />
          <circle cx="43" cy="12" r="6.5" fill="#F4BE44" stroke="#6E4F35" strokeWidth="1.8" />
          <path
            d="M11 64C12 50 19 45 29 45C39 45 46 50 47 64L48 72H10L11 64Z"
            fill="#D9534F"
            stroke="#6E4F35"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M20 46.5Q29 52 38 46.5" stroke="#FFF4E0" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path
            d="M12 27C12 17.5 19.2 11 29 11C38.8 11 46 17.5 46 27C46 35.5 38.8 41 29 41C19.2 41 12 35.5 12 27Z"
            fill="#F4BE44"
            stroke="#6E4F35"
            strokeWidth="1.8"
          />
          <ellipse cx="29" cy="30.5" rx="6.8" ry="5" fill="#FFFDF9" />
          <ellipse cx="29" cy="28.5" rx="2.6" ry="1.8" fill="#5A3E28" />
          <path d="M26 32.5Q29 34.5 32 32.5" stroke="#5A3E28" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="22" cy="24.5" r="1.6" fill="#432F1F" />
          <circle cx="36" cy="24.5" r="1.6" fill="#432F1F" />
        </g>

        {/* Artisanal Ceramic Honey Jar */}
        <g transform="translate(66, 52)">
          <path
            d="M7 13C2.5 19 3 31 8.5 37C11 39.5 27 39.5 29.5 37C35 31 35.5 19 31 13Z"
            fill="#E09535"
            stroke="#6E4F35"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect x="5.5" y="7.5" width="27" height="6.5" rx="3.2" fill="#C47728" stroke="#6E4F35" strokeWidth="1.7" />
          <path
            d="M8.5 13Q12.5 18 15.5 14.5Q19.5 20.5 24 13.8Q27 17.5 29.5 13Z"
            fill="#F9C84B"
            stroke="#6E4F35"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <rect x="11.5" y="22" width="15" height="9" rx="2.5" fill="#FFFDF9" stroke="#8B6A4E" strokeWidth="1.2" />
          <path d="M15.5 26.5H22.5" stroke="#D9534F" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Polaroid Caption */}
        <path d="M28 112H90" stroke="#8B6A4E" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <path d="M40 121H78" stroke="#D9534F" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
      </g>
    </svg>
  );
}

export function GauEmptyMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 110" fill="none" aria-hidden="true" {...props}>
      <circle cx="60" cy="55" r="45" fill="#FFFDF9" stroke="#DEC39D" strokeWidth="2" />
      <circle cx="60" cy="55" r="39" stroke="#EFE0C6" strokeWidth="1.2" strokeDasharray="3 3" />

      {/* Minimalist Keepsake Photo Stack & Bear Crest */}
      <g transform="rotate(-5 56 54)">
        <rect x="31" y="28" width="52" height="44" rx="7" fill="#F5E5C9" stroke="#C69C6D" strokeWidth="1.6" />
      </g>
      <rect x="34" y="28" width="54" height="46" rx="7" fill="#FFFDF9" stroke="#7A563B" strokeWidth="2" />
      <circle cx="73" cy="41" r="5" fill="#F9C84B" />
      <path d="M39 66L53 49L65 61L73 53L83 66H39Z" fill="#A8C686" />

      {/* Open Album Pages at Base */}
      <path
        d="M32 82C42 78 51 79 60 83C69 79 78 78 88 82"
        stroke="#7A563B"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M46 89H74" stroke="#D9534F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
