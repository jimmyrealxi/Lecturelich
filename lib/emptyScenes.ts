import { color as c, font } from "./theme";
import type { EmptyKind } from "./emptyLines";

/** ฉากตอนหน้าว่าง ตาม docs/mockups/a-empty-states.html · เป็น SVG สำหรับเว็บ ขยับแค่ transform/opacity */
const olive = c.tape[2].bg;
const open = 'class="es" viewBox="0 0 300 150" aria-hidden="true"';
const ground = '<path class="ln" d="M6 131c44-4 92 3 138-1s104 3 150-2"/>';
const road = '<path class="ln thin soft" d="M30 139h24M96 141h40M178 138h30M240 141h22"/>';
const leaf = (y: number, cls: string, fill: string, d: string, rib: string) =>
  `<g class="drift ${cls}"><g transform="translate(0 ${y})"><g class="an flut"><path d="${d}" fill="${fill}" stroke="${c.paper}" stroke-width="1.5"/><path class="ln thin" d="${rib}"/></g></g></g>`;

const CSS = `
.es{display:block;width:100%;height:auto}
.es .ln{fill:none;stroke:${c.paper};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.es .thin{stroke-width:1.3}
.es .soft{stroke:${c.faint}}
.es .rust{stroke:${c.stain}}
.es .an{transform-box:fill-box;transform-origin:center}
.es .drift{animation:es-drift 9s linear infinite}
.es .d2{animation-delay:-3.2s;animation-duration:10.5s}
.es .d3{animation-delay:-6.4s;animation-duration:8.2s}
.es .flut{animation:es-flut 2.6s ease-in-out infinite}
.es .d2 .flut{animation-duration:3.3s;animation-direction:reverse}
.es .d3 .flut{animation-duration:2.2s}
.es .gust{animation:es-gust 9s ease-out infinite}
.es .g2{animation-delay:-3.2s}
.es .swing{transform-origin:50% 0;animation:es-swing 4.5s ease-in-out infinite}
.es .key{transform-origin:50% 0;animation:es-swing 3.4s ease-in-out infinite}
.es .thread{transform-origin:50% 0;animation:es-thread 7s cubic-bezier(.45,0,.2,1) infinite}
.es .spider{animation:es-spider 7s cubic-bezier(.45,0,.2,1) infinite}
.es .steam{opacity:0;animation:es-steam 4.2s ease-out infinite}
.es .s2{animation-delay:-1.4s}
.es .s3{animation-delay:-2.8s}
.es .pencil{transform-origin:6% 94%;animation:es-tap 5.4s ease-in-out infinite}
.es .dot{opacity:0;animation:es-dot 5.4s step-end infinite}
.es .dot.b{animation-name:es-dot2}
.es .dot.c{animation-name:es-dot3}
.es .cur{animation:es-blink 1.1s step-end infinite}
@keyframes es-drift{0%{transform:translateX(-46px);opacity:0}7%{opacity:1}68%{opacity:1}76%,100%{transform:translateX(345px);opacity:0}}
@keyframes es-flut{0%{transform:translateY(0) rotate(-20deg)}25%{transform:translateY(-13px) rotate(70deg)}50%{transform:translateY(6px) rotate(160deg)}75%{transform:translateY(-9px) rotate(250deg)}100%{transform:translateY(0) rotate(340deg)}}
@keyframes es-gust{0%{transform:translateX(-24px);opacity:0}12%{opacity:.8}34%,100%{transform:translateX(70px);opacity:0}}
@keyframes es-swing{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}}
@keyframes es-thread{0%,18%,100%{transform:scaleY(.7)}48%,66%{transform:scaleY(1.3)}}
@keyframes es-spider{0%,18%,100%{transform:translateY(-8px)}48%,66%{transform:translateY(8px)}}
@keyframes es-steam{0%{transform:translateY(8px) scaleY(.75);opacity:0}25%{opacity:.8}100%{transform:translateY(-20px) scaleY(1.1);opacity:0}}
@keyframes es-tap{0%,20%,40%,60%,100%{transform:rotate(0)}12%,32%,52%{transform:rotate(-7deg)}}
@keyframes es-dot{0%,19%{opacity:0}20%,86%{opacity:1}87%,100%{opacity:0}}
@keyframes es-dot2{0%,39%{opacity:0}40%,86%{opacity:1}87%,100%{opacity:0}}
@keyframes es-dot3{0%,59%{opacity:0}60%,86%{opacity:1}87%,100%{opacity:0}}
@keyframes es-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){
.es *{animation:none!important}
.es .drift{opacity:1;transform:translateX(120px)}
.es .d2{transform:translateX(190px)}
.es .d3{transform:translateX(40px)}
.es .steam{opacity:.7}
.es .dot{opacity:1}
.es .gust{opacity:0}
}`;

const SCENES: Record<EmptyKind, string> = {
  todo: `<svg ${open}>
<path class="ln soft" d="M204 130V92l11-9v-13l13 7V58l14 12 9-7 8 11v56"/>
<path class="ln thin soft" d="M216 100h12v13h-12zM216 100l12 13M238 92h11v14h-11zM249 92l-11 14"/>
<path class="ln thin rust" d="M204 112l-7 5M259 96l8-4M251 74l6-7"/>
<path class="ln" d="M76 131L83 62C85 42 98 30 118 33"/>
<path class="ln thin" d="M74 131h14M80 106l5 1"/>
<g class="an swing"><path class="ln" d="M118 33v5m-10 0h20l5 13h-30z"/><path class="ln thin rust" d="M111 45l9 6M122 42l5 7"/></g>
${ground}${road}
<path class="ln thin" d="M42 131l-3-8M46 131l1-10M50 131l4-7M168 130l-3-7M172 130l2-9"/>
<g class="gust"><path class="ln thin soft" d="M20 62c20-5 36 5 58 0M36 76c14-4 26 3 42 0"/></g>
<g class="gust g2"><path class="ln thin soft" d="M120 96c20-5 36 5 58 0"/></g>
${leaf(72, "", c.red, "M0 0C6-8 18-8 24 0 18 8 6 8 0 0Z", "M0 0H20M-5 3L0 0")}
${leaf(104, "d2", olive, "M0 0C5-7 15-7 20 0 15 7 5 7 0 0Z", "M0 0H17")}
${leaf(46, "d3", c.warn, "M0 0C4-6 12-6 16 0 12 6 4 6 0 0Z", "M0 0H13")}
</svg>`,
  done: `<svg ${open}>
${ground}
<path class="ln" d="M139 131l3-54M151 130l-1-53"/>
<path class="ln thin" d="M126 131l15-16M164 130l-14-15"/>
<path class="ln" d="M100 76V46c0-11 8-19 19-19h48c11 0 19 8 19 19v30z"/>
<path class="ln" d="M100 46c0-11 8-19 19-19s19 8 19 19v30"/>
<path class="ln thin" d="M146 44h30"/>
<path class="ln thin rust" d="M108 60l6 7M116 52l4 5M170 62l8 9M160 68l5 5M177 34l5 6"/>
<text x="161" y="62" text-anchor="middle" font-family="${font.bodyBold}" font-size="13" fill="${c.paper}">ส่งงาน</text>
<path class="ln" d="M186 54h12v-1"/><path d="M198 53l13 10-5 3-12-9z" fill="${c.red}" stroke="${c.paper}" stroke-width="1.5" stroke-linejoin="round"/>
<path class="ln thin an thread" d="M124 76v26"/>
<g class="spider"><circle cx="124" cy="107" r="5.5" fill="${c.paper}"/><circle cx="124" cy="100" r="3" fill="${c.paper}"/>
<path class="ln thin" d="M119 103l-8-5M118 106l-9 0M118 109l-8 5M120 112l-5 7M129 103l8-5M130 106l9 0M130 109l8 5M128 112l5 7"/></g>
${road}
</svg>`,
  today: `<svg ${open}>
<ellipse class="ln thin rust" cx="208" cy="124" rx="31" ry="10" stroke-dasharray="46 5 22 7"/>
<path class="ln" opacity=".35" d="M6 131c44-4 92 3 138-1s104 3 150-2"/>
<path class="ln soft steam" d="M126 50c-7-7 7-12 0-20s6-11 1-17"/>
<path class="ln soft steam s2" d="M146 50c-7-7 7-12 0-20s6-11 1-17"/>
<path class="ln soft steam s3" d="M166 50c-7-7 7-12 0-20s6-11 1-17"/>
<path class="ln" d="M108 58l3 62c0 6 13 10 35 10s35-4 35-10l3-62"/>
<ellipse class="ln" cx="146" cy="58" rx="38" ry="9"/>
<path d="M116 60c8 4 52 4 60 0-8-3-52-3-60 0z" fill="${c.paper}"/>
<path class="ln" d="M183 72c20-5 28 6 25 19s-16 18-28 14"/><path class="ln" d="M182 83c11-3 15 2 13 9s-7 8-14 7"/>
<path class="ln thin rust" d="M115 86l7 9M170 110l6-7M126 118l5-5"/>
<path class="ln thin soft" d="M136 92c6 8 13 8 19 0-3 12-16 12-19 0z"/>
<circle cx="136" cy="84" r="2" fill="${c.faint}"/><circle cx="155" cy="84" r="2" fill="${c.faint}"/>
<path class="ln thin" d="M60 131l-3-7M64 131l1-9M254 130l3-8M250 130l-2-7"/>
</svg>`,
  notes: `<svg ${open}>
<path d="M60 36c28-8 62-6 90 8v92c-28-14-62-16-90-8z" fill="${c.deck}" stroke="${c.paper}" stroke-width="2" stroke-linejoin="round"/>
<path d="M240 36c-28-8-62-6-90 8v92c28-14 62-16 90-8z" fill="${c.deck}" stroke="${c.paper}" stroke-width="2" stroke-linejoin="round"/>
<path class="ln thin soft" d="M72 56c22-5 46-3 66 5M72 74c22-5 46-3 66 5M72 92c22-5 46-3 66 5M72 110c22-5 46-3 66 5M228 56c-22-5-46-3-66 5M228 74c-22-5-46-3-66 5M228 92c-22-5-46-3-66 5M228 110c-22-5-46-3-66 5"/>
<path class="ln thin rust" d="M222 40l-8 7M76 124l9-3"/>
<circle class="dot" cx="172" cy="100" r="2.4" fill="${c.paper}"/>
<circle class="dot b" cx="182" cy="103" r="2.4" fill="${c.paper}"/>
<circle class="dot c" cx="192" cy="106" r="2.4" fill="${c.paper}"/>
<g class="an pencil">
<path d="M193 104l5-16 33-34 11 11-33 34z" fill="${c.warn}" stroke="${c.paper}" stroke-width="2" stroke-linejoin="round"/>
<path d="M193 104l5-16 11 11z" fill="${c.deck}" stroke="${c.paper}" stroke-width="2" stroke-linejoin="round"/>
<path d="M193 104l1.8-6 4.2 4z" fill="${c.paper}"/>
<path d="M231 54l5-5c2-2 5-2 7 0l4 4c2 2 2 5 0 7l-5 5z" fill="${c.red}" stroke="${c.paper}" stroke-width="2" stroke-linejoin="round"/>
<path class="ln thin" d="M204 83l11 11M224 62l11 11"/>
</g>
</svg>`,
  grades: `<svg ${open}>
<path class="ln" opacity=".35" d="M6 134c44-4 92 3 138-1s104 3 150-2"/>
<g transform="rotate(-4 150 80)">
<path d="M100 22h100c3 0 5 2 5 5v101c0 3-2 5-5 5H100c-3 0-5-2-5-5V27c0-3 2-5 5-5z" fill="${c.deck}" stroke="${c.paper}" stroke-width="2"/>
<rect x="106" y="32" width="88" height="30" rx="6" fill="${c.crt}"/>
<text x="182" y="55" text-anchor="end" font-family="${font.num}" font-size="25" fill="${c.crtOn}">0.00</text>
<rect class="cur" x="184" y="39" width="5" height="17" fill="${c.crtOn}"/>
<g class="ln"><rect x="108" y="72" width="18" height="14" rx="2"/><rect x="133" y="72" width="18" height="14" rx="2"/><rect x="158" y="72" width="18" height="14" rx="2"/><rect x="108" y="92" width="18" height="14" rx="2"/><rect x="158" y="92" width="18" height="14" rx="2"/><rect x="108" y="112" width="18" height="14" rx="2"/><rect x="133" y="112" width="18" height="14" rx="2"/><rect x="158" y="112" width="18" height="14" rx="2"/></g>
<path class="ln thin soft" d="M183 72v54"/>
<path d="M136 92h12v12h-12z" fill="${c.paper}"/>
<path class="ln thin rust" d="M198 112l-6 8M99 40l5 7M99 118l6-5"/>
<g class="an key"><path class="ln thin" d="M142 104v14c0 4 5 4 5 8v10"/><rect x="137" y="136" width="20" height="15" rx="2" fill="${c.deck}" stroke="${c.paper}" stroke-width="2"/></g>
</g>
</svg>`,
};

export const sceneHtml = (kind: EmptyKind) => `<style>${CSS}</style>${SCENES[kind]}`;
