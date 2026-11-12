// Gera as imagens do README do perfil a partir dos sprites do portfólio.
// Uso: node gerar.mjs <pasta-do-site> <pasta-de-saida>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [site, out] = process.argv.slice(2)
const S = await import(pathToFileURL(join(site, 'src/sprites.ts')).href)
const { PALETTE, HERO, HERO_BLINK, CATS, ICONS, PORTRAIT, PORTRAIT_BLINK } = S
mkdirSync(out, { recursive: true })

const font = f => readFileSync(join(site, 'src/fonts', f)).toString('base64')
const FONTS = `@font-face{font-family:P2;src:url(data:font/woff2;base64,${font('press-start-2p-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:DG;src:url(data:font/woff2;base64,${font('dotgothic16-latin-400-normal.woff2')}) format('woff2')}`

const C = {
  ink: '#0b0b1e', text: '#f4f4f4', muted: '#aab2dc', dim: '#6c74a8', gold: '#ffd23f', goldD: '#c98a1a',
  pink: '#ff5c8a', pinkD: '#b8305e', cyan: '#59e0ff', green: '#6bd66b', line: '#7f89c9',
  w: ['#4456d8', '#3647c2', '#2b3aab', '#233093', '#1c287c'],
}
const SKY = ['#06061a', '#09092a', '#0d0d33', '#12113d', '#181647', '#201b52', '#2a205c', '#372566', '#472a6e', '#5b3074']

// Sorteio previsível, para a imagem não mudar a cada geração.
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Sprite em texto -> um <path> por cor, juntando pixels vizinhos da mesma linha. */
function sprite(rows, x, y, p, { from = 0, to = rows.length } = {}) {
  const byColor = {}
  for (let r = from; r < to; r++) {
    const line = rows[r]
    let c = 0
    while (c < line.length) {
      const ch = line[c]
      if (ch === '.' || !PALETTE[ch]) { c++; continue }
      let e = c
      while (e < line.length && line[e] === ch) e++
      ;(byColor[ch] ??= []).push(`M${x + c * p} ${y + r * p}h${(e - c) * p}v${p}h${-(e - c) * p}z`)
      c = e
    }
  }
  return Object.entries(byColor).map(([ch, d]) => `<path fill="${PALETTE[ch]}" d="${d.join('')}"/>`).join('')
}

/** Retângulo com cantos recortados em degrau, como as janelas do portfólio. */
function notch(x, y, w, h, c) {
  return `M${x + c} ${y}H${x + w - c}V${y + c}H${x + w}V${y + h - c}H${x + w - c}V${y + h}H${x + c}V${y + h - c}H${x}V${y + c}H${x + c}Z`
}

let gid = 0
/** Janela de JRPG: contorno escuro, borda branca, filete azul e fundo em degradê. */
function windowBox(x, y, w, h, { fill } = {}) {
  const id = `g${gid++}`
  const stops = C.w.map((c, i) => `<stop offset="${i / (C.w.length - 1)}" stop-color="${c}"/>`).join('')
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>
<path fill="${C.ink}" d="${notch(x, y, w, h, 6)}"/>
<path fill="${C.text}" d="${notch(x + 3, y + 3, w - 6, h - 6, 3)}"/>
<path fill="${C.line}" d="${notch(x + 6, y + 6, w - 12, h - 12, 3)}"/>
<path fill="${fill ?? `url(#${id})`}" d="${notch(x + 8, y + 8, w - 16, h - 16, 2)}"/>`
}

const svg = (w, h, body, css = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">
<style>${FONTS}
.p2{font-family:P2,monospace}.dg{font-family:DG,monospace}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${body}
</svg>
`

/** Texto com sombra de 1 pixel embaixo, legível sobre qualquer fundo. */
const text = (x, y, s, { size = 16, color = C.text, cls = 'dg', anchor = 'start', shadow = C.ink, extra = '' } = {}) =>
  `<text class="${cls}" x="${x + 2}" y="${y + 2}" font-size="${size}" fill="${shadow}" text-anchor="${anchor}">${esc(s)}</text>` +
  `<text class="${cls}" x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`

// ---------------------------------------------------------------- cabeçalho
function header() {
  const W = 840, H = 340, GROUND = 222
  let b = ''
  const band = Math.ceil(GROUND / SKY.length)
  SKY.forEach((c, i) => (b += `<rect x="0" y="${i * band}" width="${W}" height="${band + 1}" fill="${c}"/>`))
  b += `<rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#0a0920"/>`

  // estrelas
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * W / 3) * 3, y = Math.floor(rand() * 150 / 3) * 3
    const s = rand() < 0.15 ? 6 : 3
    const col = rand() < 0.5 ? '#ffffff' : rand() < 0.5 ? '#9a9ad0' : '#c8c8f0'
    b += `<rect class="tw" style="animation-delay:-${(rand() * 4).toFixed(2)}s;animation-duration:${(2 + rand() * 3).toFixed(2)}s" x="${x}" y="${y}" width="${s}" height="${s}" fill="${col}"/>`
  }

  // estrela cadente
  b += `<g class="shoot"><rect x="0" y="0" width="6" height="3" fill="#fff"/><rect x="-9" y="-3" width="9" height="3" fill="#c8c8f0"/><rect x="-21" y="-6" width="12" height="3" fill="#8a8ac0"/><rect x="-36" y="-9" width="15" height="3" fill="#5a5a94"/></g>`

  // lua em pixels (com o coelho em cima)
  const mx = 772, my = 52, r = 30, px = 3
  for (let yy = -r; yy <= r; yy += px) for (let xx = -r; xx <= r; xx += px) {
    if (xx * xx + yy * yy > r * r) continue
    const col = xx + yy > r * 0.5 ? '#d9cf9f' : '#f6efcf'
    b += `<rect x="${mx + xx}" y="${my + yy}" width="${px}" height="${px}" fill="${col}"/>`
  }
  ;[[-12, -9, 6], [6, 6, 9], [-6, 12, 3]].forEach(([dx, dy, s]) => (b += `<rect x="${mx + dx}" y="${my + dy}" width="${s}" height="${s}" fill="#e4d9aa"/>`))

  // cidade
  let x = 0
  while (x < W) {
    const bw = 30 + Math.floor(rand() * 5) * 9
    const bh = 36 + Math.floor(rand() * 9) * 9
    const top = GROUND - bh
    const far = rand() < 0.4
    b += `<rect x="${x}" y="${top}" width="${bw}" height="${bh}" fill="${far ? '#100e2a' : '#1a1842'}"/>`
    for (let wy = top + 9; wy < GROUND - 9; wy += 12) for (let wx = x + 6; wx < x + bw - 6; wx += 9) {
      const r2 = rand()
      if (r2 < 0.45) continue
      const lit = r2 > 0.72
      const cls = lit && rand() < 0.25 ? ` class="win" style="animation-delay:-${(rand() * 6).toFixed(1)}s"` : ''
      b += `<rect${cls} x="${wx}" y="${wy}" width="3" height="6" fill="${lit ? (rand() < 0.75 ? '#ffd23f' : '#ff9f43') : '#2a2650'}"/>`
    }
    x += bw + (rand() < 0.3 ? 9 : 0)
  }

  // título no céu
  b += text(36, 64, 'LUCAS BOROTO', { size: 32, color: C.gold, cls: 'p2', shadow: '#b8305e' })
  b += text(38, 100, 'Dev fundador · Taubaté, SP', { size: 22, color: C.cyan })
  b += text(38, 128, 'Programador na Hermanos TI e criador do Casamy', { size: 18, color: C.muted })

  // personagem e gatos
  const P = 4, hx = 566, hy = GROUND - HERO.length * P
  b += `<g>${sprite(HERO, hx, hy, P, { from: 28 })}</g>`
  b += `<g class="breathe">${sprite(HERO, hx, hy, P, { to: 28 })}<g class="blink">${sprite(HERO_BLINK, hx, hy, P, { from: 12, to: 15 })}</g></g>`
  const cat = (frames, cx, delay) => {
    const cy = GROUND - frames.normal.length * P
    return `<g>${sprite(frames.normal, cx, cy, P, { to: 11 })}` +
      `<g class="tailA" style="animation-delay:${delay}s">${sprite(frames.normal, cx, cy, P, { from: 11 })}</g>` +
      `<g class="tailB" style="animation-delay:${delay}s">${sprite(frames.tail, cx, cy, P, { from: 11 })}</g>` +
      `<g class="blink" style="animation-delay:${delay + 1.3}s">${sprite(frames.blink, cx, cy, P, { from: 5, to: 7 })}</g></g>`
  }
  b += cat(CATS.lili, 488, 0)
  b += cat(CATS.todinho, 670, -0.7)

  // caixa de diálogo com texto digitado
  const bx = 18, by = 232, bw = W - 36, bh = 96
  b += windowBox(bx, by, bw, bh)
  b += `<path fill="${C.ink}" d="${notch(bx + 18, by - 16, 120, 30, 3)}"/><path fill="${C.pink}" d="${notch(bx + 21, by - 13, 114, 24, 2)}"/>`
  b += `<text class="p2" x="${bx + 78}" y="${by + 5}" font-size="12" fill="${C.ink}" text-anchor="middle">LUCAS</text>`
  const lines = ['Ah, um visitante! Bem-vindo ao meu GitHub.', 'Aperte JOGAR aqui embaixo para abrir meu portfólio.']
  const SIZE = 22, CW = SIZE / 2, DUR = 10
  let t0 = 0.03
  lines.forEach((ln, i) => {
    const id = `type${i}`, n = ln.length, t1 = t0 + n * 0.004
    const steps = Array.from({ length: n + 1 }, (_, k) => k)
    const times = [0, ...steps.map(k => +(t0 + (t1 - t0) * (k / n)).toFixed(4)), 1]
    const vals = [0, ...steps.map(k => k * CW + (k === n ? 4 : 0)), n * CW + 4]
    b += `<defs><clipPath id="${id}"><rect x="${bx + 30}" y="${by + 14 + i * 34}" height="34" width="0"><animate attributeName="width" dur="${DUR}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.join(';')}" values="${vals.join(';')}"/></rect></clipPath></defs>`
    b += `<g clip-path="url(#${id})">${text(bx + 30, by + 40 + i * 34, ln, { size: SIZE })}</g>`
    t0 = t1 + 0.04
  })
  b += `<g class="cursor"><path fill="${C.gold}" d="M${bx + bw - 40} ${by + bh - 30}h15v3h-3v3h-3v3h-3v-3h-3v-3h-3z"/></g>`

  const css = `.tw{animation:tw 3s steps(2) infinite}@keyframes tw{50%{opacity:.25}}
.win{animation:win 7s steps(1) infinite}@keyframes win{40%{fill:#2a2650}70%{fill:#ffd23f}}
.breathe{animation:br 1.4s steps(1) infinite}@keyframes br{50%{transform:translateY(4px)}}
.blink{opacity:0;animation:bl 4.5s steps(1) infinite}@keyframes bl{0%{opacity:0}94%{opacity:1}98%{opacity:0}}
.tailA{animation:ta 2.4s steps(1) infinite}@keyframes ta{50%{opacity:0}}
.tailB{opacity:0;animation:tb 2.4s steps(1) infinite}@keyframes tb{50%{opacity:1}}
.cursor{animation:cu 1s steps(1) infinite}@keyframes cu{50%{transform:translateY(4px)}}
.shoot{animation:sh 9s linear infinite;opacity:0}@keyframes sh{0%{transform:translate(120px,20px);opacity:0}3%{opacity:1}12%{transform:translate(420px,130px);opacity:0}100%{opacity:0;transform:translate(420px,130px)}}`
  return svg(W, H, b, css)
}

// ---------------------------------------------------------------- ficha (STATUS)
function status() {
  const W = 840, H = 300
  let b = windowBox(0, 0, W, H)
  b += text(30, 46, 'STATUS', { size: 18, color: C.gold, cls: 'p2' })
  // retrato
  const P = 5, px = 34, py = 70
  b += `<path fill="${C.ink}" d="${notch(px - 8, py - 8, 24 * P + 16, 19 * P + 16, 3)}"/><rect x="${px - 4}" y="${py - 4}" width="${24 * P + 8}" height="${19 * P + 8}" fill="#12113d"/>`
  b += sprite(PORTRAIT, px, py, P) + `<g class="blink">${sprite(PORTRAIT_BLINK, px, py, P, { from: 12, to: 15 })}</g>`
  b += text(px + 60, py + 19 * P + 34, 'LV 1', { size: 14, color: C.gold, cls: 'p2', anchor: 'middle' })
  b += text(px + 60, py + 19 * P + 58, 'iOS e Android', { size: 15, color: C.muted, anchor: 'middle' })

  const lx = 200
  const row = (y, k, v, col = C.text) => text(lx, y, k, { size: 17, color: C.muted }) + text(lx + 130, y, v, { size: 17, color: col })
  b += row(84, 'NOME', 'Lucas Boroto')
  b += row(112, 'CLASSE', 'Dev fundador', C.cyan)
  b += row(140, 'ONDE', 'Taubaté, SP · topa remoto')
  b += row(168, 'AGORA', 'Programador júnior na Hermanos TI')
  // barra de EXP
  b += text(lx, 204, 'EXP', { size: 17, color: C.muted })
  const bx = lx + 130, bw = 220
  b += `<rect x="${bx}" y="190" width="${bw}" height="16" fill="${C.ink}"/><rect x="${bx + 3}" y="193" width="${bw - 6}" height="10" fill="#12113d"/>`
  b += `<rect class="exp" x="${bx + 3}" y="193" width="${Math.round((bw - 6) * 0.35)}" height="10" fill="${C.green}"/><rect x="${bx + 3}" y="193" width="${Math.round((bw - 6) * 0.35)}" height="3" fill="#b6f5b6"/>`
  b += text(bx + bw + 12, 205, '35%', { size: 15, color: C.green })
  b += text(lx, 234, 'PRÓXIMO NÍVEL: Casamy na web', { size: 15, color: C.gold })

  // equipamento
  const ex = 652
  b += text(ex, 84, 'EQUIPAMENTO', { size: 15, color: C.gold })
  const eq = [['scroll', 'TypeScript'], ['shield', 'Supabase + RLS'], ['phone', 'React Native'], ['spark', 'Claude (IA)'], ['pen', 'Figma']]
  eq.forEach(([ic, name], i) => {
    const y = 104 + i * 32, icon = ICONS[ic]
    b += sprite(icon, ex, y + (9 - icon.length) * 1.5, 3) + text(ex + 36, y + 22, name, { size: 16 })
  })
  const css = `.blink{opacity:0;animation:bl 4.5s steps(1) infinite}@keyframes bl{0%{opacity:0}94%{opacity:1}98%{opacity:0}}
.exp{animation:ex 2s steps(8) 1 both}@keyframes ex{from{transform:scaleX(0)}to{transform:scaleX(1)}}.exp{transform-origin:333px 0}`
  return svg(W, H, b, css)
}

// ---------------------------------------------------------------- cartões de missão
function quest({ icon, name, state, when, loot }) {
  const W = 412, H = 210
  let b = windowBox(0, 0, W, H)
  const ic = ICONS[icon]
  b += sprite(ic, 28, 28 + (13 - ic.length) * 1.5, 3)
  b += text(28 + ic[0].length * 3 + 14, 52, name, { size: 20, color: C.gold })
  const done = state === 'done'
  const label = done ? 'CONCLUÍDA' : 'EM ANDAMENTO', col = done ? C.green : C.cyan
  const tw = label.length * 8 + 20
  b += `<path fill="${C.ink}" d="${notch(28, 70, tw, 24, 2)}"/>` + text(28 + tw / 2, 88, label, { size: 16, color: col, anchor: 'middle', shadow: 'none' })
  b += text(28 + tw + 12, 88, when, { size: 15, color: C.muted })
  loot.forEach((l, i) => {
    b += `<path fill="${C.gold}" d="M30 ${118 + i * 28}h6v3h3v3h-3v3h-6z" transform="translate(0 -3)"/>`
    b += text(48, 124 + i * 28, l, { size: 16 })
  })
  return svg(W, H, b)
}

// ---------------------------------------------------------------- botões
function button(label, icon, { cta = false } = {}) {
  const H = 52
  const dg = /[À-ÿ]/.test(label), size = cta ? 18 : 16
  const ic = icon && ICONS[icon], ip = ic && ic.length > 9 ? 2 : 3
  const iconW = cta ? 32 : ic ? ic[0].length * ip + 12 : 0
  const w = 22 + iconW + Math.ceil(label.length * size * (dg ? 0.5 : 1)) + 28
  let b = windowBox(0, 0, w, H)
  let x = 22
  if (cta) {
    b += `<g class="cur">${sprite(ICONS.cursor, x, 18, 2)}</g>`
    x += 32
  } else if (ic) {
    b += sprite(ic, x, (H - ic.length * ip) / 2, ip)
    x += iconW
  }
  b += text(x, 34, label, { size, color: cta ? C.gold : C.text, cls: dg ? 'dg' : 'p2' })
  const css = `.cur{animation:cu .8s steps(1) infinite}@keyframes cu{50%{transform:translateX(4px)}}`
  return svg(w, H, b, css)
}

// ---------------------------------------------------------------- rodapé
function save() {
  const W = 840, H = 96
  let b = windowBox(0, 0, W, H)
  b += sprite(ICONS.chestOpen, 30, 34, 3)
  b += text(80, 46, 'PROGRESSO SALVO.', { size: 16, color: C.gold, cls: 'p2' })
  b += text(80, 72, 'Valeu pela visita! A Lili e o Todinho mandam um miau.', { size: 17, color: C.muted })
  b += `<g class="st">${sprite(ICONS.star, W - 60, 34, 3)}</g>`
  const css = `.st{animation:st 1.2s steps(1) infinite}@keyframes st{50%{opacity:.3}}`
  return svg(W, H, b, css)
}

const files = {
  'header.svg': header(),
  'status.svg': status(),
  'quest-casamy.svg': quest({ icon: 'casamy', name: 'Casamy', state: 'done', when: 'iOS e Android', loot: ['Quiz que monta a lista da casa nova', 'Link da família, sem instalar nada', 'Nia, a assistente com IA'] }),
  'quest-casamy-next.svg': quest({ icon: 'phone', name: 'Casamy na web', state: 'wip', when: 'próxima etapa', loot: ['Lista completa no navegador', 'Sem precisar instalar o app', 'Família inteira na mesma lista'] }),
  'quest-portfolio.svg': quest({ icon: 'star', name: 'Portfólio JRPG', state: 'done', when: 'out 2026', loot: ['Sprites desenhados como texto', 'Música 8-bit gerada no navegador', '8 segredos escondidos'] }),
  'quest-conty.svg': quest({ icon: 'chest', name: 'Desafios Conty', state: 'done', when: '7 desafios · out 2026', loot: ['Webhooks, retry, timeout e 429', 'Atribuição por cupom e UTM', 'Classificador de views falsas'] }),
  'btn-jogar.svg': button('JOGAR O PORTFÓLIO', null, { cta: true }),
  'btn-linkedin.svg': button('LINKEDIN', 'linkedin'),
  'btn-x.svg': button('X', 'x'),
  'btn-instagram.svg': button('INSTAGRAM', 'instagram'),
  'btn-email.svg': button('E-MAIL', 'mail'),
  'btn-discord.svg': button('DISCORD', 'heart'),
  'btn-casamy.svg': button('CASAMY', 'casamy'),
  'save.svg': save(),
}
for (const [name, content] of Object.entries(files)) writeFileSync(join(out, name), content)
console.log(Object.entries(files).map(([n, c]) => `${n} ${(c.length / 1024).toFixed(0)}KB`).join('\n'))
