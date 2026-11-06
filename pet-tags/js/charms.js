import * as THREE from 'three';

// 3D-модели подвесок, фигурок и новых бусин + текстуры узоров адресника.
// Подвески строятся «висящими»: точка (0,0,0) — колечко на шнурке, фигурка ниже.

const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.4, ...o });
const metal = (color, roughness = 0.2) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness });
const sphere = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
};
const lum = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Псевдослучайность с зерном — узор не «прыгает» при каждой перерисовке
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hang(body, ringColor = '#e6c35c') {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 10, 24), metal(ringColor));
  ring.rotation.y = Math.PI / 2;
  ring.position.y = -0.05;
  body.position.y -= 0.36;
  g.add(ring, body);
  return g;
}

// ---------- Мордочки (подвеска и фигурка на адреснике) ----------
export function teddyHead(color = '#c8956a') {
  const g = new THREE.Group();
  const fur = mat(color, { roughness: 0.85, clearcoat: 0, sheen: 1, sheenColor: '#ffffff' });
  const dark = mat(new THREE.Color(color).multiplyScalar(0.72), { roughness: 0.85, clearcoat: 0 });
  const light = mat(new THREE.Color(color).lerp(new THREE.Color('#fff4e6'), 0.45), { roughness: 0.8, clearcoat: 0 });
  const black = mat('#1d1414', { roughness: 0.2, clearcoat: 1 });
  g.add(sphere(0.26, fur, 0, 0, 0, 1, 0.95, 0.85));
  g.add(sphere(0.13, light, 0, -0.08, 0.17, 1.1, 0.8, 0.8));
  g.add(sphere(0.045, black, 0, -0.04, 0.27));
  g.add(sphere(0.032, black, -0.09, 0.05, 0.2), sphere(0.032, black, 0.09, 0.05, 0.2));
  const earL = sphere(0.12, dark, -0.25, -0.03, 0.02, 0.6, 1.25, 0.5);
  const earR = sphere(0.12, dark, 0.25, -0.03, 0.02, 0.6, 1.25, 0.5);
  earL.rotation.z = 0.35;
  earR.rotation.z = -0.35;
  g.add(earL, earR);
  return g;
}

export function kittyHead(color = '#f2c48d') {
  const g = new THREE.Group();
  const fur = mat(color, { roughness: 0.8, clearcoat: 0, sheen: 1 });
  const pink = mat('#ff9fb8', { roughness: 0.5 });
  const black = mat('#1d1414', { roughness: 0.2, clearcoat: 1 });
  g.add(sphere(0.25, fur, 0, 0, 0, 1.08, 0.92, 0.8));
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 16), fur);
    ear.position.set(0.15 * s, 0.22, 0);
    ear.rotation.z = -0.35 * s;
    g.add(ear);
    g.add(sphere(0.03, black, 0.09 * s, 0.04, 0.19));
  }
  g.add(sphere(0.03, pink, 0, -0.04, 0.21, 1.3, 0.8, 1));
  return g;
}

function bow(color) {
  const g = new THREE.Group();
  const m = lum(color) > 0.75 || color === '#d3d6db' ? metal(color, 0.18) : mat(color, { clearcoat: 1, roughness: 0.25 });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 12, 32), m);
    loop.scale.set(1.25, 0.8, 0.6);
    loop.position.set(0.13 * s, 0.02, 0);
    loop.rotation.z = 0.35 * s;
    g.add(loop);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.3, 10), m);
    tail.position.set(0.08 * s, -0.15, 0);
    tail.rotation.z = 0.45 * s;
    g.add(tail);
  }
  g.add(sphere(0.05, m));
  return g;
}

// ---------- Подвески ----------
function strawberry(color = '#e0283a') {
  const g = new THREE.Group();
  const pts = [[0, -0.27], [0.08, -0.22], [0.16, -0.1], [0.2, 0.03], [0.18, 0.13], [0.1, 0.19], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat(color, { roughness: 0.2, clearcoat: 1 })));
  const seed = mat('#ffe27a', { roughness: 0.4 });
  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, y = -0.18 + r() * 0.3;
    const rad = 0.2 * Math.sin(((y + 0.27) / 0.47) * Math.PI * 0.95) + 0.005;
    g.add(sphere(0.014, seed, Math.cos(a) * rad, y, Math.sin(a) * rad));
  }
  const leaf = mat('#3c9a47', { roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const l = sphere(0.07, leaf, 0, 0, 0, 0.55, 0.25, 1.4);
    const a = (i / 5) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.07, 0.2, Math.sin(a) * 0.07);
    l.rotation.y = -a;
    g.add(l);
  }
  return g;
}

function croissant() {
  const g = new THREE.Group();
  const m = mat('#e0a458', { roughness: 0.55, clearcoat: 0.3 });
  const d = mat('#c27a33', { roughness: 0.55 });
  const sizes = [0.07, 0.1, 0.13, 0.15, 0.13, 0.1, 0.07];
  sizes.forEach((s, i) => {
    const a = Math.PI * (1.15 + (i / (sizes.length - 1)) * 0.7);
    g.add(sphere(s, i % 2 ? d : m, Math.cos(a) * 0.24, Math.sin(a) * 0.24 + 0.2, 0, 1, 0.9, 1));
  });
  return g;
}

function duck(color = '#ffd23f') {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.3, clearcoat: 1 });
  g.add(sphere(0.2, m, 0, -0.05, 0, 1.2, 0.85, 1));
  g.add(sphere(0.13, m, 0.1, 0.15, 0));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 16), mat('#ff8c2a'));
  beak.position.set(0.25, 0.13, 0);
  beak.rotation.z = -Math.PI / 2;
  g.add(beak, sphere(0.022, mat('#1d1414'), 0.16, 0.2, 0.09));
  return g;
}

// ---------- Новые бусины ----------
function letterDisc(color, letter) {
  const tex = canvasTex(128, 128, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = lum(color) > 0.6 ? '#1f1f28' : '#ffffff';
    c.font = '800 80px Montserrat, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.translate(64, 66);
    c.rotate(-Math.PI / 2); // крышка цилиндра после поворота смотрит вперёд: подгоняем ориентацию буквы
    c.fillText((letter || 'А').toUpperCase(), 0, 0);
  });
  const side = mat(color, { clearcoat: 1, roughness: 0.25 });
  const face = mat('#ffffff', { map: tex, clearcoat: 1, roughness: 0.25 });
  const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.13, 40);
  const m = new THREE.Mesh(geo, [side, face, face]);
  m.rotation.x = Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

function daisy(color) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const r = 0.17 * (0.72 + 0.28 * Math.abs(Math.cos(2.5 * t)));
    i ? s.lineTo(Math.cos(t) * r, Math.sin(t) * r) : s.moveTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3 });
  geo.center();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat(color, { clearcoat: 1, roughness: 0.3 })));
  g.add(sphere(0.06, mat('#ffffff', { roughness: 0.4 }), 0, 0, 0.07, 1, 1, 0.6));
  return g;
}

function tennis(color) {
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 9;
    for (const off of [0, Math.PI]) {
      c.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h / 2 + Math.sin((x / w) * Math.PI * 4 + off) * h * 0.28;
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  });
  return new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), mat('#ffffff', { map: tex, roughness: 0.85, clearcoat: 0, sheen: 1, sheenColor: '#f4ffd0' }));
}

// Бусины и подвески, которых нет в базовом наборе сцены
export function buildExtraBead(b) {
  const c = b.color;
  switch (b.type) {
    case 'disc': return letterDisc(c, b.letter);
    case 'daisy': return daisy(c);
    case 'tennis': return tennis(c);
    case 'ch-strawberry': return hang(strawberry(c));
    case 'ch-croissant': return hang(croissant());
    case 'ch-teddy': { const h = teddyHead(c); h.scale.setScalar(0.95); return hang(h); }
    case 'ch-kitty': { const h = kittyHead(c); h.scale.setScalar(0.95); return hang(h); }
    case 'ch-bow': return hang(bow(c));
    case 'ch-duck': return hang(duck(c));
    default: return null;
  }
}

export const isCharm = (type) => String(type).startsWith('ch-');

// Фигурка поверх адресника
export function buildTopper(id, color) {
  if (id === 'teddy') return teddyHead(color || '#d9b38c');
  if (id === 'kitty') return kittyHead(color || '#f2c48d');
  if (id === 'bow') return bow(color || '#f28bb0');
  return null;
}

// ---------- Узоры адресника ----------
// Текстура ложится на лицевую/обратную сторону: UV крышек = координаты формы (−1.8…1.8).
export function patternMaps(id, base) {
  if (!id || id === 'none') return null;
  const S = 1024;
  const r = rng(id.length * 97 + parseInt(base.slice(1), 16));
  const light = lum(base) > 0.6;
  let metalMap = null;
  const map = canvasTex(S, S, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, S, S);
    if (id === 'stripes') {
      c.fillStyle = light ? 'rgba(255,255,255,.85)' : '#fbf7f0';
      if (light) c.fillStyle = 'rgba(0,0,0,.08)';
      for (let x = 0; x < S; x += 110) c.fillRect(x, 0, 55, S);
    } else if (id === 'dots') {
      c.fillStyle = light ? '#ffffff' : '#fbf7f0';
      if (light) c.fillStyle = 'rgba(0,0,0,.12)';
      for (let y = 0, row = 0; y < S + 60; y += 85, row++) {
        for (let x = row % 2 ? 42 : 0; x < S + 60; x += 85) { c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.fill(); }
      }
    } else if (id === 'leopard') {
      for (let i = 0; i < 70; i++) {
        const x = r() * S, y = r() * S, rad = 22 + r() * 26;
        c.fillStyle = '#3a2214';
        c.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2, rr = rad * (0.75 + r() * 0.45);
          k ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
        c.fill();
        c.fillStyle = new THREE.Color(base).multiplyScalar(0.8).getStyle();
        c.beginPath();
        c.arc(x, y, rad * 0.42, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === 'marble') {
      for (let i = 0; i < 9; i++) {
        c.strokeStyle = `rgba(${light ? '90,90,110' : '255,255,255'},${0.18 + r() * 0.25})`;
        c.lineWidth = 2 + r() * 6;
        c.beginPath();
        c.moveTo(-50, r() * S);
        c.bezierCurveTo(S * 0.3, r() * S, S * 0.6, r() * S, S + 50, r() * S);
        c.stroke();
      }
    } else if (id === 'goldleaf') {
      c.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(r() * S, r() * S, 200, 60, r() * 3, 0, Math.PI * 2); c.fill(); }
    }
  });
  if (id === 'goldleaf') {
    // хлопья поталь снизу: и цвет, и «металличность» в отдельной карте
    const flakes = [];
    for (let i = 0; i < 260; i++) {
      const x = r() * S, y = S * 0.6 + Math.pow(r(), 0.7) * S * 0.4;
      const pts = Array.from({ length: 5 + Math.floor(r() * 3) }, (_, k) => {
        const a = (k / 7) * Math.PI * 2 + r(), rr = 6 + r() * 26;
        return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
      });
      flakes.push(pts);
    }
    const drawFlakes = (c, color) => {
      c.fillStyle = color;
      for (const pts of flakes) { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
    };
    drawFlakes(map.image.getContext('2d'), '#d8b04a');
    map.needsUpdate = true;
    metalMap = canvasTex(S, S, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, S, S); drawFlakes(c, '#fff'); }, false);
  }
  for (const t of [map, metalMap].filter(Boolean)) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 3.6, 1 / 3.6);
    t.offset.set(0.5, 0.5);
    t.flipY = true;
  }
  return { map, metalMap };
}
