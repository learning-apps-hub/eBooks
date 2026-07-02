// Stroke-order guide + writing practice.
//
// Key idea: the letter/number OUTLINE is drawn from the same stroke paths that
// define the centerline. The thick faded outline IS the glyph; the dotted line
// runs down its centre — so the guide is always inside the walls by construction.

const StrokeGuide = (() => {
  const DESIGN_W = 200, DESIGN_H = 260; // per-glyph design box

  // ── Geometry helpers ──────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Catmull-Rom smoothing (2-point strokes pass through unchanged)
  function smooth(points, perSpan = 16) {
    if (points.length < 3) return points.slice();
    const P = [points[0], ...points, points[points.length - 1]];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i-1], p1 = P[i], p2 = P[i+1], p3 = P[i+2];
      for (let s = 0; s < perSpan; s++) {
        const u = s/perSpan, u2 = u*u, u3 = u2*u;
        out.push([
          0.5*((2*p1[0]) + (-p0[0]+p2[0])*u + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*u2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*u3),
          0.5*((2*p1[1]) + (-p0[1]+p2[1])*u + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*u2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*u3)
        ]);
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function cumulative(pts) {
    const lens = [0];
    for (let i = 1; i < pts.length; i++)
      lens.push(lens[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
    return lens;
  }

  function sample(pts, lens, t) {
    const target = lens[lens.length-1] * t;
    for (let i = 1; i < pts.length; i++) {
      if (lens[i] >= target) {
        const seg = lens[i]-lens[i-1] || 1, u = (target-lens[i-1])/seg;
        return { pt:[lerp(pts[i-1][0],pts[i][0],u), lerp(pts[i-1][1],pts[i][1],u)],
                 dir:[pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]] };
      }
    }
    const n = pts.length;
    return { pt: pts[n-1], dir:[pts[n-1][0]-pts[n-2][0], pts[n-1][1]-pts[n-2][1]] };
  }

  // Place k glyphs side-by-side; keeps each glyph's natural aspect.
  // Returns { strokes, w, h } in a (k*200)×260 design space.
  function placeGlyphs(sets) {
    const all = [];
    sets.forEach((strokes, p) => {
      strokes.forEach(stroke => all.push(stroke.map(([x,y]) => [p*DESIGN_W + x, y])));
    });
    return { strokes: all, w: sets.length * DESIGN_W, h: DESIGN_H };
  }

  // Fit a design space into the canvas preserving aspect (letterbox), then
  // smooth + scale every stroke. lineWidth scales with the fit too.
  function prepare(canvas, layout, marginRatio = 0.12) {
    const W = canvas.width, H = canvas.height;
    const scale = Math.min(W / layout.w, H / layout.h) * (1 - marginRatio);
    const offX = (W - layout.w * scale) / 2;
    const offY = (H - layout.h * scale) / 2;
    const sc = ([x, y]) => [offX + x*scale, offY + y*scale];
    const prepared = layout.strokes.map(stroke => {
      const pts = smooth(stroke).map(sc);
      return { pts, lens: cumulative(pts) };
    });
    return { prepared, scale };
  }

  // ── Drawing primitives ────────────────────────────────────────────────────────
  function drawOutline(ctx, prepared, color, lineWidth) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    prepared.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawDotted(ctx, s, t, accent, withArrow) {
    ctx.save();
    ctx.setLineDash([2, 10]);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = accent;
    const target = s.lens[s.lens.length-1] * t;
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0], s.pts[0][1]);
    for (let i = 1; i < s.pts.length; i++) {
      if (s.lens[i] <= target) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
      else {
        const seg = s.lens[i]-s.lens[i-1] || 1, u = (target-s.lens[i-1])/seg;
        ctx.lineTo(lerp(s.pts[i-1][0],s.pts[i][0],u), lerp(s.pts[i-1][1],s.pts[i][1],u));
        break;
      }
    }
    ctx.stroke();
    ctx.restore();

    if (withArrow && t > 0.04) {
      const smp = sample(s.pts, s.lens, t);
      const ang = Math.atan2(smp.dir[1], smp.dir[0]);
      ctx.save();
      ctx.translate(smp.pt[0], smp.pt[1]); ctx.rotate(ang);
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,-7); ctx.lineTo(-12,7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawStartMarker(ctx, s, index) {
    const [x, y] = s.pts[0];
    ctx.fillStyle = '#E53935';
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#9e9e9e';
    ctx.font = '800 17px Nunito, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(index + 1, x - 17, y - 15);
  }

  // ── Public: static worksheet guide (no animation) ──────────────────────────────
  function drawStatic(canvas, layout, opts = {}) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { prepared, scale } = prepare(canvas, layout, opts.marginRatio);
    const lw = (opts.outlineWidth || 38) * scale;
    drawOutline(ctx, prepared, opts.outlineColor || '#e9e0d2', lw);
    prepared.forEach((s, i) => {
      drawDotted(ctx, s, 1, opts.accent || '#EE5A5A', false);
      drawStartMarker(ctx, s, i);
    });
  }

  // ── Public: animated stroke-order demo (loops) ─────────────────────────────────
  let animId = null, timer = null, running = false;
  function stopAnimation() {
    if (animId) cancelAnimationFrame(animId);
    if (timer) clearTimeout(timer);
    animId = timer = null; running = false;
  }
  function isRunning() { return running; }

  function animate(canvas, layout, opts = {}) {
    stopAnimation();
    const ctx = canvas.getContext('2d');
    const { prepared, scale } = prepare(canvas, layout, opts.marginRatio);
    const lw = (opts.outlineWidth || 38) * scale;
    const accent = opts.accent || '#EE5A5A';
    const outlineColor = opts.outlineColor || '#e9e0d2';
    const msPerStroke = opts.msPerStroke || 1000;

    let idx = 0, start = null;
    running = true;

    function frame(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / msPerStroke, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawOutline(ctx, prepared, outlineColor, lw);
      for (let s = 0; s < idx; s++) { drawDotted(ctx, prepared[s], 1, accent, false); drawStartMarker(ctx, prepared[s], s); }
      drawDotted(ctx, prepared[idx], progress, accent, true);
      drawStartMarker(ctx, prepared[idx], idx);

      if (progress < 1) animId = requestAnimationFrame(frame);
      else {
        start = null; idx++;
        if (idx < prepared.length) timer = setTimeout(() => animId = requestAnimationFrame(frame), 420);
        else timer = setTimeout(() => { idx = 0; animId = requestAnimationFrame(frame); }, 1500);
      }
    }
    animId = requestAnimationFrame(frame);
  }

  // ── Public: tracing practice ───────────────────────────────────────────────────
  function initPractice(canvas, layout, opts = {}) {
    const ctx = canvas.getContext('2d');
    let drawing = false, lastPt = null;

    function drawGuide() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { prepared, scale } = prepare(canvas, layout, opts.marginRatio);
      drawOutline(ctx, prepared, opts.outlineColor || '#ece3d5', (opts.outlineWidth || 38) * scale);
      // faint start dots so the child knows where to begin
      prepared.forEach((s, i) => drawStartMarker(ctx, s, i));
    }

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return [(src.clientX - r.left) * (canvas.width / r.width),
              (src.clientY - r.top)  * (canvas.height / r.height)];
    }
    function startDraw(e){
      e.preventDefault();
      if (isRunning()) { stopAnimation(); drawGuide(); }
      drawing = true; lastPt = getPos(e);
    }
    function moveDraw(e){
      e.preventDefault();
      if (!drawing) return;
      const pt = getPos(e);
      ctx.strokeStyle = opts.inkColor || '#FF6B6B';
      ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(lastPt[0], lastPt[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
      lastPt = pt;
    }
    function endDraw(e){ e.preventDefault(); drawing = false; lastPt = null; }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive:false });
    canvas.addEventListener('touchmove', moveDraw, { passive:false });
    canvas.addEventListener('touchend', endDraw, { passive:false });

    drawGuide();
    return { clear: drawGuide };
  }

  return { placeGlyphs, drawStatic, animate, stopAnimation, isRunning, initPractice };
})();
