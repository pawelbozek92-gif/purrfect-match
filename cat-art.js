// Draws cat "photos" as inline SVG so the app needs no image hosting.
// catArt(cat, photoIndex, { face: true }) crops to the head for avatars.

(() => {
  const COATS = {
    orange: { base: '#E8954A', dark: '#B9622A', light: '#F7D9B8' },
    black:  { base: '#2E2B30', dark: '#121014', light: '#4C4852' },
    gray:   { base: '#8C929C', dark: '#5B616B', light: '#CDD1D6' },
    white:  { base: '#F5F2EC', dark: '#D8CFC1', light: '#FFFFFF' },
    cream:  { base: '#EBCFA6', dark: '#7A5A44', light: '#FAEEDC' },
    brown:  { base: '#7B5435', dark: '#45291A', light: '#B88F6C' },
  };
  const EYES = {
    green: '#7CB342', amber: '#F2A93B', blue: '#5AA9E6', copper: '#C8702E', hazel: '#A88B3D', odd: ['#5AA9E6', '#F2A93B'],
  };
  const BGS = {
    sunset: ['#FFB88C', '#DE6262'], sky: ['#A1C4FD', '#C2E9FB'], mint: ['#B7F8DB', '#50A7C2'], lilac: ['#E0C3FC', '#8EC5FC'],
    peach: ['#FFECD2', '#FCB69F'], night: ['#30366B', '#5B4B8A'], meadow: ['#D4FC79', '#96E6A1'], rose: ['#FBC2EB', '#A6C1EE'],
  };
  const WHITE = '#FBF8F2';
  const ORANGE = '#E8954A';
  const BLACK = '#2E2B30';
  let uid = 0;

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function headPattern(pat, c) {
    switch (pat) {
      case 'tabby':
        return `<g stroke="${c.dark}" stroke-width="7" stroke-linecap="round" fill="none">
          <path d="M150 100v28"/><path d="M131 104l5 23"/><path d="M169 104l-5 23"/>
          <path d="M60 166h24"/><path d="M62 184h19"/><path d="M240 166h-24"/><path d="M238 184h-19"/></g>`;
      case 'tuxedo':
        return `<path d="M150 140C138 165 112 200 110 260h80c-2-60-28-95-40-120z" fill="${WHITE}"/>`;
      case 'calico':
        return `<ellipse cx="98" cy="128" rx="52" ry="40" fill="${BLACK}"/><ellipse cx="212" cy="196" rx="44" ry="52" fill="${ORANGE}"/>
          <ellipse cx="190" cy="110" rx="26" ry="18" fill="${ORANGE}"/>`;
      case 'pointed':
        return `<ellipse cx="150" cy="206" rx="54" ry="46" fill="${c.dark}" opacity=".85"/>`;
      case 'spotted':
        return `<g fill="${c.dark}"><ellipse cx="112" cy="124" rx="9" ry="7"/><ellipse cx="188" cy="126" rx="8" ry="6"/>
          <ellipse cx="150" cy="114" rx="7" ry="9"/><ellipse cx="84" cy="184" rx="7" ry="6"/><ellipse cx="216" cy="184" rx="7" ry="6"/>
          <ellipse cx="132" cy="140" rx="5" ry="4"/><ellipse cx="168" cy="140" rx="5" ry="4"/></g>`;
      default:
        return '';
    }
  }

  function bodyPattern(pat, c) {
    switch (pat) {
      case 'tabby':
        return `<g stroke="${c.dark}" stroke-width="8" stroke-linecap="round" fill="none">
          <path d="M66 290q12 8 26 4"/><path d="M234 290q-12 8-26 4"/><path d="M58 322q14 8 30 4"/><path d="M242 322q-14 8-30 4"/></g>`;
      case 'tuxedo':
        return `<ellipse cx="150" cy="330" rx="44" ry="74" fill="${WHITE}"/>`;
      case 'calico':
        return `<ellipse cx="205" cy="318" rx="44" ry="36" fill="${ORANGE}"/><ellipse cx="88" cy="340" rx="36" ry="30" fill="${BLACK}"/>`;
      case 'spotted':
        return `<g fill="${c.dark}"><ellipse cx="90" cy="300" rx="10" ry="8"/><ellipse cx="210" cy="306" rx="9" ry="7"/>
          <ellipse cx="120" cy="340" rx="8" ry="7"/><ellipse cx="190" cy="346" rx="10" ry="8"/><ellipse cx="70" cy="336" rx="7" ry="6"/></g>`;
      default:
        return '';
    }
  }

  // Returns [drawn with the head (tilts with it), drawn at the neck].
  function accessory(acc) {
    switch (acc) {
      case 'bowtie':
        return ['', `<g transform="translate(150 262)"><path d="M0 0L-30-15V15ZM0 0L30-15V15Z" fill="#E5484D" stroke="#B42F38" stroke-width="2" stroke-linejoin="round"/><circle r="7" fill="#B42F38"/></g>`];
      case 'collar':
        return ['', `<path d="M86 246q64 34 128 0" stroke="#E5484D" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="150" cy="270" r="9" fill="#FFC53D" stroke="#D99A00" stroke-width="2"/>`];
      case 'glasses':
        return [`<g><rect x="94" y="156" width="46" height="32" rx="13" fill="#1D1B20"/><rect x="160" y="156" width="46" height="32" rx="13" fill="#1D1B20"/>
          <path d="M140 166h20" stroke="#1D1B20" stroke-width="5"/><path d="M102 164l12-3M168 164l12-3" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>`, ''];
      case 'hat':
        return [`<g transform="rotate(-12 150 100)"><path d="M150 38L121 108h58z" fill="#7C5CFF"/><path d="M130 90h40M137 72h26" stroke="#FFD23F" stroke-width="5"/><circle cx="150" cy="38" r="9" fill="#FFD23F"/></g>`, ''];
      case 'crown':
        return [`<path d="M114 104l7-34 18 20 11-28 11 28 18-20 7 34z" fill="#FFC53D" stroke="#D99A00" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="90" r="5" fill="#E5484D"/>`, ''];
      case 'flower':
        return [`<g transform="translate(206 112)">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="9" ry="14" transform="rotate(${a}) translate(0 -12)" fill="#FF8FB1"/>`).join('')}<circle r="8" fill="#FFD23F"/></g>`, ''];
      default:
        return ['', ''];
    }
  }

  window.catArt = function catArt(cat, index = 0, opts = {}) {
    const id = 'cat' + (++uid);
    const c = COATS[cat.coat] || COATS.orange;
    const photos = cat.photos && cat.photos.length ? cat.photos : [{ bg: 'peach' }];
    const p = photos[((index % photos.length) + photos.length) % photos.length];
    const [b1, b2] = BGS[p.bg] || BGS.peach;
    const eyeCol = EYES[cat.eyes] || EYES.green;
    const [eyeL, eyeR] = Array.isArray(eyeCol) ? eyeCol : [eyeCol, eyeCol];
    const pat = cat.pattern || 'solid';
    const isWhite = cat.coat === 'white';
    const isDark = cat.coat === 'black' || pat === 'pointed'; // mouth sits on a dark coat or face mask
    const outline = isWhite ? ' stroke="#CFC6B8" stroke-width="2"' : '';
    const ear = pat === 'pointed' ? c.dark : c.base;
    const earStroke = isWhite ? '#CFC6B8' : ear;
    const innerEar = cat.coat === 'black' || pat === 'pointed' ? '#9A6A76' : '#F2A7B6';
    const muzzle = pat === 'tuxedo' ? WHITE : pat === 'pointed' ? c.dark : c.light;
    const ink = isDark ? '#E9DDE3' : '#4A3530';
    const whisker = isWhite || (cat.coat === 'cream' && pat !== 'pointed') ? '#8F8578' : '#FFFFFF';
    const roundPupil = p.bg === 'night';
    const [headAcc, neckAcc] = accessory(p.acc);

    const eye = (cx, col, closed) => closed
      ? `<path d="M${cx - 14} 175q14-13 28 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${cx}" cy="172" rx="15" ry="17" fill="${col}"/>
         <ellipse cx="${cx}" cy="173" rx="${roundPupil ? 9 : 4.5}" ry="${roundPupil ? 12 : 13}" fill="#151217"/>
         <circle cx="${cx + 4}" cy="165" r="4" fill="#fff"/>`;
    const happy = p.pose === 'happy';

    const viewBox = opts.face ? '48 72 204 204' : '0 0 300 360';
    return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(cat.name || 'Cat')}">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
    <clipPath id="${id}h"><ellipse cx="150" cy="175" rx="88" ry="78"/></clipPath>
    <clipPath id="${id}b"><ellipse cx="150" cy="320" rx="100" ry="80"/></clipPath>
  </defs>
  <rect x="-60" y="-60" width="420" height="480" fill="url(#${id}g)"/>
  <circle cx="45" cy="60" r="55" fill="#fff" opacity=".18"/><circle cx="268" cy="296" r="72" fill="#fff" opacity=".12"/>
  <ellipse cx="150" cy="320" rx="100" ry="80" fill="${c.base}"${outline}/>
  <g clip-path="url(#${id}b)">${bodyPattern(pat, c)}</g>
  <g transform="rotate(${p.tilt || 0} 150 210)">
    <path d="M76 140L68 58l60 46z" fill="${ear}" stroke="${earStroke}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M224 140l8-82-60 46z" fill="${ear}" stroke="${earStroke}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M86 126l-4-50 36 29z" fill="${innerEar}"/><path d="M214 126l4-50-36 29z" fill="${innerEar}"/>
    <ellipse cx="150" cy="175" rx="88" ry="78" fill="${c.base}"${outline}/>
    <g clip-path="url(#${id}h)">${headPattern(pat, c)}</g>
    ${eye(116, eyeL, happy)}
    ${eye(184, eyeR, happy || p.pose === 'wink')}
    <ellipse cx="92" cy="206" rx="11" ry="6" fill="#F2A7B6" opacity=".45"/><ellipse cx="208" cy="206" rx="11" ry="6" fill="#F2A7B6" opacity=".45"/>
    <ellipse cx="137" cy="211" rx="17" ry="13" fill="${muzzle}"/><ellipse cx="163" cy="211" rx="17" ry="13" fill="${muzzle}"/>
    <path d="M141 197h18l-9 10z" fill="#E77F93" stroke="#E77F93" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 207v5M150 212q-6 8-13 2M150 212q6 8 13 2" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g stroke="${whisker}" stroke-width="2" stroke-linecap="round" opacity=".85">
      <path d="M120 207L64 196"/><path d="M120 214L62 216"/><path d="M180 207l56-11"/><path d="M180 214l58 2"/>
    </g>
    ${headAcc}
  </g>
  ${neckAcc}
</svg>`;
  };

  window.CAT_STYLE = {
    coats: [['orange', 'Ginger'], ['black', 'Black'], ['gray', 'Gray'], ['white', 'White'], ['cream', 'Cream'], ['brown', 'Chocolate']],
    patterns: [['solid', 'Solid'], ['tabby', 'Tabby'], ['tuxedo', 'Tuxedo'], ['calico', 'Calico'], ['pointed', 'Colour-point'], ['spotted', 'Spotted']],
    eyes: [['green', 'Green'], ['amber', 'Amber'], ['blue', 'Blue'], ['copper', 'Copper'], ['hazel', 'Hazel'], ['odd', 'Odd-eyed']],
    accessories: [['none', 'None'], ['bowtie', 'Bow tie'], ['glasses', 'Sunglasses'], ['hat', 'Party hat'], ['crown', 'Crown'], ['flower', 'Flower'], ['collar', 'Collar & bell']],
    backgrounds: Object.keys(BGS),
  };
})();
