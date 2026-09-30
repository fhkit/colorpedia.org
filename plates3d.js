/*! plates3d.js - 3D "stacked saturation plates" view for colorpedia.org.
 * Self-contained, no dependencies. Canvas 2D, perspective orbit camera,
 * painter's algorithm per plate (exact for parallel plates).
 *
 *   const v = window.createPlates3D(container, {
 *     plates: [{ key, label, hexR, cells: [{ hex, x, y }, ...] }, ...], // top plate first
 *     nameOf: hex => string,          // hover label
 *     onHover: hex|null => void,      // desktop hover
 *     onPick: hex => void,            // click / tap on a tile
 *     onFocusChange: key|null => void // plate brought face-on, null = whole stack
 *   });
 *   v.setSelected(hex|null); v.setFilter(Set<hex>|null); v.focusPlate(key|null);
 *   v.resize(); v.destroy();
 *
 * The view never selects on its own: onPick reports the tile, the host decides
 * whether to call setSelected(). onFocusChange fires whenever the focused plate
 * changes (double-click/tap, plate label, "All plates", Reset, Esc, or focusPlate()).
 */
(function () {
  "use strict";

  var DEG = Math.PI / 180;
  var DEF = { yaw: -20, pitch: 30, zoom: 1, explode: 0.65 };
  var GAP_MIN = 0.035, GAP_MAX = 1.3;               // plate spacing in plate radii
  var PITCH_MIN = 6, PITCH_MAX = 90, ZOOM_MIN = 0.45, ZOOM_MAX = 12;
  var FAINT_ALPHA = 0.13;
  var RIM_N = 72;
  var FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  var HEXCOS = [], HEXSIN = [];
  for (var h6 = 0; h6 < 6; h6++) { HEXCOS.push(Math.cos(h6 * 60 * DEG)); HEXSIN.push(Math.sin(h6 * 60 * DEG)); }
  var RIMCOS = new Float32Array(RIM_N), RIMSIN = new Float32Array(RIM_N);
  for (var rj = 0; rj < RIM_N; rj++) { RIMCOS[rj] = Math.cos(rj / RIM_N * 2 * Math.PI); RIMSIN[rj] = Math.sin(rj / RIM_N * 2 * Math.PI); }

  var CSS =
    ".p3d-root{position:absolute;inset:0;overflow:hidden;color:#e9e9ee;font:12.5px/1.3 " + FONT + ";-webkit-user-select:none;user-select:none}" +
    ".p3d-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none}" +
    ".p3d-canvas.p3d-drag{cursor:grabbing}" +
    ".p3d-canvas:focus-visible{box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}" +
    ".p3d-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;gap:8px;pointer-events:none}" +
    ".p3d-bar>*{pointer-events:auto}" +
    ".p3d-top{position:absolute;left:10px;right:10px;top:8px;display:flex;align-items:center;gap:8px;pointer-events:none;min-height:26px}" +
    ".p3d-top>*{pointer-events:auto}" +
    ".p3d-lbl{color:#a7a7b4;font-size:12px}" +
    ".p3d-hint{color:#a7a7b4;font-size:11.5px;pointer-events:none!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}" +
    ".p3d-cur{font-weight:600;font-size:12.5px;pointer-events:none!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}" +
    ".p3d-range{width:140px;min-width:60px;flex:0 1 140px;margin:0;height:22px;accent-color:#e9e9ee;background:transparent;cursor:pointer}" +
    ".p3d-btn{font:inherit;font-size:12px;color:#e9e9ee;background:transparent;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:4px 9px;line-height:1.25;cursor:pointer;white-space:nowrap}" +
    ".p3d-btn:hover{background:rgba(255,255,255,.08)}" +
    ".p3d-btn:focus-visible{outline:2px solid #e9e9ee;outline-offset:1px}" +
    ".p3d-tip{position:absolute;left:0;top:0;pointer-events:none;display:none;z-index:3;background:rgba(11,12,16,.92);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:4px 8px;font-size:12px;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}" +
    ".p3d-tip b{font-weight:600}" +
    ".p3d-tip span{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#a7a7b4;margin-left:6px}";

  function ensureStyle() {
    if (document.getElementById("p3d-style")) return;
    var st = document.createElement("style");
    st.id = "p3d-style";
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function normHex(h) { return String(h || "").trim().toLowerCase(); }

  function createPlates3D(container, opts) {
    if (!container) throw new Error("createPlates3D: container required");
    opts = opts || {};
    var nameOf = typeof opts.nameOf === "function" ? opts.nameOf : function (h) { return h; };
    var onHover = typeof opts.onHover === "function" ? opts.onHover : null;
    var onPick = typeof opts.onPick === "function" ? opts.onPick : null;
    var onFocusChange = typeof opts.onFocusChange === "function" ? opts.onFocusChange : null;

    // ------------------------------------------------------------ data
    var src = opts.plates || [];
    var P = src.length;
    var PLATES = [];
    var N = 0;
    for (var k0 = 0; k0 < P; k0++) N += (src[k0].cells || []).length;
    var HEX = new Array(N), PL = new Uint8Array(N), X = new Float32Array(N), Z = new Float32Array(N);
    var FAINT = new Uint8Array(N);
    var byPlate = [];
    var instances = new Map();                        // hex -> [indices]  (white is on every plate)
    var n = 0;
    for (var k = 0; k < P; k++) {
      var p = src[k], cells = p.cells || [];
      var hexR = +p.hexR || 1;
      // centre = the white cell (else the centroid)
      var cx = 0, cy = 0, found = false;
      for (var c = 0; c < cells.length; c++) {
        if (normHex(cells[c].hex) === "#ffffff") { cx = +cells[c].x; cy = +cells[c].y; found = true; break; }
      }
      if (!found && cells.length) {
        for (c = 0; c < cells.length; c++) { cx += +cells[c].x; cy += +cells[c].y; }
        cx /= cells.length; cy /= cells.length;
      }
      var maxD = 0;
      for (c = 0; c < cells.length; c++) {
        var dx = cells[c].x - cx, dy = cells[c].y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxD) maxD = d;
      }
      var s = 1 / Math.max(maxD + hexR * 0.87, 1e-6);  // tile edges (not centres) reach radius 1
      var ids = [];
      for (c = 0; c < cells.length; c++) {
        var hx = normHex(cells[c].hex);
        HEX[n] = hx; PL[n] = k; X[n] = (cells[c].x - cx) * s; Z[n] = (cells[c].y - cy) * s;
        ids.push(n);
        if (!instances.has(hx)) instances.set(hx, []);
        instances.get(hx).push(n);
        n++;
      }
      PLATES.push({ key: String(p.key), label: String(p.label != null ? p.label : p.key), hexR: hexR * s, n: cells.length, rim: 1 + hexR * s * 0.35 });
      byPlate.push(ids);
    }
    function plateIndex(key) {
      if (key == null) return -1;
      for (var i = 0; i < P; i++) if (PLATES[i].key === String(key)) return i;
      return -1;
    }

    // ------------------------------------------------------------ DOM
    ensureStyle();
    var prevPosition = null;
    if (getComputedStyle(container).position === "static") { prevPosition = container.style.position; container.style.position = "relative"; }
    var root = el("div", "p3d-root", container);
    var canvas = el("canvas", "p3d-canvas", root);
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "3D stack of colour plates by saturation. Drag to rotate, scroll or pinch to zoom, click a colour to pick it, double-click a plate to view it face-on.");
    var ctx = canvas.getContext("2d");
    var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

    var top = el("div", "p3d-top", root);
    var backBtn = el("button", "p3d-btn", top);
    backBtn.type = "button"; backBtn.textContent = "‹ All plates"; backBtn.title = "Back to the whole stack (Esc)";
    var curLbl = el("span", "p3d-cur", top);
    var hint = el("span", "p3d-hint", top);
    hint.textContent = coarse ? "Double-tap a plate or its label to view it face-on" : "Double-click a plate or click its label to view it face-on";

    var bar = el("div", "p3d-bar", root);
    var exLbl = el("label", "p3d-lbl", bar); exLbl.textContent = "Explode";
    var range = el("input", "p3d-range", bar);
    range.type = "range"; range.min = "0"; range.max = "100"; range.step = "1";
    range.value = String(Math.round(DEF.explode * 100));
    range.setAttribute("aria-label", "Spread the plates apart");
    var rid = "p3d-ex-" + Math.random().toString(36).slice(2, 8);
    range.id = rid; exLbl.htmlFor = rid;
    var resetBtn = el("button", "p3d-btn", bar);
    resetBtn.type = "button"; resetBtn.textContent = "Reset view";
    var tip = el("div", "p3d-tip", root);

    // ------------------------------------------------------------ state
    var view = { yaw: DEF.yaw, pitch: DEF.pitch, zoom: DEF.zoom, explode: DEF.explode, focusT: 0, swap: 1, panX: 0, panY: 0 };
    var focusK = -1, focusPrev = -1, focusWanted = -1;
    var selectedHex = null, hovered = -1;
    var W = 0, H = 0, DPR = 1;
    var inset = { l: 12, r: 12, t: 12, b: 12 };
    var uiRects = [];
    var labelW = new Float32Array(P);
    var small = false;
    var SX = new Float32Array(N), SY = new Float32Array(N), SS = new Float32Array(N), VIS = new Uint8Array(N);
    var plateY = new Float32Array(P), plateAlpha = new Float32Array(P);
    var plateRim = [];
    for (var pr = 0; pr < P; pr++) plateRim.push(new Float32Array(RIM_N * 2));
    var rimOk = new Uint8Array(P);
    var order = [];
    var labelRects = [];
    var cam = null;
    var destroyed = false;
    var tmp = { x: 0, y: 0, s: 0, ok: false };

    function gap() { return GAP_MIN + view.explode * (GAP_MAX - GAP_MIN); }

    function layout() {
      var r = root.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      DPR = Math.min(window.devicePixelRatio || 1, 3);
      var bw = Math.max(1, Math.round(W * DPR)), bh = Math.max(1, Math.round(H * DPR));
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      small = W < 520;
      var tb = top.getBoundingClientRect(), bb = bar.getBoundingClientRect();
      inset = { l: 12, r: 12, t: Math.max(12, tb.bottom - r.top + 6), b: Math.max(12, r.bottom - bb.top + 6) };
      uiRects = [];
      var kids = [backBtn, hint, curLbl, exLbl, range, resetBtn];
      for (var i = 0; i < kids.length; i++) {
        var q = kids[i].getBoundingClientRect();
        if (q.width > 0) uiRects.push({ l: q.left - r.left, t: q.top - r.top, r: q.right - r.left, b: q.bottom - r.top });
      }
      for (var k = 0; k < P; k++) labelW[k] = measureLabel(k).w;
    }

    // ------------------------------------------------------------ camera
    function setupCamera(shiftX, scaleF) {
      var g = gap(), Hs = (P - 1) * g;
      for (var k = 0; k < P; k++) plateY[k] = ((P - 1) / 2 - k) * g;
      var ft = view.focusT;
      var fy = 0;
      if (focusK >= 0) {
        fy = plateY[focusK];
        if (focusPrev >= 0) fy = plateY[focusPrev] + (fy - plateY[focusPrev]) * view.swap;
      }
      var ty = fy * ft;
      var rho = Math.sqrt(1 + (Hs / 2) * (Hs / 2));
      var D = 5.2 * Math.max(rho, 1.25);
      var aw = Math.max(40, W - inset.l - inset.r), ah = Math.max(40, H - inset.t - inset.b);
      var fitStack = Math.min(aw / 2.2, ah / (Math.sqrt(Hs * Hs + 4) * 1.12));
      var fitPlate = Math.min(aw, ah) / 2.1;
      var scale = view.zoom * (fitStack + (fitPlate - fitStack) * ft) * (scaleF || 1);
      var yr = view.yaw * DEG, prr = view.pitch * DEG;
      var cyw = Math.cos(yr), syw = Math.sin(yr), cp = Math.cos(prr), sp = Math.sin(prr);
      var ocx = inset.l + aw / 2, ocy = inset.t + ah / 2;
      cam = {
        r0: cyw, r2: -syw,
        u0: -syw * sp, u1: cp, u2: -cyw * sp,
        b0: syw * cp, b1: sp, b2: cyw * cp,
        D: D, ty: ty, scale: scale,
        ocx: ocx, ocy: ocy,
        cx: ocx + view.panX + (shiftX || 0), cy: ocy + view.panY,
        camY: ty + sp * D
      };
    }
    function project(x, y, z, out) {
      var c = cam, dy = y - c.ty;
      var vx = x * c.r0 + z * c.r2;
      var vy = x * c.u0 + dy * c.u1 + z * c.u2;
      var vz = x * c.b0 + dy * c.b1 + z * c.b2;
      var d = c.D - vz;
      if (d < c.D * 0.08) { out.ok = false; return out; }
      var s = c.scale * c.D / d;
      out.x = c.cx + vx * s; out.y = c.cy - vy * s; out.s = s; out.ok = true;
      return out;
    }

    function labelAlpha() {
      return Math.max(0, Math.min(1, (80 - view.pitch) / 20)) * (1 - view.focusT);
    }
    // left-most rim point on screen, per plate
    function labelAnchor(k, out) { return project(-cam.r0 * PLATES[k].rim, plateY[k], -cam.r2 * PLATES[k].rim, out); }
    function labelsCrowded(anch) {
      for (var k = 0; k + 1 < P; k++) if (Math.abs(anch[k + 1].y - anch[k].y) < (small ? 22 : 25)) return true;
      return false;
    }

    function projectAll() {
      for (var i = 0; i < N; i++) {
        project(X[i], plateY[PL[i]], Z[i], tmp);
        VIS[i] = tmp.ok ? 1 : 0; SX[i] = tmp.x; SY[i] = tmp.y; SS[i] = tmp.s;
      }
      for (var k = 0; k < P; k++) {
        var rim = plateRim[k], R = PLATES[k].rim, ok = 1;
        for (var j = 0; j < RIM_N; j++) {
          project(R * RIMCOS[j], plateY[k], R * RIMSIN[j], tmp);
          if (!tmp.ok) ok = 0;
          rim[2 * j] = tmp.x; rim[2 * j + 1] = tmp.y;
        }
        rimOk[k] = ok;
      }
    }

    function computeFrame() {
      setupCamera(0, 1);
      // keep the plate labels clear of the tiles: if the labels do not fit left of
      // the stack, shift the stack right and, if needed, shrink it a little
      var la = labelAlpha() * Math.max(0, Math.min(1, 2 - view.zoom));
      if (la > 0.01 && P > 0) {
        var anch = [], maxX = -Infinity, need = 0;
        for (var k = 0; k < P; k++) anch.push(labelAnchor(k, {}));
        var crowded = labelsCrowded(anch);
        var topK = frontPlateGuess();
        for (k = 0; k < P; k++) {
          if (!anch[k].ok) continue;
          if (crowded && k !== topK) continue;
          var req = labelW[k] + 12 + 6;
          if (req - anch[k].x > need) need = req - anch[k].x;
        }
        if (need > 0.5) {
          for (k = 0; k < P; k++) {
            var R = PLATES[k].rim;
            var q = project(cam.r0 * R, plateY[k], cam.r2 * R, tmp);
            if (q.ok && q.x > maxX) maxX = q.x;
          }
          var slack = Math.max(0, (W - 8) - maxX);
          var shift = Math.min(need, slack);
          var f = 1;
          var rest = need - shift;
          if (rest > 0.5) {
            // after the shift, label k's anchor sits at a + shift; scaling about the
            // centre cxS by f moves it to cxS - (cxS - a - shift) * f, which must be >= req
            var cxS = cam.cx + shift;
            for (k = 0; k < P; k++) {
              if (!anch[k].ok || (crowded && k !== topK)) continue;
              var rq = labelW[k] + 18, ak = anch[k].x + shift;
              if (ak < rq && cxS - ak > 1) f = Math.min(f, (cxS - rq) / (cxS - ak));
            }
            f = Math.max(0.7, Math.min(1, f));
          }
          setupCamera(shift * la, 1 - (1 - f) * la);
        }
      }
      for (k = 0; k < P; k++) {
        var newInFront = focusK < focusPrev;
        if (focusK < 0) plateAlpha[k] = 1;
        else if (k === focusK) plateAlpha[k] = focusPrev >= 0 && newInFront ? view.swap : 1;
        else if (k === focusPrev) plateAlpha[k] = newInFront ? 1 : 1 - view.swap;
        else plateAlpha[k] = 1 - view.focusT;
      }
      projectAll();
      order = [];
      for (k = 0; k < P; k++) order.push(k);
      order.sort(function (a, b) { return Math.abs(plateY[b] - cam.camY) - Math.abs(plateY[a] - cam.camY); });
    }
    function frontPlateGuess() {
      var best = 0, bd = Infinity;
      for (var k = 0; k < P; k++) { var d = Math.abs(plateY[k] - cam.camY); if (d < bd) { bd = d; best = k; } }
      return best;
    }

    // ------------------------------------------------------------ render
    function polyPath(pts, len) {
      ctx.moveTo(pts[0], pts[1]);
      for (var j = 2; j < len; j += 2) ctx.lineTo(pts[j], pts[j + 1]);
      ctx.closePath();
    }
    function hexPath(i, grow, offs) {
      var x = SX[i], y = SY[i], s = SS[i] * grow;
      ctx.moveTo(x + offs[0] * s, y + offs[1] * s);
      for (var k = 1; k < 6; k++) ctx.lineTo(x + offs[2 * k] * s, y + offs[2 * k + 1] * s);
      ctx.closePath();
    }
    function hexOffsets(k) {
      // flat-top hexagon in the plate plane (site geometry: vertices at 0, 60, ... deg)
      var r = PLATES[k].hexR, c = cam, o = new Float32Array(12);
      for (var j = 0; j < 6; j++) {
        var wx = r * HEXCOS[j], wz = r * HEXSIN[j];
        o[2 * j] = wx * c.r0 + wz * c.r2;
        o[2 * j + 1] = -(wx * c.u0 + wz * c.u2);
      }
      return o;
    }
    var edgeBuf = new Float32Array(RIM_N * 2);

    function drawPlate(k) {
      var a = plateAlpha[k];
      if (a < 0.02 || !rimOk[k]) return;
      ctx.globalAlpha = a;
      var rim = plateRim[k];
      var above = cam.camY > plateY[k];
      var th = 0.022 * (above ? 1 : -1), R = PLATES[k].rim, eok = true;
      for (var j = 0; j < RIM_N; j++) {
        project(R * RIMCOS[j], plateY[k] - th, R * RIMSIN[j], tmp);
        if (!tmp.ok) eok = false;
        edgeBuf[2 * j] = tmp.x; edgeBuf[2 * j + 1] = tmp.y;
      }
      if (eok) { ctx.beginPath(); polyPath(edgeBuf, RIM_N * 2); ctx.fillStyle = "#07080b"; ctx.fill(); }
      ctx.beginPath(); polyPath(rim, RIM_N * 2); ctx.fillStyle = "#1a1d24"; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.stroke();

      var offs = hexOffsets(k), ids = byPlate[k];
      // tiles slightly shrunk: the dark plate shows through as grout
      var rpx = PLATES[k].hexR * cam.scale;
      var grout = Math.max(0.55, Math.min(2.4, rpx * 0.1));
      var shrink = rpx < 2.5 ? 1 : Math.max(0.86, 1 - grout / (rpx * 1.732));
      var lim = rpx * 3;
      var i, n2, x, y, anyFaint = false;
      for (n2 = 0; n2 < ids.length; n2++) {
        i = ids[n2];
        if (!VIS[i]) continue;
        if (FAINT[i]) { anyFaint = true; continue; }
        x = SX[i]; y = SY[i];
        if (x < -lim || y < -lim || x > W + lim || y > H + lim) continue;
        ctx.beginPath(); hexPath(i, shrink, offs);
        ctx.fillStyle = HEX[i]; ctx.fill();
      }
      if (anyFaint) {
        ctx.globalAlpha = a * FAINT_ALPHA;
        for (n2 = 0; n2 < ids.length; n2++) {
          i = ids[n2];
          if (!VIS[i] || !FAINT[i]) continue;
          x = SX[i]; y = SY[i];
          if (x < -lim || y < -lim || x > W + lim || y > H + lim) continue;
          ctx.beginPath(); hexPath(i, shrink, offs);
          ctx.fillStyle = HEX[i]; ctx.fill();
        }
        ctx.globalAlpha = a;
      }
      ctx.lineJoin = "round";
      if (hovered >= 0 && PL[hovered] === k && HEX[hovered] !== selectedHex && VIS[hovered]) {
        ctx.beginPath(); hexPath(hovered, 1.08, offs);
        ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.stroke();
      }
      var sel = selectedHex ? instances.get(selectedHex) : null;
      if (sel) {
        for (var m = 0; m < sel.length; m++) {
          i = sel[m];
          if (PL[i] !== k || !VIS[i]) continue;
          var grow = Math.max(1.32, 1 + 3 / Math.max(1, rpx));   // stays visible on tiny tiles
          ctx.beginPath(); hexPath(i, grow, offs);
          ctx.lineWidth = 4.5; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.stroke();
          ctx.lineWidth = 2.25; ctx.strokeStyle = "#ffffff"; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawSpindle(y0, y1) {
      var a = 1 - (focusK >= 0 ? view.focusT : 0);
      if (a < 0.02) return;
      var p0 = project(0, y0, 0, {}), p1 = project(0, y1, 0, {});
      if (!p0.ok || !p1.ok) return;
      var topY = (P - 1) / 2 * gap() + 0.35, bot = -topY;
      var t0 = (topY - y0) / (topY - bot), t1 = (topY - y1) / (topY - bot);
      var g = ctx.createLinearGradient(p0.x, p0.y, p1.x + 0.01, p1.y + 0.01);
      var col = function (t) { var v = Math.round(235 - 190 * t); return "rgba(" + v + "," + v + "," + (v + 4) + "," + (0.55 * a).toFixed(3) + ")"; };
      g.addColorStop(0, col(t0)); g.addColorStop(1, col(t1));
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.lineWidth = Math.max(1, cam.scale * 0.006); ctx.strokeStyle = g; ctx.stroke();
    }

    function fontName() { return "600 " + (small ? 11.5 : 12.5) + "px " + FONT; }
    function fontCnt() { return "400 " + (small ? 11 : 12) + "px " + FONT; }
    // narrow views: first word only ("Muted & greys" -> "Muted"), no count
    function labelText(k) {
      var t = PLATES[k].label;
      return small ? (t.split(/\s+|&/)[0] || t) : t;
    }
    function measureLabel(k) {
      ctx.font = fontName();
      var txt = labelText(k), cnt = small ? "" : String(PLATES[k].n);
      var tw = ctx.measureText(txt).width;
      ctx.font = fontCnt();
      var cw = cnt ? ctx.measureText(cnt).width : 0;
      return { txt: txt, cnt: cnt, tw: tw, cw: cw, w: tw + cw + (cnt ? 22 : 18), h: small ? 21 : 23 };
    }
    function hitsUI(x, y, w, h) {
      for (var i = 0; i < uiRects.length; i++) {
        var r = uiRects[i];
        if (x < r.r + 4 && x + w > r.l - 4 && y < r.b + 4 && y + h > r.t - 4) return true;
      }
      return false;
    }
    function roundRect(x, y, w, h, r) {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function drawLabels() {
      labelRects = [];
      var a = labelAlpha();
      if (a < 0.05) return;
      ctx.globalAlpha = a;
      var anchors = [];
      for (var k = 0; k < P; k++) anchors.push(labelAnchor(k, {}));
      var crowded = labelsCrowded(anchors);
      var front = order[order.length - 1];
      for (k = 0; k < P; k++) {
        var p = anchors[k];
        if (!p.ok) continue;
        if (crowded && k !== front) continue;          // closed deck: label the visible plate
        var m = measureLabel(k), w = m.w, h = m.h;
        var y = p.y - h / 2;
        var x = p.x - 12 - w, lead = p.x - 2, leadFrom = x + w;
        if (x < 4 || hitsUI(x, y, w, h)) {
          var R = PLATES[k].rim, q = project(cam.r0 * R, plateY[k], cam.r2 * R, {});
          if (q.ok && q.x + 12 + w < W - 4 && !hitsUI(q.x + 12, y, w, h)) { x = q.x + 12; lead = q.x + 2; leadFrom = x; }
          else { x = Math.max(4, p.x + 4); lead = null; }
        }
        ctx.fillStyle = "rgba(11,12,16,0.88)";
        ctx.beginPath(); roundRect(x, y, w, h, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#e9e9ee"; ctx.font = fontName();
        ctx.fillText(m.txt, x + 9, y + h / 2 + 0.5);
        ctx.fillStyle = "#a7a7b4"; ctx.font = fontCnt();
        if (m.cnt) ctx.fillText(m.cnt, x + 13 + m.tw, y + h / 2 + 0.5);
        if (lead !== null) {
          ctx.beginPath(); ctx.moveTo(leadFrom, p.y); ctx.lineTo(lead, p.y);
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.stroke();
        }
        labelRects.push({ k: k, x: x, y: y, w: w, h: h });
      }
      ctx.globalAlpha = 1;
    }

    var drawItems = [];
    function render() {
      if (destroyed) return;
      if (!W) layout();
      computeFrame();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawItems.length = 0;
      var k;
      for (k = 0; k < P; k++) drawItems.push({ key: Math.abs(plateY[k] - cam.camY), k: k, s0: 0, s1: 0 });
      for (k = 0; k + 1 < P; k++) drawItems.push({ key: Math.abs((plateY[k] + plateY[k + 1]) / 2 - cam.camY), k: -1, s0: plateY[k], s1: plateY[k + 1] });
      if (P) drawItems.push({ key: Math.abs(plateY[P - 1] - 0.15 - cam.camY), k: -1, s0: plateY[P - 1], s1: plateY[P - 1] - 0.3 });
      drawItems.sort(function (a, b) { return b.key - a.key; });
      for (var i = 0; i < drawItems.length; i++) {
        var it = drawItems[i];
        if (it.k < 0) drawSpindle(it.s0, it.s1); else drawPlate(it.k);
      }
      drawLabels();
    }

    // ------------------------------------------------------------ picking
    function pointInPoly(px, py, pts, len) {
      var inside = false;
      for (var i = 0, j = len - 2; i < len; j = i, i += 2) {
        var xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    var hexBuf = new Float32Array(12);
    function inHex(i, px, py, offs) {
      for (var k = 0; k < 6; k++) { hexBuf[2 * k] = SX[i] + offs[2 * k] * SS[i]; hexBuf[2 * k + 1] = SY[i] + offs[2 * k + 1] * SS[i]; }
      return pointInPoly(px, py, hexBuf, 12);
    }
    // front-most pickable tile under (px,py) -> {i, k}; k = plate hit even between tiles
    function pickAt(px, py) {
      if (!cam) return { i: -1, k: -1 };
      var RADIUS = coarse ? 14 : 10;
      for (var nn = order.length - 1; nn >= 0; nn--) {
        var k = order[nn];
        if (plateAlpha[k] < 0.5 || !rimOk[k]) continue;
        var onPlate = pointInPoly(px, py, plateRim[k], RIM_N * 2);
        var offs = hexOffsets(k), ids = byPlate[k];
        var best = -1, bd = RADIUS * RADIUS, hitFaint = false;
        for (var m = 0; m < ids.length; m++) {
          var i = ids[m];
          if (!VIS[i]) continue;
          var dx = SX[i] - px, dy = SY[i] - py, d2 = dx * dx + dy * dy;
          var rr = PLATES[k].hexR * SS[i] * 1.05;
          if (d2 <= rr * rr && inHex(i, px, py, offs)) {
            if (FAINT[i]) { hitFaint = true; continue; }
            return { i: i, k: k };
          }
          if (!FAINT[i] && d2 < bd) { bd = d2; best = i; }
        }
        if (hitFaint) return { i: -1, k: k };   // a faint tile is not pickable, but still hides what is behind
        if (onPlate) return { i: best, k: k };   // the plate hides everything behind it
        if (best >= 0) return { i: best, k: k };
      }
      return { i: -1, k: -1 };
    }

    // ------------------------------------------------------------ animation
    var anim = null, raf = 0;
    function requestRender() { if (!raf && !destroyed) raf = requestAnimationFrame(frame); }
    function frame(t) {
      raf = 0;
      if (destroyed) return;
      if (anim) {
        var u = Math.min(1, (t - anim.t0) / anim.dur);
        if (u < 0) u = 0;
        var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        for (var key in anim.to) view[key] = anim.from[key] + (anim.to[key] - anim.from[key]) * e;
        if (u >= 1) { var done = anim.done; anim = null; if (done) done(); }
        else requestRender();
      }
      render();
    }
    function stopAnim() {
      if (!anim) return;
      var a = anim; anim = null;
      var keys = ["focusT", "swap", "explode"];
      for (var i = 0; i < keys.length; i++) if (a.to[keys[i]] !== undefined) view[keys[i]] = a.to[keys[i]];
      if (a.done) a.done();
    }
    function animateTo(to, dur, done) {
      stopAnim();
      var from = {};
      for (var key in to) from[key] = view[key];
      if (to.yaw !== undefined) {
        var d = ((to.yaw - view.yaw) % 360 + 540) % 360 - 180;
        to.yaw = view.yaw + d;
      }
      anim = { from: from, to: to, t0: performance.now(), dur: dur, done: done };
      requestRender();
    }

    function setWanted(k) {
      var changed = k !== focusWanted;
      focusWanted = k;
      syncUI();
      if (changed && onFocusChange) {
        try { onFocusChange(k >= 0 ? PLATES[k].key : null); } catch (err) { setTimeout(function () { throw err; }); }
      }
    }
    function focus(k) {
      if (k < 0) {
        if (focusWanted < 0 && focusK < 0) return;
        setWanted(-1);
        animateTo({ focusT: 0, pitch: DEF.pitch, yaw: view.yaw, zoom: 1, panX: 0, panY: 0 }, 650, function () { focusK = -1; focusPrev = -1; });
      } else {
        if (k === focusWanted) return;
        if (focusK >= 0 && focusK !== k && view.focusT > 0.5) {
          stopAnim();
          focusPrev = focusK; focusK = k; view.swap = 0;
          animateTo({ swap: 1, focusT: 1, pitch: 90, yaw: 0, zoom: 1, panX: 0, panY: 0 }, 600, function () { focusPrev = -1; });
        } else {
          stopAnim();
          focusPrev = -1; focusK = k; view.swap = 1;
          animateTo({ focusT: 1, pitch: 90, yaw: 0, zoom: 1, panX: 0, panY: 0 }, 750);
        }
        setWanted(k);
      }
    }
    function syncUI() {
      var f = focusWanted >= 0;
      backBtn.style.display = f ? "" : "none";
      curLbl.style.display = f ? "" : "none";
      hint.style.display = f ? "none" : "";
      if (f) curLbl.textContent = PLATES[focusWanted].label + " · " + PLATES[focusWanted].n;
      layoutRects();
    }
    function layoutRects() {
      var r = root.getBoundingClientRect();
      uiRects = [];
      var kids = [backBtn, hint, curLbl, exLbl, range, resetBtn];
      for (var i = 0; i < kids.length; i++) {
        var q = kids[i].getBoundingClientRect();
        if (q.width > 0) uiRects.push({ l: q.left - r.left, t: q.top - r.top, r: q.right - r.left, b: q.bottom - r.top });
      }
    }

    // ------------------------------------------------------------ hover / tip
    function setHover(i, x, y) {
      var prevHex = hovered >= 0 ? HEX[hovered] : null;
      if (i !== hovered) { hovered = i; requestRender(); }
      showTip(i, x, y);
      var hx = i >= 0 ? HEX[i] : null;
      if (hx !== prevHex && onHover) onHover(hx);
    }
    function showTip(i, x, y) {
      if (i < 0) { tip.style.display = "none"; return; }
      tip.textContent = "";
      var b = document.createElement("b"); b.textContent = nameOf(HEX[i]) || HEX[i];
      var s2 = document.createElement("span"); s2.textContent = HEX[i];
      tip.appendChild(b); tip.appendChild(s2); tip.style.display = "block";
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var tx = x + 14, ty = y + 16;
      if (tx + tw > W - 4) tx = x - 14 - tw;
      if (ty + th > H - 4) ty = y - 16 - th;
      tip.style.transform = "translate(" + Math.max(4, tx) + "px," + Math.max(4, ty) + "px)";
    }

    // ------------------------------------------------------------ input
    var pointers = new Map();
    var drag = null, pinch = null, lastTap = null;
    function local(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function onDown(e) {
      if (e.button !== undefined && e.button > 0 && e.pointerType === "mouse") return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        drag = { x0: p.x, y0: p.y, yaw0: view.yaw, pitch0: view.pitch, moved: false, t0: performance.now(), type: e.pointerType };
      } else if (pointers.size === 2) {
        var ab = Array.from(pointers.values()), a = ab[0], b = ab[1];
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom0: view.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        if (drag) drag.moved = true;
        setHover(-1);
      }
    }
    function onMove(e) {
      var p = local(e);
      if (!pointers.has(e.pointerId)) {
        if (e.pointerType === "mouse" && cam) setHover(pickAt(p.x, p.y).i, p.x, p.y);
        return;
      }
      pointers.set(e.pointerId, p);
      if (pointers.size === 1 && drag) {
        var dx = p.x - drag.x0, dy = p.y - drag.y0;
        var thr = drag.type === "mouse" ? 4 : 8;
        if (!drag.moved && Math.hypot(dx, dy) > thr) { drag.moved = true; canvas.classList.add("p3d-drag"); setHover(-1); }
        if (drag.moved) {
          stopAnim();
          view.yaw = drag.yaw0 - dx * 0.35;
          view.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, drag.pitch0 + dy * 0.3));
          requestRender();
        }
      } else if (pointers.size === 2 && pinch) {
        var ab = Array.from(pointers.values()), a = ab[0], b = ab[1];
        var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        stopAnim();
        zoomAt(pinch.mx, pinch.my, Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinch.zoom0 * d / pinch.d0)) / view.zoom);
        view.panX += mx - pinch.mx; view.panY += my - pinch.my;
        clampPan();
        pinch.mx = mx; pinch.my = my;
        requestRender();
      }
    }
    function onUp(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        if (e.type === "pointerup" && drag && !drag.moved && performance.now() - drag.t0 < 700) tap(drag.x0, drag.y0, drag.type);
        drag = null; pinch = null; canvas.classList.remove("p3d-drag");
      } else if (pointers.size === 1) {
        pinch = null;
        var q = Array.from(pointers.values())[0];
        drag = { x0: q.x, y0: q.y, yaw0: view.yaw, pitch0: view.pitch, moved: true, t0: 0, type: "touch" };
      }
    }
    function onLeave(e) {
      if (e.pointerType === "mouse" && !pointers.size) setHover(-1);
    }
    function clampPan() {
      var lim = Math.max(W, H) * 0.5 * Math.max(1, view.zoom);
      view.panX = Math.max(-lim, Math.min(lim, view.panX));
      view.panY = Math.max(-lim, Math.min(lim, view.panY));
    }
    function zoomAt(x, y, ratio) {
      if (!cam) computeFrame();
      var cx = cam.cx, cy = cam.cy;
      view.zoom *= ratio;
      view.panX += (x - cx) * (1 - ratio);
      view.panY += (y - cy) * (1 - ratio);
      clampPan();
      if (view.zoom <= 1.001) { view.panX *= 0.8; view.panY *= 0.8; }
    }
    function onWheel(e) {
      e.preventDefault();
      stopAnim();
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      if (e.ctrlKey) dy *= 3;                        // trackpad pinch
      var target = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom * Math.exp(-dy * 0.0015)));
      var p = local(e);
      zoomAt(p.x, p.y, target / view.zoom);
      requestRender();
    }
    function tap(x, y, type) {
      if (!cam) render();
      for (var r = 0; r < labelRects.length; r++) {
        var L = labelRects[r];
        if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) { lastTap = null; focus(L.k); return; }
      }
      var hit = pickAt(x, y);
      var now = performance.now();
      if (lastTap && now - lastTap.t < 400 && Math.hypot(x - lastTap.x, y - lastTap.y) < (type === "mouse" ? 12 : 30)) {
        lastTap = null;
        if (hit.k >= 0 && focusWanted !== hit.k) focus(hit.k);
        else if (focusWanted >= 0) focus(-1);        // double-tap the face-on plate: back to the stack
        return;
      }
      lastTap = { t: now, x: x, y: y };
      if (hit.i >= 0 && onPick) onPick(HEX[hit.i]);
    }
    function onKey(e) {
      if (e.key === "Escape" && focusWanted >= 0) { e.preventDefault(); focus(-1); }
    }
    function onRange() {
      if (anim && anim.to.explode !== undefined) delete anim.to.explode;
      view.explode = range.value / 100; requestRender();
    }
    function reset() {
      range.value = String(Math.round(DEF.explode * 100));
      setWanted(-1);
      animateTo({ yaw: DEF.yaw, pitch: DEF.pitch, zoom: 1, explode: DEF.explode, focusT: 0, panX: 0, panY: 0 }, 650, function () { focusK = -1; focusPrev = -1; });
    }
    function onBack() { focus(-1); }
    function onContext(e) { e.preventDefault(); }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKey);
    canvas.addEventListener("contextmenu", onContext);
    range.addEventListener("input", onRange);
    resetBtn.addEventListener("click", reset);
    backBtn.addEventListener("click", onBack);

    var ro = null;
    function onResize() { if (destroyed) return; layout(); render(); }
    if (typeof ResizeObserver === "function") { ro = new ResizeObserver(function () { onResize(); }); ro.observe(root); }
    else window.addEventListener("resize", onResize);

    syncUI();
    layout();
    render();

    // ------------------------------------------------------------ public API
    var api = {
      setSelected: function (hex) {
        var h = hex ? normHex(hex) : null;
        if (h !== selectedHex) { selectedHex = h; requestRender(); }
      },
      setFilter: function (set) {
        if (!set) FAINT.fill(0);
        else {
          var lc = new Set();
          set.forEach(function (h) { lc.add(normHex(h)); });
          for (var i = 0; i < N; i++) FAINT[i] = lc.has(HEX[i]) ? 0 : 1;
        }
        if (hovered >= 0 && FAINT[hovered]) setHover(-1);
        requestRender();
      },
      focusPlate: function (key) { focus(plateIndex(key)); },
      resize: function () { onResize(); },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf); raf = 0; anim = null;
        if (ro) ro.disconnect(); else window.removeEventListener("resize", onResize);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("wheel", onWheel, { passive: false });
        canvas.removeEventListener("keydown", onKey);
        canvas.removeEventListener("contextmenu", onContext);
        range.removeEventListener("input", onRange);
        resetBtn.removeEventListener("click", reset);
        backBtn.removeEventListener("click", onBack);
        pointers.clear();
        if (root.parentNode) root.parentNode.removeChild(root);
        if (prevPosition !== null) container.style.position = prevPosition;
        canvas.width = canvas.height = 0;
      }
    };
    // internal hooks for tests (not part of the public API)
    Object.defineProperty(api, "_debug", {
      enumerable: false,
      value: {
        project: function (hex) {
          render();
          var list = instances.get(normHex(hex));
          if (!list) return null;
          var first = null;
          var byFront = list.slice().sort(function (a, b) { return order.indexOf(PL[b]) - order.indexOf(PL[a]); });
          for (var j = 0; j < byFront.length; j++) {
            var i = byFront[j];
            var on = VIS[i] && SX[i] >= 0 && SX[i] <= W && SY[i] >= 0 && SY[i] <= H && plateAlpha[PL[i]] >= 0.5;
            var hit = on ? pickAt(SX[i], SY[i]).i : -1;
            var visible = !!(on && hit >= 0 && HEX[hit] === HEX[i]);
            var r = { x: SX[i], y: SY[i], visible: visible, r: PLATES[PL[i]].hexR * SS[i], plate: PLATES[PL[i]].key };
            if (visible) return r;
            if (!first) first = r;
          }
          return first;
        },
        pickAt: function (x, y) { render(); var h2 = pickAt(x, y); return h2.i >= 0 ? HEX[h2.i] : null; },
        colors: function () { return Array.from(instances.keys()); },
        view: function () { return { yaw: view.yaw, pitch: view.pitch, zoom: view.zoom, explode: view.explode, focus: focusWanted >= 0 ? PLATES[focusWanted].key : null, focusT: view.focusT, panX: view.panX, panY: view.panY, animating: !!anim, rafPending: !!raf }; },
        setView: function (v) {
          stopAnim();
          if (v.yaw !== undefined) view.yaw = v.yaw;
          if (v.pitch !== undefined) view.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, v.pitch));
          if (v.zoom !== undefined) { view.zoom = v.zoom; view.panX = 0; view.panY = 0; }
          if (v.explode !== undefined) { view.explode = v.explode; range.value = String(Math.round(v.explode * 100)); }
          render();
        },
        labels: function () { return labelRects.slice(); },
        bench: function (nf) {
          nf = nf || 60;
          var y0 = view.yaw, t0 = performance.now();
          for (var f = 0; f < nf; f++) { view.yaw = y0 + f * 3; render(); }
          var ms = (performance.now() - t0) / nf;
          view.yaw = y0; render();
          return ms;
        }
      }
    });
    return api;
  }

  window.createPlates3D = createPlates3D;
})();
