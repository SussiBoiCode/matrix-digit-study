/* 행렬로 읽는 손글씨 — study deck engine + scenes. All data in data/*.js is real project output. */
"use strict";
const stage = document.getElementById("stage");
const slides = [...document.querySelectorAll(".slide")];
const N = slides.length;
const q = new URLSearchParams(location.search);
const css = n => getComputedStyle(stage).getPropertyValue(n).trim();
const rgbOf = n => css(n).split(",").map(Number);

/* ---------- tiny DOM helpers ---------- */
function mk(p, tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; p.append(e); return e; }
function at(e, x, y, w, h) { e.style.left = x + "px"; e.style.top = y + "px"; if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; }
function dl(e, d, d2) { e.style.setProperty("--d", d + "s"); if (d2 != null) e.style.setProperty("--d2", d2 + "s"); return e; }
function lbl(p, x, y, html, d, cls) { return dl(at(mk(p, "div", "lbl " + (cls || "fade"), html), x, y), d); }
function box(p, x, y, w, h, html, d, cls) { return dl(at(mk(p, "div", "box " + (cls || "pop"), html), x, y, w, h), d); }
function arrow(p, x, y, d, ch) { return dl(at(mk(p, "div", "arrow fade", ch || "→"), x, y), d); }
function chip(p, x, y, html, d) { return dl(at(mk(p, "div", "chip ab up", html), x, y), d); }
const NS = "http://www.w3.org/2000/svg";
function svg(p, x, y, w, h) { const s = document.createElementNS(NS, "svg"); s.setAttribute("class", "ab"); s.setAttribute("width", w); s.setAttribute("height", h); s.setAttribute("viewBox", `0 0 ${w} ${h}`); at(s, x, y); p.append(s); return s; }
function sv(s, tag, attrs, cls) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute("class", cls); s.append(e); return e; }
const fx = (v, n = 1) => v.toFixed(n);

/* ---------- digits on canvas ---------- */
function paint(c, arr, o = {}) {
  const n = o.n || 28; c.width = n; c.height = n;
  const ctx = c.getContext("2d"), im = ctx.createImageData(n, n);
  const P = o.rgb ? o.rgb.split(",").map(Number) : rgbOf("--pos"), G = rgbOf("--neg");
  const scale = o.max || 9, a0 = o.alpha == null ? 1 : o.alpha;
  for (let i = 0; i < n * n; i++) {
    const v = arr[i]; if (!v) continue;
    const col = v > 0 ? P : G, a = Math.min(1, Math.abs(v) / scale * a0);
    im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2]; im.data[i * 4 + 3] = Math.round(a * 255);
  }
  ctx.putImageData(im, 0, 0);
}
function digit(p, arr, x, y, s, d, o = {}) {
  const e = at(mk(p, "div", "dg " + (o.cls || "pop") + (o.glow === false ? "" : " glow")), x, y, s, s);
  paint(mk(e, "canvas"), arr, o); dl(e, d); return e;
}
const idxOf = (dgt, set) => DIGITS.y.findIndex((v, i) => v === dgt && DIGITS.set[i] === set);
const V4 = i => DIGITS.V4[i], V1 = i => DIGITS.V1[i];
function cosArr(a, b) { let s = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return s / Math.sqrt(na * nb); }

/* overlap stack: A first colour, B second colour, overlap glows */
function overlap(p, x, y, s, A, B, n, d, px) {
  const st = at(mk(p, "div", "stack"), x, y, s, s);
  const pos = rgbOf("--pos"), neg = rgbOf("--neg"), ov = rgbOf("--ovc");
  const layer = (dd, fn) => { const c = mk(st, "canvas", px ? "px" : ""); c.width = n; c.height = n; dl(c, dd);
    const ctx = c.getContext("2d"), im = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const r = fn(A[i], B[i]); if (!r) continue; im.data[i * 4] = r[0][0]; im.data[i * 4 + 1] = r[0][1]; im.data[i * 4 + 2] = r[0][2]; im.data[i * 4 + 3] = Math.round(r[1] * 255); }
    ctx.putImageData(im, 0, 0); };
  layer(d, a => a > .05 ? [pos, Math.min(1, a) * .9] : null);
  layer(d + .7, (a, b) => b > .05 ? [neg, Math.min(1, b) * .75] : null);
  layer(d + 1.5, (a, b) => Math.min(a, b) > .15 ? [ov, Math.min(1, Math.min(a, b) * 1.3)] : null);
  return st;
}
function legend3(p, x, y, a, b, d) { dl(at(mk(p, "div", "legend ab fade", `<span><i style="--c:var(--pos)"></i>${a}</span><span><i style="--c:var(--neg)"></i>${b}</span><span><i style="--c:var(--ovc)"></i>겹친 곳</span>`), x, y), d); }
function meter(p, x, y, w, label, val, d) {
  lbl(p, x, y, label, d); dl(at(mk(p, "div", "lbl fade num", `<b style="color:var(--acc)">${fx(val, 2)}</b>`), x + w - 70, y), d + .4);
  const tr = at(mk(p, "div", "ab"), x, y + 40, w, 16); tr.style.background = "var(--cell0)"; tr.style.borderRadius = "8px";
  const f = dl(at(mk(tr, "div", "ab grow"), 0, 0, w * val, 16), d + .1); f.style.background = "var(--acc)"; f.style.borderRadius = "8px"; f.style.boxShadow = "var(--glow)";
}

/* bars */
function hbars(p, x, y, w, items, d, o = {}) {
  const rh = o.rh || 66, max = o.max || 100;
  items.forEach(([name, v, cls], i) => {
    const b = at(mk(p, "div", "hbar " + (cls || "")), x, y + i * rh, w);
    mk(b, "span", "nm fade", name).style.setProperty("--d", (d + i * .1) + "s");
    const tr = mk(b, "div", "tr"); const fl = dl(mk(tr, "div", "fl grow"), d + .15 + i * .1); fl.style.width = (v / max * 100) + "%";
    const vl = dl(mk(tr, "span", "vl fade", (o.fmt || (z => fx(z) + "%"))(v)), d + .6 + i * .1); vl.style.left = `calc(${v / max * 100}% + 14px)`;
  });
}
function vbars(p, x, base, bw, gap, items, maxH, max, d, step = .05) {
  items.forEach(([name, v, cls], i) => {
    const h = Math.max(2, v / max * maxH);
    dl(at(mk(p, "div", "vbar growy " + (cls || "")), x + i * (bw + gap), base - h, bw, h), d + i * step);
    if (name != null) lbl(p, x + i * (bw + gap) + bw / 2, base + 10, name, d + i * step, "fade c");
  });
}

/* keyframes injected per scene */
const kfStyle = document.getElementById("kf");
let kfText = "";
function addKF(t) { kfText += t; }

/* ======================= SCENES ======================= */
const SC = {};

SC.cover = v => {
  const D = V4(idxOf(3, "C"));
  const g = at(mk(v, "div", "ab"), 240, 0, 500, 500); g.style.display = "grid"; g.style.gridTemplateColumns = "repeat(28,1fr)"; g.style.gap = "3px";
  D.forEach((val, i) => { const s = mk(g, "span", "pop"); s.style.aspectRatio = "1"; s.style.borderRadius = "3px";
    const a = val / 9; s.style.background = a ? `rgba(${css("--pos")},${a})` : "var(--cell0)"; if (a && stage.classList.contains("dark")) s.style.boxShadow = `0 0 8px rgba(${css("--pos")},${a * .7})`;
    dl(s, .4 + Math.floor(i / 28) * .04 + (i % 28) * .006); });
  const vec = at(mk(v, "div", "ab"), 30, 540, 920, 40); vec.style.display = "flex"; vec.style.borderRadius = "6px"; vec.style.overflow = "hidden"; vec.style.background = "var(--cell0)";
  D.forEach((val, i) => { const e = dl(mk(vec, "i", "fade"), 1.8 + i * .0009); e.style.flex = "1"; e.style.background = `rgba(${css("--pos")},${val / 9})`; });
  lbl(v, 30, 596, "x₁", 2.4); lbl(v, 490, 596, "28줄을 한 줄로 이으면 784칸짜리 벡터 x", 2.4, "fade c"); lbl(v, 900, 596, "x₇₈₄", 2.4);
};

SC.map = v => {
  const parts = [["1", "컴퓨터의 눈", "사진 = 행렬 = 벡터, 닮음 = 내적"], ["2", "데이터와 신경망", "30장, 흐려짐, 굵기 맞춤, 증강, 784-64-10"], ["3", "학습을 수학으로 (내 파트)", "거듭제곱 · 야코비안 · 랭크 · 그람 행렬"], ["4", "성능과 오류 (내 파트)", "공정한 시험, 88.9 vs 82.2, 9, 해상도"], ["5", "정리", "결론, 한계, 웹 앱, 숫자 치트시트"]];
  parts.forEach(([n, t, s], i) => {
    const c = dl(at(mk(v, "div", "card up"), 40, 10 + i * 142, 900, 122), .4 + i * .15);
    c.style.display = "flex"; c.style.alignItems = "center"; c.style.gap = "30px";
    if (i === 2 || i === 3) c.style.borderColor = "var(--acc)";
    c.innerHTML = `<div class="big" style="width:60px">${n}</div><div><div style="font-size:34px;font-weight:500">${t}</div><div class="mu" style="font-size:25px">${s}</div></div>`;
  });
};

SC.zoom = v => {
  const D = V4(idxOf(3, "C"));
  digit(v, D, 0, 70, 420, .5);
  const hb = dl(at(mk(v, "div", "ab pop"), 9 * 15 - 3, 70 + 3 * 15 - 3, 7 * 15 + 6, 7 * 15 + 6), 1.3); hb.style.border = "3px solid var(--acc2)"; hb.style.borderRadius = "6px";
  lbl(v, 0, 510, "28×28 = 784칸", 1.0);
  arrow(v, 440, 250, 1.5);
  lbl(v, 520, 22, "확대: 칸마다 밝기 (0~9단계로 표시)", 1.6);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const val = D[(r + 3) * 28 + c + 9];
    const e = dl(at(mk(v, "div", "cell pop num", String(val)), 520 + c * 64, 70 + r * 64, 58, 58), 1.8 + (r * 7 + c) * .022);
    e.style.background = val ? `rgba(${css("--pos")},${.15 + val / 9 * .75})` : "var(--cell0)"; e.style.color = val > 5 ? "var(--bg)" : "var(--ink)"; e.style.fontSize = "26px";
  }
  chip(v, 520, 540, "사진 1장 = 28×28 <b>행렬</b> = 784칸 <b>벡터 x</b>", 3.2);
  chip(v, 520, 610, "30장 쌓으면 <b>30×784 행렬 X</b>", 3.5);
};

SC.cos = v => {
  const a = V4(idxOf(3, "A")).map(z => z / 9), b = V4(idxOf(3, "C")).map(z => z / 9), c7 = V4(idxOf(7, "C")).map(z => z / 9);
  [[a, b, "A세트 3 + C세트 3", "A의 3", "C의 3", 0], [b, c7, "C세트 3 + C세트 7", "3", "7", 490]].forEach(([A, B, t, la, lb, x], k) => {
    const pn = dl(at(mk(v, "div", "panel pop"), x, 0, 460, 720), .4 + k * .2);
    lbl(v, x + 26, 20, `<b>${t}</b>`, .5 + k * .2);
    overlap(v, x + 50, 74, 360, A, B, 28, 1.0 + k * 1.6, true);
    legend3(v, x + 40, 450, la, lb, 1.6 + k * 1.6);
    meter(v, x + 30, 520, 400, "코사인 (1에 가까울수록 닮음)", cosArr(A, B), 2.6 + k * 1.6);
  });
};

SC.data30 = v => {
  const names = { A: ["A", "보드마커"], B: ["B", "펜 한 번"], C: ["C", "펜 2~3번"] };
  [..."ABC"].forEach((s, r) => {
    lbl(v, 0, 60 + r * 200, `<b style="font-size:34px">${names[s][0]}</b><br>${names[s][1]}`, .4 + r * .5);
    for (let dgt = 0; dgt < 10; dgt++) digit(v, V1(idxOf(dgt, s)), 150 + dgt * 83, 50 + r * 200, 76, .5 + r * .5 + dgt * .04, { glow: false });
  });
  chip(v, 150, 650, "숫자당 <b>3장</b> · 0, 1, 4, 7은 쓰는 모양을 미리 통일", 2.4);
};

SC.blur = v => {
  const pos = css("--pos");
  [[1, "가는 선 (1칸)", 0], [3, "굵은 선 (3칸)", 300]].forEach(([w, t, y], k) => {
    lbl(v, 0, y + 10, t, .4 + k * 1.2);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const on = c >= 2 && c < 2 + w; const e = dl(at(mk(v, "div", "cell pop"), c * 34, y + 54 + r * 34, 30, 30), .5 + k * 1.2 + c * .02);
      e.style.background = on ? `rgba(${pos},1)` : "var(--cell0)";
    }
    arrow(v, 222, y + 130, 1.0 + k * 1.2, "→");
    const val = w / 6; const big = dl(at(mk(v, "div", "cell pop num"), 290, y + 54, 200, 200), 1.2 + k * 1.2);
    big.style.background = `rgba(${pos},${val})`; big.style.border = "1px solid var(--line)"; big.style.fontSize = "30px"; big.textContent = "평균 " + fx(val, 2);
  });
  lbl(v, 0, 600, "평균 내기(R X Rᵀ) = 검은 배경과 섞기 (그림은 예시)", 2.6);
  // real max brightness per set
  lbl(v, 560, 10, "<b>실제: 28×28에서 가장 밝은 값</b> (점 = 사진 1장)", 2.8);
  const x0 = 640, w = 320;
  [..."ABC"].forEach((s, r) => {
    const y = 100 + r * 160;
    lbl(v, 560, y - 8, s, 3.0 + r * .2);
    const tr = at(mk(v, "div", "ab"), x0, y, w, 8); tr.style.background = "var(--cell0)"; tr.style.borderRadius = "4px";
    S.maxV1[s].forEach((m, i) => { const dt = dl(at(mk(v, "div", "ab pop"), x0 + m / 255 * w - 9, y - 5, 18, 18), 3.1 + r * .2 + i * .03); dt.style.borderRadius = "50%"; dt.style.background = s === "B" ? `rgb(${css("--neg")})` : "var(--acc)"; });
    const mn = Math.min(...S.maxV1[s]), mx = Math.max(...S.maxV1[s]);
    lbl(v, x0, y + 26, `${mn}~${mx}`, 3.4 + r * .2);
  });
  lbl(v, x0, 560, "0 ─────────── 255", 3.0);
};

SC.dilate = v => {
  const fr = at(mk(v, "div", "frames"), 0, 60, 380, 380);
  const n = S.dilate.frames.length;
  S.dilate.frames.forEach((src, i) => { const im = mk(fr, "img"); im.src = src; dl(im, .6 + i * .32); });
  const kn = at(mk(v, "div", "knum"), 0, 460);
  for (let i = 0; i < n; i++) { const s = mk(kn, "span", i === n - 1 ? "last" : "", `3×3 최댓값 필터 <b style="color:var(--acc)">${i}번</b>`); dl(s, .6 + i * .32); }
  lbl(v, 0, 10, "B세트 3 (가는 펜), 320×320에서 굵게", .4);
  arrow(v, 405, 230, 3.6);
  const b = idxOf(3, "B");
  lbl(v, 480, 10, "28×28로 줄이면", 3.7);
  digit(v, V1(b), 480, 60, 220, 3.9); lbl(v, 590, 290, "보정 전 V1", 4.0, "fade c");
  digit(v, V4(b), 740, 60, 220, 4.2); lbl(v, 850, 290, "보정 후 V4", 4.3, "fade c");
  chip(v, 480, 380, `이 사진은 k = <b>${S.dilate.k}</b>번`, 4.5);
  chip(v, 480, 450, "목표 굵기 = 숫자 크기의 <b>9%</b>", 4.7);
  chip(v, 480, 520, "k는 사진마다, 그 사진만 보고 정함", 4.9);
};

SC.variants = v => {
  const b = idxOf(3, "B"), v1 = V1(b), mx = Math.max(...v1), v2 = v1.map(z => Math.round(z / mx * 9));
  const imgs = [[v1, "V1 원본", 74.4], [v2, "V2 밝기 맞춤", 75.6], [S.V3[b], "V3 재배치", 76.7], [V4(b), "V4 + 굵기 맞춤", 82.2]];
  imgs.forEach(([a, t, acc], i) => {
    digit(v, a, 20 + i * 245, 20, 200, .4 + i * .25, i === 3 ? { cls: "pop hl" } : {});
    lbl(v, 120 + i * 245, 236, `<b>${t}</b>`, .5 + i * .25, "fade c");
    const h = acc / 100 * 330; dl(at(mk(v, "div", "vbar growy " + (i === 3 ? "hl" : "")), 60 + i * 245, 700 - h, 120, h), 1.6 + i * .2);
    lbl(v, 120 + i * 245, 700 - h - 44, `<b style="font-size:32px">${acc}%</b>`, 2.0 + i * .2, "fade c");
  });
  lbl(v, 20, 300, "P1 정확도 (처음 보는 펜)", 1.5);
};

SC.pca = v => {
  const cols = { A: "--pos", B: "--neg", C: "--c3" };
  const pn = dl(at(mk(v, "div", "panel fade"), 0, 30, 620, 620), .3);
  const t1 = dl(at(mk(v, "div", "lbl fade out", "<b>보정 전 V1</b> · 같은 펜끼리 모임"), 20, 0), .4, 2.7);
  const t2 = dl(at(mk(v, "div", "lbl fade", "<b>보정 후 V4</b> · 같은 숫자끼리 모임"), 20, 0), 3.2);
  DIGITS.y.forEach((dg, i) => {
    const [a1, b1] = S.pca.V1[i], [a2, b2] = S.pca.V4[i];
    const e = mk(v, "div", "pt", String(dg));
    e.style.setProperty("--x1", (310 + a1 * 260) + "px"); e.style.setProperty("--y1", (340 - b1 * 260) + "px");
    e.style.setProperty("--x2", (310 + a2 * 260) + "px"); e.style.setProperty("--y2", (340 - b2 * 260) + "px");
    e.style.background = `rgb(${css(cols[DIGITS.set[i]])})`; dl(e, .6 + i * .02, 2.9);
  });
  dl(at(mk(v, "div", "legend ab fade", '<span><i style="--c:var(--pos)"></i>A</span><span><i style="--c:var(--neg)"></i>B</span><span><i style="--c:var(--c3)"></i>C</span>'), 20, 670), .8);
  lbl(v, 660, 30, "<b>1번 고유벡터가 설명하는 것</b>", 1.0);
  lbl(v, 660, 90, "보정 전 V1", 1.2);
  hbars(v, 790, 140, 170, [["필기구", 74.6, "hl2"], ["숫자", 16.2, ""]], 1.3, { rh: 60 });
  lbl(v, 660, 330, "보정 후 V4", 3.3);
  hbars(v, 790, 380, 170, [["필기구", 16.6, ""], ["숫자", 72.7, "hl"]], 3.4, { rh: 60 });
};

SC.aug = v => {
  const c3 = V4(idxOf(3, "C"));
  digit(v, c3, 0, 250, 220, .4); lbl(v, 110, 480, "<b>원본 1장</b>", .5, "fade c");
  arrow(v, 240, 330, 1.0);
  S.aug.forEach((a, i) => {
    const x = 320 + (i % 3) * 225, y = 10 + Math.floor(i / 3) * 360;
    digit(v, a.img, x, y, 190, 1.1 + i * .2);
    lbl(v, x, y + 200, `회전 ${a.deg}° · 확대 ${a.s}`, 1.3 + i * .2).style.fontSize = "21px";
    lbl(v, x, y + 230, `기울이기 ${a.h}`, 1.35 + i * .2).style.fontSize = "21px";
  });
};

SC.det = v => {
  const a = S.aug[0], A = a.M;
  const sq = at(mk(v, "div", "ab"), 90, 150, 240, 240);
  const base = mk(sq, "div", "ab"); at(base, 0, 0, 240, 240); base.style.border = "2px dashed var(--muted)"; base.style.borderRadius = "4px";
  const t = mk(sq, "div", "ab"); at(t, 0, 0, 240, 240);
  t.style.background = `repeating-linear-gradient(0deg,rgba(${css("--pos")},.35) 0 2px,transparent 2px 40px),repeating-linear-gradient(90deg,rgba(${css("--pos")},.35) 0 2px,transparent 2px 40px),rgba(${css("--pos")},.18)`;
  t.style.border = "2px solid var(--acc)"; t.style.boxShadow = "var(--glow)";
  t.style.setProperty("--m", `matrix(${A[0][0]},${A[1][0]},${A[0][1]},${A[1][1]},0,0)`);
  addKF(`.play .detsq{animation:dsq .9s cubic-bezier(.65,0,.35,1) forwards;animation-delay:1.2s}@keyframes dsq{from{transform:none}to{transform:var(--m)}}`);
  t.classList.add("detsq");
  lbl(v, 0, 20, `<b>정사각형에 A를 곱하면</b> (첫 번째 증강 행렬)`, .4);
  lbl(v, 40, 470, `|det A| = <b style="color:var(--acc)">${a.det}</b> → 넓이 ${a.det}배`, 2.2);
  lbl(v, 560, 20, "<b>실제 증강 6개</b>", 2.4);
  lbl(v, 560, 80, "|det A|", 2.5); lbl(v, 760, 80, "잉크 넓이 비", 2.5);
  S.aug.forEach((g, i) => { lbl(v, 560, 140 + i * 70, `<b class="num">${fx(g.det, 3)}</b>`, 2.7 + i * .15); lbl(v, 760, 140 + i * 70, `<b class="num">${fx(g.area, 3)}</b>`, 2.8 + i * .15); });
  chip(v, 560, 580, "변환 50개 상관계수 <b>0.99996</b>", 3.8);
};

SC.holes = v => {
  const c3 = V4(idxOf(3, "C"));
  [[c3, "원본", "", 0], [S.holes.forward, "던지기 (순방향)", "원래 칸을 1.45배 위치로 던짐 → 구멍", 340], [S.holes.inverse, "가져오기 (M⁻¹)", "새 칸마다 원래 자리에서 읽어 옴", 680]].forEach(([a, t, s, x], i) => {
    lbl(v, x, 70, `<b>${t}</b>`, .4 + i * .9);
    digit(v, a, x, 120, 280, .5 + i * .9, i === 1 ? { cls: "pop hl2" } : i === 2 ? { cls: "pop hl" } : {});
    if (s) dl(at(mk(v, "div", "lbl fade", s), x, 420), .8 + i * .9).style.whiteSpace = "normal";
    v.lastChild.style.width = "280px";
  });
  chip(v, 0, 560, "실제 이미지를 1.45배 확대 · 가져오기는 사이 값을 주변 4칸으로 섞음 (쌍선형 보간)", 3.0);
};

SC.augbars = v => {
  lbl(v, 0, 10, "<b>증강 양에 따른 P1 정확도</b> (784-64-10, V4)", .3);
  hbars(v, 230, 90, 620, [["없음", 71.1], ["×10", 72.2], ["×40 (기본)", 82.2, "hl"], ["×80", 80.0], ["×40 회전만", 70.0, "hl2"]], .5, { rh: 100 });
  chip(v, 0, 620, "같은 사진의 변형본이 시험에 들어가지 않게, <b>나눈 다음</b> 학습 쪽만 증강", 2.0);
};

SC.net = v => {
  const c3 = V4(idxOf(3, "C"));
  digit(v, c3, 0, 290, 150, .3); lbl(v, 75, 450, "x (784)", .4, "fade c");
  lbl(v, 165, 300, "× W₁<br><span class='tag2'>64×784</span>", .8); arrow(v, 170, 380, .8);
  const z = S.fwd.z1, m = Math.max(...z.map(Math.abs)), base = 370, x0 = 260, bw = 4.2, gap = 1.1;
  const ax = at(mk(v, "div", "ab fade"), x0 - 6, base, 64 * (bw + gap) + 12, 2); ax.style.background = "var(--line)"; dl(ax, 1.0);
  z.forEach((val, i) => {
    const h = Math.abs(val) / m * 160, e = mk(v, "div", "vbar " + (val >= 0 ? "pos growy" : "neg fade out"));
    at(e, x0 + i * (bw + gap), val >= 0 ? base - h : base, bw, h); dl(e, 1.1 + i * .012, 3.0);
    e.style.borderRadius = "2px";
  });
  lbl(v, x0, 130, "z₁ = W₁x + b₁ (64개, 실제 값)", 1.1);
  lbl(v, x0, 590, "<b style='color:var(--acc2)'>ReLU</b>: 음수 12개 → 0", 2.9);
  lbl(v, 615, 300, "× W₂<br><span class='tag2'>10×64</span>", 3.4); arrow(v, 620, 380, 3.4);
  vbars(v, 700, 560, 20, 8, S.fwd.p.map((pv, i) => [String(i), pv, i === 3 ? "hl" : ""]), 360, 1, 3.7, .04);
  lbl(v, 700, 130, "softmax → 확률 p", 3.6);
  lbl(v, 700, 620, `'3'일 확률 <b>${fx(S.fwd.p[3] * 100, 1)}%</b>`, 4.3);
};

SC.templates = v => {
  const x = V4(idxOf(3, "C"));
  const sc = S.templates.map(t => t.reduce((s, w, i) => s + w * x[i], 0));
  const best = sc.indexOf(Math.max(...sc));
  const mx = Math.max(...sc.map(Math.abs));
  S.templates.forEach((t, d) => {
    const xx = 10 + (d % 5) * 195, yy = Math.floor(d / 5) * 330;
    digit(v, t, xx, yy, 150, .3 + d * .08, { cls: "pop" + (d === best ? " hl" : ""), glow: false });
    lbl(v, xx + 75, yy + 156, `<b>${d}</b>의 틀`, .5 + d * .08, "fade c");
    const h = Math.max(2, Math.max(0, sc[d]) / mx * 70);
    dl(at(mk(v, "div", "vbar growy " + (d === best ? "hl" : "")), xx + 45, yy + 270 - h, 60, h), 2.2 + d * .06);
  });
  lbl(v, 10, 660, `점수 = 틀 · 사진 (내적) → 가장 큰 점수: <b style="color:var(--acc)">${best}</b>`, 3.0);
};

SC.relu = v => {
  lbl(v, 0, 10, "<b>ReLU가 없으면</b>", .3);
  box(v, 0, 90, 90, 110, "x", .4);
  const w1 = box(v, 150, 70, 170, 150, "W₁<small>64×784</small>", .6, "pop out"); w1.style.setProperty("--d2", "2.0s");
  const w2 = box(v, 380, 70, 170, 150, "W₂<small>10×64</small>", .8, "pop out"); w2.style.setProperty("--d2", "2.0s");
  box(v, 240, 70, 220, 150, "W₂W₁<small>10×784 · 행렬 하나</small>", 2.3, "pop acc");
  arrow(v, 600, 120, 2.6, "="); lbl(v, 660, 110, "층 1개와 같음<br><span class='tag2'>차이 2×10⁻¹⁴</span>", 2.7);
  lbl(v, 0, 330, "<b>ReLU가 있으면</b>", 3.2);
  box(v, 0, 410, 90, 110, "x", 3.3); box(v, 150, 390, 170, 150, "W₁", 3.4);
  const s = svg(v, 350, 400, 160, 130); dl(s, 3.6); s.classList.add("fade");
  sv(s, "polyline", { points: "10,100 80,100 150,20", stroke: "var(--acc2)", "stroke-width": 6, fill: "none" });
  lbl(v, 390, 540, "꺾임", 3.6);
  box(v, 540, 390, 170, 150, "W₂", 3.8);
  lbl(v, 740, 430, "합칠 수 없음<br><span class='tag2'>→ 층이 의미 있음</span>", 4.0);
};

SC.learn = v => {
  const s = svg(v, 0, 60, 560, 400); s.classList.add("fade"); dl(s, .3);
  const f = x => 380 - 300 * Math.pow((x - 280) / 260, 2);
  let d = "M20 " + f(20); for (let x = 30; x <= 540; x += 10) d += ` L${x} ${f(x)}`;
  sv(s, "path", { d, stroke: "var(--muted)", "stroke-width": 4, fill: "none" });
  const xs = [40]; for (let k = 1; k < 7; k++) xs.push(280 - (280 - xs[k - 1]) * .55);
  xs.forEach((x, k) => { const y = f(x) - 16; const c = sv(s, "circle", { cx: x, cy: y, r: 15, fill: k === 6 ? "var(--acc)" : `rgba(${css("--acc2").startsWith("#") ? "255,180,84" : "217,96,59"},${.35 + k * .1})` }, "pop"); c.style.transformBox = "fill-box"; c.style.transformOrigin = "center"; dl(c, .8 + k * .35); });
  lbl(v, 20, 470, "손실(틀린 정도)이 낮은 쪽으로 한 걸음씩", 1.0);
  [["① 얼마나 틀렸나", "δ₂ = p − y"], ["② 거꾸로 전달", "δ₁ = (W₂ᵀδ₂) ⊙ ReLU′"], ["③ 고칠 양", "δ₁xᵀ 만큼 W₁에서 빼기"]].forEach(([t, m], i) => {
    const c = dl(at(mk(v, "div", "card up"), 600, 30 + i * 170, 380, 145), 1.6 + i * .4);
    c.innerHTML = `<div class="mu" style="margin:0">${t}</div><div style="font-size:31px;margin-top:10px">${m}</div>`;
  });
  chip(v, 0, 560, "Adam: 칸마다 보폭이 다름 · 학습률 0.001 · 32장씩 · 80번", 3.2);
  chip(v, 0, 630, "학습 사진 정확도는 늘 <b>100%</b> → 처음 보는 사진으로만 평가", 3.5);
};

SC.power = v => {
  const lam = S.gd.lam, eta = 1 / lam[0], pick = [0, 1, 3, 8, 16, 29], T = 40, H = 400, base = 520;
  lbl(v, 0, 0, `η = 1/λmax 로 학습할 때, 고유방향마다 남은 오차 |1 − ηλ|ᵗ`, .3);
  pick.forEach((k, i) => {
    const l = lam[k], f = Math.abs(1 - eta * l), x = 40 + i * 155;
    const bar = at(mk(v, "div", "vbar hl"), x, 0, 100, H); bar.style.top = "auto"; bar.style.bottom = (730 - base) + "px";
    const frames = []; for (let t = 0; t <= T; t++) frames.push(`${(t / T * 100).toFixed(1)}%{height:${(Math.pow(f, t) * H).toFixed(1)}px}`);
    addKF(`@keyframes pw${i}{${frames.join("")}} .play .pw${i}{animation:pw${i} 3.2s linear forwards;animation-delay:1.2s}`);
    bar.classList.add("pw" + i);
    lbl(v, x + 50, base + 14, `λ = <b>${l >= 1 ? fx(l, 2) : fx(l, 3)}</b>`, .6 + i * .1, "fade c");
    lbl(v, x + 50, base + 54, `×${fx(f, 3)}`, .7 + i * .1, "fade c");
  });
  const kn = at(mk(v, "div", "knum"), 0, 620);
  for (let t = 0; t <= T; t += 5) { const s = mk(kn, "span", t === T ? "last" : "", `t = <b style="color:var(--acc)">${t}</b>번 곱함`); s.style.setProperty("--dur", "0.4s"); dl(s, 1.2 + t / T * 3.2); }
  lbl(v, 420, 620, "가장 작은 λ 방향은 거의 안 줄어듦 → 조건수 719.7", 4.5);
};

SC.eta = v => {
  const W = 880, H = 520, x0 = 70, y0 = 30, s = svg(v, 0, 0, 980, 640);
  const ly = val => y0 + H - (Math.log10(Math.max(val, 1e-4)) + 3) / 7 * H; // -3..4
  sv(s, "line", { x1: x0, y1: y0 + H, x2: x0 + W, y2: y0 + H }, "axis"); sv(s, "line", { x1: x0, y1: y0, x2: x0, y2: y0 + H }, "axis");
  [-3, -2, -1, 0, 1, 2, 3, 4].forEach(e => { const t = sv(s, "text", { x: x0 - 14, y: ly(Math.pow(10, e)) + 8, "text-anchor": "end", fill: "var(--muted)", "font-size": 22 }); t.textContent = "10" + (e < 0 ? "⁻" : "") + "⁰¹²³⁴"[Math.abs(e)]; });
  const tt = sv(s, "text", { x: x0 + W, y: y0 + H + 40, "text-anchor": "end", fill: "var(--muted)", "font-size": 22 }); tt.textContent = "반복 횟수 t → 120";
  const cp = sv(s, "clipPath", { id: "etaclip" }); sv(cp, "rect", { x: x0, y: y0 - 4, width: W, height: H + 4 });
  const cols = { "0.5": "var(--muted)", "1.9": "var(--acc)", "2.05": "var(--acc2)" };
  Object.entries(S.gd.curves).forEach(([k, c], j) => {
    let d = ""; c.forEach((val, i) => { d += (i ? " L" : "M") + (x0 + i / (c.length - 1) * W).toFixed(1) + " " + ly(val).toFixed(1); });
    const p = sv(s, "path", { d, stroke: cols[k], "stroke-width": 5, "clip-path": "url(#etaclip)", pathLength: 1 }, "ln"); dl(p, .6 + j * 1.0);
  });
  lbl(v, 110, 40, "η = 2.05/λmax → <b style='color:var(--acc2)'>발산</b>", 2.8);
  lbl(v, 640, 340, "η = 0.5/λmax → 수렴 (느림)", .9);
  lbl(v, 640, 430, "η = 1.9/λmax → <b style='color:var(--acc)'>수렴</b>", 1.9);
  lbl(v, 70, 610, "손실 − 최소 손실 (로그 눈금), 실제 경사하강", .4);
};

SC.jacchain = v => {
  const items = [["J<sub>softmax</sub>", "10×10", 90, 90], ["W₂", "10×64", 90, 200], ["D = diag(ReLU′)", "64×64", 200, 200], ["W₁", "64×784", 200, 330]];
  let x = 0; const cy = 200;
  items.forEach(([n, d, h, w], i) => {
    const b = box(v, x, cy - h / 2, w, h, "", .4 + i * .3, i === 2 ? "pop acc2" : "pop");
    if (i === 2) { for (let k = 0; k < 8; k++) { const e = at(mk(b, "div", "ab"), 10 + k * 22, 10 + k * 22, 14, 14); e.style.background = k % 3 === 2 ? "transparent" : "var(--acc2)"; e.style.border = "1px solid var(--acc2)"; e.style.borderRadius = "3px"; } }
    lbl(v, x + w / 2, cy + h / 2 + 12, `<b>${n}</b><br>${d}`, .5 + i * .3, "fade c");
    x += w; if (i < 3) { lbl(v, x + 8, cy - 26, "<b style='font-size:40px'>·</b>", .6 + i * .3); x += 40; }
  });
  arrow(v, 430, 420, 1.8, "↓");
  box(v, 330, 490, 330, 90, "∂p/∂x<small>10×784</small>", 2.0, "pop acc");
  chip(v, 0, 620, "비유: 원→달러 ×a, 달러→엔 ×b 이면 원→엔은 <b>×ab</b> (변화율의 곱)", 2.6);
};

SC.polar = v => {
  const s = svg(v, 0, 20, 600, 600), ox = 40, oy = 570, U = 120;
  for (let r = 1; r <= 4; r++) sv(s, "path", { d: `M${ox + r * U} ${oy} A${r * U} ${r * U} 0 0 0 ${ox} ${oy - r * U}`, stroke: "var(--line)", "stroke-width": 2, fill: "none" }, "fade");
  for (let a = 0; a <= 90; a += 15) { const t = a * Math.PI / 180; sv(s, "line", { x1: ox, y1: oy, x2: ox + 4.3 * U * Math.cos(t), y2: oy - 4.3 * U * Math.sin(t), stroke: "var(--line)", "stroke-width": 2 }, "fade"); }
  [...s.children].forEach(c => dl(c, .3));
  const sect = (r1, r2, a1, a2) => { const p = (r, a) => `${ox + r * U * Math.cos(a)} ${oy - r * U * Math.sin(a)}`; return `M${p(r1, a1)} L${p(r2, a1)} A${r2 * U} ${r2 * U} 0 0 0 ${p(r2, a2)} L${p(r1, a2)} A${r1 * U} ${r1 * U} 0 0 1 ${p(r1, a1)} Z`; };
  const A1 = 30 * Math.PI / 180, A2 = 45 * Math.PI / 180;
  [[1, 1.5], [2, 2.5], [3, 3.5]].forEach(([r1, r2], i) => { const e = sv(s, "path", { d: sect(r1, r2, A1, A2), fill: `rgba(${css("--pos")},.75)`, stroke: "var(--acc)", "stroke-width": 2 }, "pop"); e.style.transformBox = "fill-box"; e.style.transformOrigin = "center"; dl(e, 1.0 + i * .5); });
  lbl(v, 640, 30, "같은 dr, 같은 dθ인데", 1.0);
  lbl(v, 640, 80, "<b>바깥 칸일수록 넓다</b> (∝ r)", 2.2);
  [["x = r cos θ,  y = r sin θ", 160], ["J = [cos θ  −r sin θ ; sin θ  r cos θ]", 230], ["<b>det J = r</b>", 310], ["dx dy = r dr dθ", 380]].forEach(([t, y], i) => dl(at(mk(v, "div", "eqline fade", t), 640, y), 2.5 + i * .3).style.fontSize = "30px");
  lbl(v, 640, 480, "증강 변환도 같은 이야기:<br>야코비안 = A, <b>|det A| = 넓이 배율</b>", 3.8);
};

SC.jaccheck = v => {
  lbl(v, 0, 0, `<b>∂p₃/∂x</b> (밝히면 '3' 확률 ↑ 빨강)`, .3);
  digit(v, S.jac.rowTop, 0, 50, 300, .5, { glow: false });
  lbl(v, 340, 0, `<b>∂p₈/∂x</b> ('8'이 2등)`, .7);
  digit(v, S.jac.rowSecond, 340, 50, 300, .9, { glow: false });
  const c = dl(at(mk(v, "div", "card up"), 680, 50, 300, 300), 1.4);
  c.innerHTML = `<div class="mu" style="margin:0">공식(네 행렬의 곱) vs 직접 흔들어 잰 값</div><div class="big" style="margin-top:20px">2.6×10⁻¹⁰</div><div class="sm">최대 차이</div><div class="mu">입력 784칸 전부, ε = 10⁻⁶</div>`;
  lbl(v, 0, 400, "<b>숫자 50,890개 전부 검사</b>", 1.9);
  const tot = 50890, parts = [[44706, "var(--muted)", "정확히 0 (검은 배경·꺼진 뉴런)"], [5926, "var(--acc)", "10⁻⁵ 미만"], [258, "var(--acc2)", "ReLU 꺾임점 근처"]];
  let x = 0; const W = 960;
  parts.forEach(([n, col, t], i) => { const w = Math.max(6, n / tot * W); const e = dl(at(mk(v, "div", "ab grow"), x, 460, w, 46), 2.1 + i * .4); e.style.background = col; e.style.borderRadius = "6px"; x += w + 3; });
  lbl(v, 0, 530, "44,706 정확히 0", 2.3); lbl(v, 0, 570, "나머지 6,184개 중 <b style='color:var(--acc)'>95.8%</b>가 10⁻⁵ 미만 → 전체로는 약 99.5%", 2.8);
  lbl(v, 0, 610, "통과 못 한 258개는 꺾인 점을 넘어간 수치 미분 쪽 문제", 3.2);
};

SC.stamp = v => {
  const X = V4(idxOf(3, "C")), DL = [.9, -.5, .25, -.85, .6, -.3];
  dl(at(mk(v, "div", "panel fade"), 140, 150, 800, 510), .4);
  lbl(v, 140, 104, "종이 = W₁을 고칠 양 · 줄 하나를 28×28로 접어 봄 (64줄 중 6줄)", .6);
  const TX = [180, 450, 720], TY = [180, 420], press = DL.map((_, i) => 1.15 + i * .55);
  const stamp = mk(v, "div", "stamp"); stamp.innerHTML = '<div class="handle"></div><div class="face"><canvas></canvas></div>';
  paint(stamp.querySelector("canvas"), X, { rgb: stage.classList.contains("dark") ? "255,180,84" : "217,96,59" });
  DL.forEach((d, i) => {
    const x = TX[i % 3], y = TY[Math.floor(i / 3)];
    const t = digit(v, X, x, y, 180, press[i] + .02, { rgb: css(d > 0 ? "--pos" : "--neg"), alpha: Math.min(1, Math.abs(d) * 1.1), cls: "pop" });
    lbl(v, x + 90, y + 186, `세기 <b style="color:rgb(${css(d > 0 ? "--pos" : "--neg")})">${d > 0 ? "+" : "−"}${String(Math.abs(d)).replace("0.", ".")}</b>`, press[i] + .1, "fade c");
  });
  const T = 1.15 + 6 * .55 + .4, pct = s => ((s - .8) / T * 100).toFixed(2) + "%", P = i => [TX[i % 3], TY[Math.floor(i / 3)] - 70];
  const k = [`0%{opacity:0;transform:translate(${P(0)[0]}px,${P(0)[1] - 120}px)}`];
  DL.forEach((_, i) => { const [x, y] = P(i), p = press[i];
    k.push(`${pct(p - .3)}{opacity:1;transform:translate(${x}px,${y - 60}px)}`, `${pct(p)}{opacity:1;transform:translate(${x}px,${y}px)}`, `${pct(p + .12)}{opacity:1;transform:translate(${x}px,${y}px)}`, `${pct(p + .25)}{opacity:1;transform:translate(${x}px,${y - 60}px)}`); });
  k.push(`100%{opacity:0;transform:translate(${P(5)[0] + 40}px,${P(5)[1] - 140}px)}`);
  addKF(`@keyframes stampgo{${k.join("")}} .play .stamp{animation:stampgo ${T.toFixed(2)}s cubic-bezier(.45,0,.25,1) forwards;animation-delay:.8s}`);
  dl(at(mk(v, "div", "ab up", '<span class="badge">6장 모두 같은 3, 세기만 다름 → 랭크 1</span>'), 140, 674), 4.6);
};

SC.span = v => {
  [["SGD", S.span.sgd, `남은 비율 <b style="color:var(--acc)">1.4×10⁻¹⁵</b> = 0`, 0], ["Adam", S.span.adam, `남은 비율 <b style="color:var(--acc2)">0.83</b> (이 줄)`, 370]].forEach(([n, D, r, y], k) => {
    const d0 = .4 + k * 2.2;
    lbl(v, 0, y + 80, `<b style="font-size:34px">${n}</b>`, d0);
    digit(v, D.row, 130, y + 20, 190, d0 + .2, { glow: false }); lbl(v, 225, y + 216, "바뀐 양 (한 줄)", d0 + .3, "fade c");
    lbl(v, 340, y + 90, "<b style='font-size:44px'>=</b>", d0 + .6);
    digit(v, D.proj, 400, y + 20, 190, d0 + .8, { glow: false }); lbl(v, 495, y + 216, "사진 20장 공간에 정사영", d0 + .9, "fade c");
    lbl(v, 610, y + 90, "<b style='font-size:44px'>+</b>", d0 + 1.2);
    digit(v, D.res, 670, y + 20, 190, d0 + 1.4, { glow: false, cls: "pop " + (k ? "hl2" : "hl") }); lbl(v, 765, y + 216, "공간 밖으로 남은 것", d0 + 1.5, "fade c");
    lbl(v, 670, y + 262, r, d0 + 1.7);
  });
  lbl(v, 0, 690, "64줄 전체 중앙값: SGD 2×10⁻¹⁵, Adam 0.517", 5.0);
};

SC.rank = v => {
  const s = svg(v, 0, 10, 620, 520), x0 = 60, y0 = 20, W = 540, H = 420;
  const lx = i => x0 + i / 784 * W, ly = val => y0 + H - (Math.log10(Math.max(val, 1e-6)) + 6) / 6 * H;
  sv(s, "line", { x1: x0, y1: y0 + H, x2: x0 + W, y2: y0 + H }, "axis"); sv(s, "line", { x1: x0, y1: y0, x2: x0, y2: y0 + H }, "axis");
  let d = ""; S.rankplot.svaug.forEach((val, i) => { d += (i ? " L" : "M") + lx(i).toFixed(1) + " " + ly(val).toFixed(1); });
  dl(sv(s, "path", { d, stroke: "var(--acc)", "stroke-width": 4, pathLength: 1 }, "ln"), 2.2);
  let d2 = ""; S.rankplot.sv20.forEach((val, i) => { d2 += (i ? " L" : "M") + lx(i).toFixed(1) + " " + ly(val).toFixed(1); }); d2 += ` L${lx(20)} ${y0 + H}`;
  dl(sv(s, "path", { d: d2, stroke: "var(--acc2)", "stroke-width": 5, pathLength: 1 }, "ln"), .6);
  [[20, "var(--acc2)", 1.4], [581, "var(--acc)", 3.1]].forEach(([i, c, dd]) => { const l = sv(s, "line", { x1: lx(i), y1: y0, x2: lx(i), y2: y0 + H, stroke: c, "stroke-width": 2, "stroke-dasharray": "6 6" }, "fade"); dl(l, dd); });
  lbl(v, 90, 6, "<b style='color:var(--acc2)'>원본 20장 → 랭크 20</b>", 1.4);
  lbl(v, 300, 70, "<b style='color:var(--acc)'>증강 820장 → 랭크 581</b>", 3.1);
  lbl(v, 60, 480, "특잇값 크기 (로그) · 가로 = 방향 번호 0~784", .4);
  lbl(v, 660, 10, "<b>증강한 사진들 (실제)</b>", .8);
  S.augSamples.forEach((a, i) => digit(v, a, 660 + (i % 3) * 108, 60 + Math.floor(i / 3) * 108, 96, 1.0 + i * .08, { glow: false }));
  chip(v, 0, 560, "784칸 중 <b>104칸</b>은 늘 0 (가장자리) → 최대 680", 3.8);
  chip(v, 0, 630, "나머지는 변형본끼리 너무 비슷해서 거의 일차종속", 4.1);
};

SC.gramsize = v => {
  const b = dl(at(mk(v, "div", "ab pop"), 0, 60, 420, 420), .4); b.style.border = "3px solid var(--acc2)"; b.style.borderRadius = "10px";
  b.style.background = "repeating-linear-gradient(45deg,var(--cell0) 0 14px,transparent 14px 28px)";
  lbl(v, 0, 10, "<b>XᵀX</b> 102,400×102,400", .5); lbl(v, 0, 500, "약 105억 칸 · <b style='color:var(--acc2)'>41.9 GB</b> → 못 만듦", .9);
  const sm = dl(at(mk(v, "div", "ab pop"), 440, 440, 14, 14), 1.4); sm.style.background = "var(--acc)"; sm.style.boxShadow = "var(--glow)";
  lbl(v, 462, 432, "← 30×30", 1.5);
  const order = DIGITS.y.map((d, i) => i).sort((a, b) => DIGITS.y[a] - DIGITS.y[b] || DIGITS.set[a].localeCompare(DIGITS.set[b]));
  const g = at(mk(v, "div", "mg"), 580, 60, 400, 400); g.style.gridTemplateColumns = "repeat(30,1fr)"; g.style.gap = "1px";
  order.forEach((i, r) => order.forEach((j, c) => { const val = S.cosG[i][j] / 100; const e = dl(mk(g, "i"), 2.0 + (r + c) * .015); e.style.background = `rgba(${css("--pos")},${Math.max(0, val)})`; e.style.borderRadius = "1px"; }));
  lbl(v, 580, 10, "<b>G = XXᵀ</b> 30×30 (실제)", 1.9);
  lbl(v, 580, 480, "칸 = 두 사진의 코사인<br>대각선 블록 = 같은 숫자", 2.6);
  chip(v, 0, 600, "30×30 그람 행렬로 고유벡터: <b>0.057초</b>", 3.2);
};

SC.gramproof = v => {
  const L = [["Gv = λv", "작은 행렬(30×30)의 고유벡터 v"], ["XXᵀv = λv", "G = XXᵀ 를 풀어 씀"], ["Xᵀ(XXᵀv) = λ(Xᵀv)", "양쪽 앞에 Xᵀ 곱하기"], ["(XᵀX)(<b>Xᵀv</b>) = λ(<b>Xᵀv</b>)", "→ Xᵀv 가 큰 행렬의 고유벡터, 고윳값 같음"]];
  L.forEach(([e, n], i) => { dl(at(mk(v, "div", "eqline up", e), 0, 20 + i * 120), .4 + i * .7); lbl(v, 0, 72 + i * 120, n, .6 + i * .7); });
  const c = dl(at(mk(v, "div", "card up"), 0, 520, 960, 120), 3.4);
  c.innerHTML = `<div style="font-size:30px">‖Xᵀv‖² = vᵀXXᵀv = <b style="color:var(--acc)">λ‖v‖²</b> &gt; 0 &nbsp;→&nbsp; λ ≠ 0 이면 Xᵀv ≠ 0</div><div class="mu">그래서 "0이 아닌 고윳값이 같다" · 실제 확인 오차 3×10⁻¹⁶</div>`;
  const vb = dl(at(mk(v, "div", "ab pop"), 640, 40, 30, 170), 2.4); vb.style.background = "var(--acc)"; vb.style.borderRadius = "6px";
  lbl(v, 620, 220, "v (30칸)", 2.5); arrow(v, 700, 100, 2.7); lbl(v, 700, 60, "Xᵀ", 2.7);
  const big = dl(at(mk(v, "div", "ab growy"), 790, 0, 40, 420), 2.9); big.style.background = `linear-gradient(var(--acc),rgba(${css("--pos")},.3))`; big.style.borderRadius = "6px";
  lbl(v, 850, 180, "Xᵀv<br>(102,400칸)", 3.0);
};

SC.gramdet = v => {
  [[90, "1.00"], [60, "0.87"], [30, "0.50"], [0, "0"]].forEach(([deg, area], i) => {
    const x = i * 245, d = .4 + i * .6;
    dl(at(mk(v, "div", "panel pop"), x, 20, 225, 330), d);
    const s = svg(v, x, 40, 225, 240); s.classList.add("fade"); dl(s, d + .1);
    const t = deg * Math.PI / 180, ox = 20, oy = 190, A = 95, bx = 95 * Math.cos(t), by = -95 * Math.sin(t);
    sv(s, "path", { d: `M${ox} ${oy} L${ox + A} ${oy} L${ox + A + bx} ${oy + by} L${ox + bx} ${oy + by} Z`, fill: `rgba(${css("--pos")},.3)`, stroke: "none" });
    sv(s, "line", { x1: ox, y1: oy, x2: ox + A, y2: oy, stroke: "var(--acc)", "stroke-width": 5 });
    sv(s, "line", { x1: ox, y1: oy, x2: ox + bx, y2: oy + by, stroke: "var(--acc2)", "stroke-width": 5 });
    lbl(v, x + 112, 270, `θ = ${deg}°`, d + .2, "fade c");
    lbl(v, x + 112, 300, `넓이² = <b>${deg === 90 ? "1.00" : deg === 60 ? "0.75" : deg === 30 ? "0.25" : "0"}</b>`, d + .3, "fade c");
  });
  lbl(v, 735, 360, "<b style='color:var(--acc2)'>겹침 = 일차종속</b>", 2.5);
  dl(at(mk(v, "div", "eqline up", "det G = |a|²|b|² − (a·b)² = <b>(|a||b| sin θ)²</b>"), 0, 420), 2.8);
  chip(v, 0, 510, "det G = 0 ⟺ 일차종속 (양방향)", 3.3);
  chip(v, 0, 580, "론스키안: '≠ 0이면 독립'만 항상 성립 → 그래서 '같은 역할'", 3.6);
};

SC.eig29 = v => {
  const e = S.gramEig, base = 560, H = 440;
  const h = val => Math.max(4, (Math.log10(Math.max(Math.abs(val), 1e-9)) + 9) / 9 * H);
  e.forEach((val, i) => { const b = dl(at(mk(v, "div", "vbar growy " + (i === 29 ? "" : "hl")), 30 + i * 31, base - h(val), 22, h(val)), .4 + i * .05); if (i === 29) b.style.background = "var(--acc2)"; });
  lbl(v, 30, 600, "평균을 뺀 30장의 그람 행렬 고윳값 (로그 눈금, 실제)", .3);
  lbl(v, 720, 80, "<b style='color:var(--acc2)'>30번째 ≈ 0</b><br>(컴퓨터 오차 수준)", 2.2);
  chip(v, 30, 650, "평균을 뺀 30개를 다 더하면 0 → 하나는 나머지로 결정 → 랭크 29", 2.6);
};

SC.p1 = v => {
  ["A", "B", "C"].forEach((test, f) => {
    const x = f * 330, d = .4 + f * .8;
    dl(at(mk(v, "div", "panel pop"), x, 20, 310, 470), d);
    lbl(v, x + 20, 36, `<b>폴드 ${f + 1}</b> · 시험 = ${test}`, d + .1);
    [..."ABC"].forEach((s, r) => {
      const y = 100 + r * 120, isT = s === test;
      const fr = dl(at(mk(v, "div", "ab fade"), x + 14, y - 8, 282, 100), d + .2); fr.style.border = `2px solid ${isT ? "var(--acc2)" : "var(--line)"}`; fr.style.borderRadius = "12px";
      lbl(v, x + 22, y + 60, `<span style="color:${isT ? "var(--acc2)" : "var(--muted)"};font-size:21px">${isT ? "시험" : "학습"}</span>`, d + .3);
      for (let k = 0; k < 10; k++) digit(v, V1(idxOf(k, s)), x + 22 + k * 27, y + 4, 25, d + .3, { glow: false, cls: "fade" });
    });
  });
  chip(v, 0, 530, "처음 보는 펜 10장으로 시험 · 30장 모두 한 번씩", 2.8);
  chip(v, 0, 600, "<b>나눈 다음</b> 학습 쪽만 증강 · 시드 3개", 3.1);
  chip(v, 520, 600, "3폴드 × 10장 × 시드 3 = <b>90번</b>", 3.4);
  chip(v, 520, 530, "시험 1장 = <b>10%p</b>", 3.6);
};

SC.subspace = v => {
  const sp = S.subspace;
  lbl(v, 0, 150, "<b>시험 사진</b><br>A세트 3 (처음 보는 펜)", .3);
  digit(v, sp.test, 0, 230, 200, .4);
  [[3, sp.proj3, sp.res[3], 260, "hl"], [8, sp.proj8, sp.res[8], 620, "hl2"]].forEach(([dg, img, r, x, cls], k) => {
    const d = 1.0 + k * .9;
    dl(at(mk(v, "div", "panel pop"), x, 0, 340, 340), d);
    lbl(v, x + 20, 16, `<b>${dg}의 방</b> (${sp.dims[dg]}차원)에 비춘 그림자`, d + .1);
    digit(v, img, x + 80, 64, 180, d + .3, { cls: "pop" });
    lbl(v, x + 20, 270, `남은 거리 <b style="color:var(--${k ? "acc2" : "acc"})">${fx(r, 2)}</b>`, d + .5);
  });
  lbl(v, 260, 380, "<b>열 개 방까지 남은 거리</b> (짧을수록 그 숫자)", 2.8);
  const mx = Math.max(...sp.res), mn = Math.min(...sp.res);
  vbars(v, 280, 690, 46, 22, sp.res.map((r, i) => [String(i), r, r === mn ? "hl" : ""]), 230, mx, 3.0);
};

SC.acc = v => {
  hbars(v, 330, 10, 560, [["그람-슈미트 + 증강", 88.9, "hl"], ["신경망 784-64-10", 82.2, "hl2"], ["신경망 784-128-10", 80.0], ["ReLU 없는 2층", 80.0], ["코사인 최근접", 80.0], ["행렬 1개 784→10", 77.8], ["부분공간 (증강 없음)", 73.3], ["릿지 최소제곱", 63.3], ["아무렇게나 찍기", 10.0]], .3, { rh: 72 });
  lbl(v, 330, 670, "P1 정확도 · 88.9% = 90번 중 80번, 82.2% = 74번", 1.8);
};

SC.confusion = v => {
  const M = [[9, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 9, 0, 0, 0, 0, 0, 0, 0, 0], [0, 2, 5, 0, 0, 0, 0, 0, 2, 0], [0, 0, 0, 9, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 9, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 8, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 9, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 9, 0, 0], [0, 0, 0, 2, 0, 0, 0, 0, 7, 0], [0, 3, 0, 0, 0, 3, 0, 3, 0, 0]];
  const cs = 58, x0 = 140, y0 = 60;
  for (let i = 0; i < 10; i++) { lbl(v, x0 + i * cs + 22, y0 - 40, String(i), .3); lbl(v, x0 - 36, y0 + i * cs + 14, String(i), .3); }
  lbl(v, x0 + 590, 20, "예측 →", .2); lbl(v, 40, 0, "정답 ↓", .2);
  M.forEach((row, r) => row.forEach((n, c) => {
    const e = dl(at(mk(v, "div", "cell fade num", n ? String(n) : ""), x0 + c * cs, y0 + r * cs, cs - 4, cs - 4), .6 + (r === c ? r * .08 : 1.4 + r * .05));
    e.style.background = n ? (r === c ? `rgba(${css("--pos")},${.2 + n / 9 * .7})` : `rgba(${css("--neg")},${.35 + n / 9 * .6})`) : "var(--cell0)";
    e.style.color = n && r === c && n > 6 ? "var(--bg)" : "var(--ink)";
  }));
  const hb = dl(at(mk(v, "div", "ab pop"), x0 - 6, y0 + 9 * cs - 6, 10 * cs + 8, cs + 8), 2.6); hb.style.border = "3px solid var(--acc2)"; hb.style.borderRadius = "8px";
  lbl(v, 760, 560, "<b style='color:var(--acc2)'>9: 9번 중 0번</b><br>1, 5, 7로 3번씩", 2.8);
  lbl(v, 760, 120, "신경망 P1<br>합계 <b>74/90</b><br>= 82.2%", 1.8);
};

SC.nine = v => {
  [["A", "둥근 머리 + 곧은 기둥"], ["B", "아주 작은 머리"], ["C", "큰 고리 + 휜 꼬리"]].forEach(([s, t], i) => {
    const x = 20 + i * 330;
    digit(v, V4(idxOf(9, s)), x, 60, 270, .4 + i * .5);
    lbl(v, x + 135, 345, `<b>${s}세트의 9</b>`, .6 + i * .5, "fade c"); lbl(v, x + 135, 385, t, .7 + i * .5, "fade c");
  });
  chip(v, 20, 480, "학습에 쓴 9는 두 장뿐 → 남은 한 장 모양을 일반화 못 함", 2.2);
  chip(v, 20, 550, "신경망 P1·P2 <b>0/9</b> · 부분공간도 P1 1/9, P2 0/9", 2.5);
  chip(v, 20, 620, "웹 앱 모델은 30장 전부 학습 · 그래도 다르게 쓰면 틀릴 수 있음", 2.8);
};

SC.res = v => {
  const A4 = V4(idxOf(3, "B")).map(z => z / 9), B4 = V4(idxOf(3, "C")).map(z => z / 9);
  [[0, "320×320 그대로", "B세트 3 + C세트 3, 실제 이미지", 0.20, 0.25], [500, "28×28 (전처리 V4)", "같은 두 장을 줄였을 때", 0.69, 0.63]].forEach(([x, t, s, c, avg], k) => {
    dl(at(mk(v, "div", "panel pop"), x, 0, 480, 730), .3 + k * .1);
    lbl(v, x + 26, 18, `<b>${t}</b>`, .4); lbl(v, x + 26, 56, s, .5);
    legend3(v, x + 40, 500, "B의 3", "C의 3", 2.6);
    meter(v, x + 30, 560, 420, "이 두 장의 코사인", c, 2.8 + k * .3);
    lbl(v, x + 30, 640, `같은 숫자끼리 평균 ${avg}`, 3.3 + k * .3);
  });
  overlap(v, 550, 100, 380, A4, B4, 28, 1.0, true);
  const go = (a, b) => overlap(v, 50, 100, 380, a, b, 320, 1.0, false);
  if (window._L) go(window._L[0], window._L[1]);
  else loadLarge().then(([a, b]) => { window._L = [a, b]; go(a, b); });
};
function loadGray(src) { return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, o = new Float32Array(c.width * c.height); for (let i = 0; i < o.length; i++) o[i] = d[i * 4] / 255; res(o); }; im.src = src; }); }
function loadLarge() { return Promise.all([loadGray(LARGE.B3), loadGray(LARGE.C3)]); }

SC.concl = v => {
  [["82.2%", "행렬 계산만으로 처음 보는 펜의 숫자를 맞힘"], ["74.4 → 82.2%", "선 굵기를 맞추자 '펜'이 아니라 '숫자'를 봄"], ["88.9%", "교과서의 그람-슈미트 + 정사영이 1등"], ["랭크 20 → 581", "학습은 데이터의 span 안, 증강은 그 공간을 넓힘"], ["78.9 vs 57.8%", "이 데이터에선 28×28이 320×320보다 나음"], ["9 → 0/9", "모양이 다 다르면 2장으론 일반화 못 함"]].forEach(([b, s], i) => {
    const c = dl(at(mk(v, "div", "card up"), (i % 2) * 495, Math.floor(i / 2) * 240, 475, 220), .3 + i * .2);
    c.innerHTML = `<div class="big">${b}</div><div class="sm">${s}</div>`;
  });
};

SC.limits = v => {
  const L = ["데이터 30장 → 결과 흔들림 큼 (1장 = 10%p)", "9처럼 모양이 다른 숫자는 거의 못 맞힘", "0, 1, 4, 7은 모양을 미리 통일함", "320×320은 2번만 학습", "V4는 시험 결과를 보고 고른 셈 (기본값과 같긴 함)", "릿지는 증강하면 63.3 → 47.8%, 원인 미확인"];
  const F = ["손글씨를 더 모아 9 문제 확인", "합성곱 = 큰 희소 행렬(토플리츠)의 곱으로 직접 구현", "320×320에 일부러 흐림 행렬을 곱해 보기"];
  lbl(v, 0, 0, "<b style='font-size:32px;color:var(--acc2)'>한계</b>", .3);
  L.forEach((t, i) => { const c = dl(at(mk(v, "div", "card up"), 0, 60 + i * 108, 560, 92), .4 + i * .15); c.innerHTML = `<div class="sm" style="margin:0">${t}</div>`; });
  lbl(v, 600, 0, "<b style='font-size:32px;color:var(--acc)'>다음에 한다면</b>", 1.4);
  F.forEach((t, i) => { const c = dl(at(mk(v, "div", "card up"), 600, 60 + i * 150, 380, 132), 1.5 + i * .2); c.innerHTML = `<div class="sm" style="margin:0">${t}</div>`; });
};

SC.webapp = v => {
  [["파이프라인", "그린 숫자 → 전처리(V4) → 신경망 8단계"], ["행렬 숫자", "실제 28×28 행렬"], ["템플릿 맞추기", "행렬 1개 모델의 틀 · 내적 = 점수"], ["PCA 지도", "내 그림이 30장 사이 어디쯤"]].forEach(([t, s], i) => {
    const c = dl(at(mk(v, "div", "card up"), (i % 2) * 495, Math.floor(i / 2) * 190, 475, 170), .3 + i * .2);
    c.innerHTML = `<div style="font-size:32px;font-weight:500">${t}</div><div class="sm">${s}</div>`;
  });
  const c = dl(at(mk(v, "div", "card up"), 0, 410, 970, 300), 1.4); c.style.borderColor = "var(--acc)";
  c.innerHTML = `<div style="font-size:32px;font-weight:500">AI 활용 (물어보면 솔직하게)</div><div class="sm" style="font-size:27px">코드는 Claude Code 도움 · 무엇을 곱하고 확인할지는 우리가 정함 · 결과는 직접 확인 (9의 0/9를 혼동행렬과 원본으로) · 심화는 야코비안, 그람, 랭크 3개만 · CNN은 범위 밖이라 안 함 · 보고서 9장에 기록</div>`;
};

SC.cheat = v => {
  const C = [["50,890", "신경망 숫자 개수"], ["82.2 / 77.8", "신경망 P1 / P2"], ["88.9 / 82.2", "부분공간 P1 / P2"], ["74 / 80 of 90", "신경망 / 부분공간"], ["42.47 · 0.0471", "λmax · η 한계"], ["719.7", "조건수"], ["2.6×10⁻¹⁰", "야코비안 최대 차이"], ["2×10⁻¹⁵ / 0.517", "SGD / Adam 남은 비율"], ["20 → 581", "증강 전후 랭크"], ["41.9 GB · 0.057초", "XᵀX vs 그람"], ["0.63 / 0.25", "같은 숫자 코사인 28 / 320"], ["0/9", "숫자 9 (신경망)"]];
  C.forEach(([b, s], i) => { const c = dl(at(mk(v, "div", "card up"), (i % 3) * 330, Math.floor(i / 3) * 182, 310, 166), .2 + i * .08); c.innerHTML = `<div class="big" style="font-size:40px">${b}</div><div class="sm">${s}</div>`; });
};

/* ======================= ENGINE ======================= */
function buildAll() {
  kfText = "";
  slides.forEach(s => { const v = s.querySelector(".vis"); if (!v) return; v.innerHTML = ""; const f = SC[v.dataset.scene]; if (f) try { f(v); } catch (e) { console.error(v.dataset.scene, e); } });
  kfStyle.textContent = kfText;
}
function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `scale(${s})`; stage.style.left = (innerWidth - 1920 * s) / 2 + "px"; stage.style.top = (innerHeight - 1080 * s) / 2 + "px"; }
addEventListener("resize", fit); fit();

let cur = 0;
const secEl = stage.querySelector(".sec"), barEl = stage.querySelector(".bar b"), cntEl = stage.querySelector(".count");
function show(n) {
  cur = Math.max(0, Math.min(N - 1, n));
  slides.forEach((s, i) => { s.classList.remove("play"); if (i === cur) { s.classList.add("active"); void s.offsetWidth; s.classList.add("play"); } else s.classList.remove("active"); });
  barEl.style.setProperty("--p", ((cur + 1) / N * 100) + "%"); cntEl.textContent = (cur + 1) + " / " + N; secEl.textContent = slides[cur].dataset.sec || "";
  try { localStorage.setItem("mds-slide", cur); } catch (e) {}
  if (history.replaceState) history.replaceState(null, "", "#" + cur);
  menuMark();
  if (q.has("still")) requestAnimationFrame(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }));
}
function setTheme(t) {
  stage.className = t; const d = t === "dark";
  document.querySelector("#theme .ic").textContent = d ? "☾" : "☀"; document.querySelector("#theme .tx").textContent = d ? "다크" : "라이트";
  document.querySelector('meta[name="theme-color"]').content = d ? "#0b0f17" : "#ffffff";
  try { localStorage.setItem("mds-theme", t); } catch (e) {}
  buildAll();
}

/* menu */
const menu = document.getElementById("menuPanel");
function buildMenu() {
  let html = "", last = "";
  slides.forEach((s, i) => { const part = s.dataset.part || ""; if (part !== last) { html += (last ? "</div>" : "") + `<div><div class="part">${part}</div>`; last = part; }
    html += `<a href="#${i}" data-i="${i}"><span>${String(i + 1).padStart(2, "0")}</span>${s.dataset.title || ""}</a>`; });
  menu.innerHTML = `<button class="btn" id="menuClose"><span class="ic">✕</span></button>` + html + "</div>";
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); menu.classList.remove("open"); show(+a.dataset.i); }));
  document.getElementById("menuClose").addEventListener("click", e => { e.stopPropagation(); menu.classList.remove("open"); });
}
function menuMark() { menu.querySelectorAll("a").forEach(a => a.classList.toggle("cur", +a.dataset.i === cur)); }

document.getElementById("theme").addEventListener("click", e => { e.stopPropagation(); setTheme(stage.className === "dark" ? "light" : "dark"); show(cur); });
document.getElementById("replay").addEventListener("click", e => { e.stopPropagation(); show(cur); });
document.getElementById("menu").addEventListener("click", e => { e.stopPropagation(); menu.classList.add("open"); menuMark(); });
menu.addEventListener("click", e => e.stopPropagation());
addEventListener("keydown", e => {
  if (menu.classList.contains("open")) { if (e.key === "Escape") menu.classList.remove("open"); return; }
  if (["ArrowRight", "ArrowDown", " ", "Enter", "PageDown"].includes(e.key)) { e.preventDefault(); show(cur + 1); }
  else if (["ArrowLeft", "ArrowUp", "Backspace", "PageUp"].includes(e.key)) { e.preventDefault(); show(cur - 1); }
  else if (e.key === "Home") show(0); else if (e.key === "End") show(N - 1);
});
let wheelLock = 0;
addEventListener("wheel", e => { if (menu.classList.contains("open")) return; const t = Date.now(); if (t < wheelLock) return; wheelLock = t + 900; e.deltaY > 0 ? show(cur + 1) : show(cur - 1); }, { passive: true });
let tx = null, ty = null, moved = false;
addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; moved = false; }, { passive: true });
addEventListener("touchend", e => {
  if (tx == null || menu.classList.contains("open")) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { moved = true; dx < 0 ? show(cur + 1) : show(cur - 1); }
  tx = null;
});
addEventListener("click", e => { if (moved) { moved = false; return; } if (menu.classList.contains("open")) return; (e.clientX < innerWidth / 3) ? show(cur - 1) : show(cur + 1); });
addEventListener("contextmenu", e => { e.preventDefault(); show(cur - 1); });

buildMenu();
let savedTheme = null, savedSlide = 0; try { savedTheme = localStorage.getItem("mds-theme"); savedSlide = +localStorage.getItem("mds-slide") || 0; } catch (e) {}
const ready = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]) : Promise.resolve();
ready.then(() => {
  setTheme(q.get("theme") || savedTheme || "light");
  const h = parseInt(location.hash.slice(1));
  show(isNaN(h) ? savedSlide : h);
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js");
