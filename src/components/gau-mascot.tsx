import type { SVGProps } from "react";

/**
 * Original warm family album illustrations for "Nhà của Gấu".
 * Yellow bear wearing a soft red shirt, honey pot, and cozy family house.
 * Non-copyrighted original vector artwork using the approved design tokens.
 */
export function GauLogoMark({ size, ...props }: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} fill="none" aria-hidden="true" {...props}>
      <rect x="6" y="6" width="100" height="100" rx="28" fill="#FFF4E0" stroke="#E5C595" strokeWidth="3.5" />
      <path d="M22 34 L56 14 L90 34" stroke="#D9534F" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35" cy="37" r="11" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />
      <circle cx="35" cy="37" r="5.5" fill="#E9A825" />
      <circle cx="77" cy="37" r="11" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />
      <circle cx="77" cy="37" r="5.5" fill="#E9A825" />
      <path
        d="M31 86 C31 71 42 66 56 66 C70 66 81 71 81 86 L83 95 C83 98 80 100 76 100 L36 100 C32 100 29 98 29 95 Z"
        fill="#D9534F"
        stroke="#8B6A4E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M44 68 Q56 75 68 68" stroke="#FFF4E0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="56" cy="53" rx="24" ry="21" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />
      <ellipse cx="40" cy="57" rx="4.5" ry="2.8" fill="#F08C7E" opacity="0.65" />
      <ellipse cx="72" cy="57" rx="4.5" ry="2.8" fill="#F08C7E" opacity="0.65" />
      <ellipse cx="56" cy="57.5" rx="9.5" ry="7.5" fill="#FFF4E0" />
      <ellipse cx="56" cy="54.5" rx="4.2" ry="3" fill="#634832" />
      <path d="M51.5 59.5 Q56 63.5 60.5 59.5" stroke="#634832" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="45.5" cy="49.5" r="2.8" fill="#4A3525" />
      <circle cx="46.3" cy="48.6" r="0.9" fill="#FFFFFF" />
      <circle cx="66.5" cy="49.5" r="2.8" fill="#4A3525" />
      <circle cx="67.3" cy="48.6" r="0.9" fill="#FFFFFF" />
    </svg>
  );
}

export function GauHeroIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 380 260" fill="none" role="img" aria-label="Minh họa Nhà của Gấu bên ngôi nhà ấm áp và hũ mật ong" {...props}>
      {/* Soft warm sun & clouds */}
      <circle cx="318" cy="50" r="28" fill="#F9C84B" opacity="0.38" />
      <circle cx="318" cy="50" r="19" fill="#F9C84B" opacity="0.72" />
      <path d="M38 56 C38 47 46 41 55 43 C60 35 73 35 79 43 C87 43 93 49 93 56 C93 62 87 66 79 66 L50 66 C43 66 38 62 38 56 Z" fill="#FFFFFF" opacity="0.85" />
      {/* Gentle meadow hills */}
      <path d="M10 226 Q110 190 215 212 T370 206 L370 250 L10 250 Z" fill="#C5DBA9" />
      <path d="M10 234 Q140 208 265 224 T370 222 L370 252 L10 252 Z" fill="#A8C686" />

      {/* Cozy Family House on the left */}
      <g transform="translate(36, 76)">
        {/* Chimney */}
        <rect x="98" y="8" width="18" height="32" rx="4" fill="#C86D51" stroke="#8B6A4E" strokeWidth="2.8" />
        {/* House walls */}
        <rect x="18" y="54" width="112" height="86" rx="10" fill="#FFF8EC" stroke="#8B6A4E" strokeWidth="3" />
        {/* Roof */}
        <path d="M6 58 L74 10 L142 58 Z" fill="#D9534F" stroke="#8B6A4E" strokeWidth="3" strokeLinejoin="round" />
        {/* Roof trim */}
        <path d="M18 58 L130 58" stroke="#F9C84B" strokeWidth="4" strokeLinecap="round" />
        {/* Door */}
        <path d="M56 140 L56 94 C56 84 64 78 74 78 C84 78 92 84 92 94 L92 140 Z" fill="#C68B59" stroke="#8B6A4E" strokeWidth="2.8" />
        <circle cx="84" cy="110" r="3" fill="#F9C84B" />
        {/* Heart window in attic */}
        <circle cx="74" cy="40" r="10" fill="#FFF4E0" stroke="#8B6A4E" strokeWidth="2.5" />
        {/* Side window */}
        <rect x="28" y="82" width="20" height="22" rx="4" fill="#F9C84B" opacity="0.65" stroke="#8B6A4E" strokeWidth="2.4" />
        <rect x="100" y="82" width="20" height="22" rx="4" fill="#F9C84B" opacity="0.65" stroke="#8B6A4E" strokeWidth="2.4" />
        {/* Little bush */}
        <path d="M8 142 C8 131 17 125 26 129 C32 124 42 127 44 136 C49 137 51 142 48 145 L10 145 Z" fill="#8FB369" stroke="#8B6A4E" strokeWidth="2.2" />
      </g>

      {/* Cute Yellow Bear in Soft Red Shirt (Center-Right) */}
      <g transform="translate(182, 54)">
        {/* Left & Right Ears */}
        <circle cx="42" cy="34" r="14" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3.2" />
        <circle cx="42" cy="34" r="7" fill="#E6A123" />
        <circle cx="102" cy="34" r="14" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3.2" />
        <circle cx="102" cy="34" r="7" fill="#E6A123" />

        {/* Legs / Feet */}
        <ellipse cx="52" cy="166" rx="15" ry="11" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />
        <ellipse cx="92" cy="166" rx="15" ry="11" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />

        {/* Chubby Belly (under shirt) */}
        <ellipse cx="72" cy="132" rx="34" ry="30" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3.2" />

        {/* Soft Red Shirt */}
        <path
          d="M37 104 C37 86 52 80 72 80 C92 80 107 86 107 104 L110 132 C96 138 48 138 34 132 Z"
          fill="#D9534F"
          stroke="#8B6A4E"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Shirt collar */}
        <path d="M55 83 Q72 93 89 83" stroke="#FFF4E0" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Left Arm waving warmly */}
        <path d="M38 96 C20 92 14 76 22 68 C29 61 39 73 43 86" fill="#D9534F" stroke="#8B6A4E" strokeWidth="3" strokeLinecap="round" />
        <circle cx="21" cy="70" r="9.5" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />

        {/* Right Arm holding honey pot */}
        <path d="M105 96 C120 100 126 114 118 124 C112 130 102 124 98 112" fill="#D9534F" stroke="#8B6A4E" strokeWidth="3" strokeLinecap="round" />
        <circle cx="116" cy="121" r="9.5" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3" />

        {/* Bear Head */}
        <ellipse cx="72" cy="56" rx="33" ry="29" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="3.2" />
        {/* Rosy cheeks */}
        <ellipse cx="49" cy="62" rx="6.5" ry="4" fill="#F08C7E" opacity="0.65" />
        <ellipse cx="95" cy="62" rx="6.5" ry="4" fill="#F08C7E" opacity="0.65" />
        {/* Cream Snout */}
        <ellipse cx="72" cy="62" rx="13" ry="10" fill="#FFF4E0" />
        {/* Nose & Warm Smile */}
        <ellipse cx="72" cy="58" rx="5.5" ry="4" fill="#634832" />
        <path d="M65 65 Q72 71 79 65" stroke="#634832" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <circle cx="57" cy="51" r="3.6" fill="#4A3525" />
        <circle cx="58.2" cy="49.8" r="1.2" fill="#FFFFFF" />
        <circle cx="87" cy="51" r="3.6" fill="#4A3525" />
        <circle cx="88.2" cy="49.8" r="1.2" fill="#FFFFFF" />
      </g>

      {/* Honey Pot next to Bear */}
      <g transform="translate(296, 152)">
        {/* Pot body */}
        <path
          d="M12 24 C4 34 5 54 14 64 C18 68 46 68 50 64 C59 54 60 34 52 24 Z"
          fill="#E59A38"
          stroke="#8B6A4E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Pot rim */}
        <rect x="9" y="15" width="46" height="11" rx="5.5" fill="#C97A2B" stroke="#8B6A4E" strokeWidth="2.8" />
        {/* Golden Honey dripping over rim */}
        <path
          d="M14 24 Q20 34 25 27 Q31 38 38 26 Q44 33 49 24 Z"
          fill="#F9C84B"
          stroke="#8B6A4E"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Cute heart label on pot */}
        <rect x="20" y="39" width="24" height="16" rx="5" fill="#FFF4E0" stroke="#8B6A4E" strokeWidth="2" />
        <path d="M32 45 C32 45 28 41.5 28 44 C28 46.5 32 49.5 32 49.5 C32 49.5 36 46.5 36 44 C36 41.5 32 45 32 45 Z" fill="#D9534F" />
      </g>
    </svg>
  );
}

export function GauEmptyMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 110" fill="none" aria-hidden="true" {...props}>
      <circle cx="60" cy="56" r="46" fill="#FFF4E0" stroke="#F0D9B5" strokeWidth="2.5" />
      {/* Ears */}
      <circle cx="38" cy="31" r="10" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="2.8" />
      <circle cx="38" cy="31" r="5" fill="#E6A123" />
      <circle cx="82" cy="31" r="10" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="2.8" />
      <circle cx="82" cy="31" r="5" fill="#E6A123" />
      {/* Red Shirt */}
      <path d="M35 84 C35 69 45 64 60 64 C75 64 85 69 85 84 L87 92 L33 92 Z" fill="#D9534F" stroke="#8B6A4E" strokeWidth="2.8" strokeLinejoin="round" />
      {/* Head */}
      <ellipse cx="60" cy="49" rx="24" ry="20" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="2.8" />
      <ellipse cx="45" cy="53" rx="4.2" ry="2.6" fill="#F08C7E" opacity="0.65" />
      <ellipse cx="75" cy="53" rx="4.2" ry="2.6" fill="#F08C7E" opacity="0.65" />
      <ellipse cx="60" cy="54" rx="9" ry="7" fill="#FFF4E0" />
      <ellipse cx="60" cy="51" rx="3.8" ry="2.7" fill="#634832" />
      <path d="M55.5 56 Q60 60 64.5 56" stroke="#634832" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="49.5" cy="46" r="2.6" fill="#4A3525" />
      <circle cx="70.5" cy="46" r="2.6" fill="#4A3525" />
      {/* Little honey pot in paws */}
      <rect x="48" y="76" width="24" height="18" rx="7" fill="#F9C84B" stroke="#8B6A4E" strokeWidth="2.4" />
      <rect x="46" y="73" width="28" height="6" rx="3" fill="#C97A2B" stroke="#8B6A4E" strokeWidth="2.2" />
    </svg>
  );
}
