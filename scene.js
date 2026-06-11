// Projection Explorer — 3D grid, axes, and box mapped to 2D via selectable projection functions.

// ── UI handles ─────────────────────────────────────────────────────────────
let mapModeSelect;
let fovSlider, perspFovSlider;
let viewScaleSlider;
let cameraPitchSlider, cameraYawSlider, cameraRollSlider;
let camXInput, camYInput, camZInput;
let boxXInput, boxYInput, boxZInput;
let sphereXInput, sphereYInput, sphereZInput;
let gridRangeSlider, gridFadeSlider;
let mapLambdaSlider, mapMobiusASlider;
let mapKaleidoNSlider, mapKaleidoRotSlider;
let mapPowerPSlider;
let mapTanhKSlider;
let mapCPowNSlider;
let mapRadRippleASlider, mapRadRippleNSlider, mapRadRippleSpeedSlider;
let wavePhase = 0;
let mapSwirlSlider, mapRippleSlider, mapFoldSlider;
let canvasEl;

let activeMapMode = "equidistant";
const fisheyeAspect = { x: 1, y: 1 };
const DEG = Math.PI / 180;
const LAMBDA_FOV_AT_ZERO = 210;
const LAMBDA_FOV_AT_ONE  = 90;

// ── Scene state ────────────────────────────────────────────────────────────
const camera = {
  position: { x: 2, y: 1, z: -0.5 },
  rotation: { x: 0, y: 0, z: 0 },
};

const sphere = { position: { x: 5.0, y: 0.2, z: 7.0 } };

const box = {
  position: { x: 1.4, y: 0.2, z: 7.0 },
  size:     { w: 2, h: 2, d: 2 },
  rotation: { x: 0, y: 0, z: 0 },
};

const FACES = [
  [0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],
];
const EDGES = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],
];
const edgeFaceAdj = buildEdgeFaceAdjacency(FACES);

const grid = {
  xOffset: 28, zOffset: 28,
  yOffset: 10,
  step: 4, layerStep: 4,
  fadeEnd: 160, alphaCutoff: 2,
};

// ── UI helpers ─────────────────────────────────────────────────────────────
function makeSlider(id, rowId) {
  const e = document.getElementById(id);
  const valEl = document.getElementById(id.replace(/-slider$/, '-val'));
  return {
    _rowId: rowId || null,
    value(v) {
      if (v === undefined) return parseFloat(e.value);
      e.value = v;
      if (valEl) valEl.textContent = v;
      return this;
    },
    attribute(attr, val) { e.setAttribute(attr, val); },
    show() { const r = rowId && document.getElementById(rowId); if (r) r.style.display = ''; },
    hide() { const r = rowId && document.getElementById(rowId); if (r) r.style.display = 'none'; },
    _labelEl: { show() {}, hide() {} },
  };
}

function makeInput(id) {
  const e = document.getElementById(id);
  const w = {
    _lastVal: parseFloat(e.value) || 0,
    value(v) {
      if (v === undefined) return e.value;
      e.value = v;
      return this;
    },
    attribute(attr, val) { e.setAttribute(attr, val); },
    show() {}, hide() {},
    _labelEl: { show() {}, hide() {} },
  };
  return w;
}

function makeSelect(id) {
  const e = document.getElementById(id);
  return { value() { return e.value; } };
}

// ── Setup ──────────────────────────────────────────────────────────────────
function canvasSide() {
  return floor(min(windowWidth - 242, windowHeight));
}

function setup() {
  const side = canvasSide();
  canvasEl = createCanvas(side, side);
  canvasEl.parent('app');

  // Wire oninput → live value display
  const sliderPairs = [
    ['fov-slider',          'fov-val',          ''],
    ['persp-fov-slider',    'persp-fov-val',     ''],
    ['scale-slider',        'scale-val',         ''],
    ['lambda-slider',       'lambda-val',        ''],
    ['mobius-a-slider',     'mobius-a-val',      ''],
    ['kaleido-n-slider',    'kaleido-n-val',     ''],
    ['kaleido-rot-slider',  'kaleido-rot-val',   '°'],
    ['power-p-slider',      'power-p-val',       ''],
    ['tanh-k-slider',       'tanh-k-val',        ''],
    ['cpow-n-slider',       'cpow-n-val',        ''],
    ['swirl-slider',        'swirl-val',         ''],
    ['ripple-slider',       'ripple-val',        ''],
    ['fold-slider',         'fold-val',          ''],
    ['ripple-a-slider',     'ripple-a-val',      ''],
    ['ripple-n-slider',     'ripple-n-val',      ''],
    ['ripple-speed-slider', 'ripple-speed-val',  ''],
    ['pitch-slider',        'pitch-val',         '°'],
    ['yaw-slider',          'yaw-val',           '°'],
    ['roll-slider',         'roll-val',          '°'],
  ];
  for (const [sid, vid, suffix] of sliderPairs) {
    const s = document.getElementById(sid);
    const v = document.getElementById(vid);
    if (s && v) s.addEventListener('input', e => { v.textContent = e.target.value + suffix; });
  }

  // Wrap elements
  mapModeSelect        = makeSelect('mode-select');
  fovSlider            = makeSlider('fov-slider',          'row-fov');
  perspFovSlider       = makeSlider('persp-fov-slider',    'row-persp-fov');
  viewScaleSlider      = makeSlider('scale-slider',        null);
  mapLambdaSlider      = makeSlider('lambda-slider',       'row-lambda');
  mapMobiusASlider     = makeSlider('mobius-a-slider',     'row-mobius-a');
  mapKaleidoNSlider    = makeSlider('kaleido-n-slider',    'row-kaleido-n');
  mapKaleidoRotSlider  = makeSlider('kaleido-rot-slider',  'row-kaleido-rot');
  mapPowerPSlider      = makeSlider('power-p-slider',      'row-power-p');
  mapTanhKSlider       = makeSlider('tanh-k-slider',       'row-tanh-k');
  mapCPowNSlider       = makeSlider('cpow-n-slider',       'row-cpow-n');
  mapSwirlSlider       = makeSlider('swirl-slider',        'row-swirl');
  mapRippleSlider      = makeSlider('ripple-slider',       'row-ripple');
  mapFoldSlider        = makeSlider('fold-slider',         'row-fold');
  mapRadRippleASlider      = makeSlider('ripple-a-slider',     'row-ripple-a');
  mapRadRippleNSlider      = makeSlider('ripple-n-slider',     'row-ripple-n');
  mapRadRippleSpeedSlider  = makeSlider('ripple-speed-slider', 'row-ripple-speed');
  cameraPitchSlider    = makeSlider('pitch-slider',        null);
  cameraYawSlider      = makeSlider('yaw-slider',          null);
  cameraRollSlider     = makeSlider('roll-slider',         null);
  camXInput   = makeInput('cam-x-input');
  camYInput   = makeInput('cam-y-input');
  camZInput   = makeInput('cam-z-input');
  boxXInput   = makeInput('box-x-input');
  boxYInput   = makeInput('box-y-input');
  boxZInput   = makeInput('box-z-input');
  sphereXInput = makeInput('sphere-x-input');
  sphereYInput = makeInput('sphere-y-input');
  sphereZInput = makeInput('sphere-z-input');
  gridRangeSlider = makeSlider('grid-range-slider', null);
  gridFadeSlider  = makeSlider('grid-fade-slider',  null);

  createKeyHelpPanel();

  // Prevent arrow keys from scrolling page / changing select while navigating
  document.addEventListener("keydown", e => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
      if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
    }
  });

  updateModeControls(activeMapMode);
  updateEquationPanel(activeMapMode);
}

// ── Key movement ───────────────────────────────────────────────────────────
function handleKeyMovement() {
  const MOVE = 0.12;
  const ROT  = 0.6;

  if (keyIsDown(UP_ARROW))    cameraPitchSlider.value(constrain(cameraPitchSlider.value() - ROT, -89, 89));
  if (keyIsDown(DOWN_ARROW))  cameraPitchSlider.value(constrain(cameraPitchSlider.value() + ROT, -89, 89));
  if (keyIsDown(LEFT_ARROW))  cameraYawSlider.value(((cameraYawSlider.value() - ROT + 540) % 360) - 180);
  if (keyIsDown(RIGHT_ARROW)) cameraYawSlider.value(((cameraYawSlider.value() + ROT + 540) % 360) - 180);

  const yaw = cameraYawSlider.value() * DEG;
  const fx = sin(yaw), fz = cos(yaw);
  const rx = cos(yaw), rz = -sin(yaw);

  if (keyIsDown(87)) { camera.position.x += fx*MOVE; camera.position.z += fz*MOVE; }
  if (keyIsDown(83)) { camera.position.x -= fx*MOVE; camera.position.z -= fz*MOVE; }
  if (keyIsDown(68)) { camera.position.x += rx*MOVE; camera.position.z += rz*MOVE; }
  if (keyIsDown(65)) { camera.position.x -= rx*MOVE; camera.position.z -= rz*MOVE; }
  if (keyIsDown(81)) { camera.position.y += MOVE; }
  if (keyIsDown(69)) { camera.position.y -= MOVE; }

  camXInput.value(camera.position.x.toFixed(2));
  camYInput.value(camera.position.y.toFixed(2));
  camZInput.value(camera.position.z.toFixed(2));
}

// ── Draw loop ──────────────────────────────────────────────────────────────
function draw() {
  handleKeyMovement();
  const speed = mapRadRippleSpeedSlider ? mapRadRippleSpeedSlider.value() : 0;
  wavePhase += speed * deltaTime * 0.003;
  const mapMode = mapModeSelect ? mapModeSelect.value() : "equidistant";
  if (mapMode !== activeMapMode) {
    updateModeControls(mapMode);
    updateEquationPanel(mapMode);
    activeMapMode = mapMode;
  }

  const lambda = mapLambdaSlider ? mapLambdaSlider.value() : 0;
  updateFovConstraint(mapMode, lambda);
  if (mapMode === "lambda_tan") applyLambdaLinkedFov(lambda);

  const activeFov = mapMode === "perspective" ? perspFovSlider.value() : fovSlider.value();
  const thetaMax  = radians(activeFov * 0.5);
  const imageRadius = min(width, height) * 0.5 * viewScaleSlider.value();
  const near = 0.1;

  camera.rotation.x = cameraPitchSlider.value() * DEG;
  camera.rotation.y = cameraYawSlider.value()   * DEG;
  camera.rotation.z = cameraRollSlider.value()  * DEG;
  camera.position.x = readNumber(camXInput, camera.position.x);
  camera.position.y = readNumber(camYInput, camera.position.y);
  camera.position.z = readNumber(camZInput, camera.position.z);

  const boxX = readNumber(boxXInput, box.position.x);
  const boxY = readNumber(boxYInput, box.position.y);
  const boxZ = readNumber(boxZInput, box.position.z);

  const useLens = mapMode !== "perspective";

  background(useLens ? 255 : 0);
  if (useLens) beginLensClip(imageRadius);
  if (useLens) background(0);

  drawGrid(thetaMax, imageRadius, near);
  drawAxes(thetaMax, imageRadius, near);
  drawBox(boxX, boxY, boxZ, thetaMax, imageRadius, near);
  const spX = readNumber(sphereXInput, sphere.position.x);
  const spY = readNumber(sphereYInput, sphere.position.y);
  const spZ = readNumber(sphereZInput, sphere.position.z);
  drawSphere(spX, spY, spZ, thetaMax, imageRadius, near);

  if (useLens) endLensClip();
  if (useLens) drawLensBoundary(imageRadius);
}

// ── Axes ───────────────────────────────────────────────────────────────────
function drawAxes(thetaMax, imageRadius, near) {
  const len = 5;
  noFill();
  strokeWeight(1.8);
  drawSampledLineWithFade({x:-len,y:0,z:0}, {x:len,y:0,z:0}, 60, thetaMax, imageRadius, near, 220, 60,  60, 200);
  drawSampledLineWithFade({x:0,y:-len,z:0}, {x:0,y:len,z:0}, 60, thetaMax, imageRadius, near,  60, 200,  80, 200);
  drawSampledLineWithFade({x:0,y:0,z:-len}, {x:0,y:0,z:len}, 60, thetaMax, imageRadius, near,  60, 120, 240, 200);
}

// ── Box ────────────────────────────────────────────────────────────────────
function drawBox(bx, by, bz, thetaMax, imageRadius, near) {
  const verts = buildBoxVertices(box.size.w, box.size.h, box.size.d);
  const worldVerts = verts.map(v => {
    const r = rotateXYZ(v, box.rotation);
    return { x: r.x + bx, y: r.y + by, z: r.z + bz };
  });
  const camVerts    = worldVerts.map(worldToCamera);
  const visibleKeys = computeVisibleEdgeKeys(camVerts);

  strokeWeight(2);
  noFill();
  for (const [a, b] of EDGES) {
    if (!visibleKeys.has(edgeKey(a, b))) continue;
    drawSampledLineWithFade(worldVerts[a], worldVerts[b], 36, thetaMax, imageRadius, near, 255, 255, 255, 255);
  }
}

// ── Fading line ────────────────────────────────────────────────────────────
function drawSampledLineWithFade(a, b, steps, thetaMax, imageRadius, near, r, g, bCol, baseAlpha) {
  const fadeEnd = gridFadeSlider ? gridFadeSlider.value() : grid.fadeEnd;
  const fadeStart = fadeEnd * 0.35;
  const { alphaCutoff } = grid;
  const mapMode = mapModeSelect ? mapModeSelect.value() : "equidistant";
  const n = max(1, floor(steps));
  let ps = samplePoint(a, b, 0, thetaMax, imageRadius, near);

  for (let i = 1; i <= n; i++) {
    const cs = samplePoint(a, b, i / n, thetaMax, imageRadius, near);
    if (ps.screen && cs.screen && !splitStroke(ps.screen, cs.screen, mapMode, imageRadius)) {
      const mid = { x: (ps.world.x+cs.world.x)*0.5, y: (ps.world.y+cs.world.y)*0.5, z: (ps.world.z+cs.world.z)*0.5 };
      const alpha = distFadeAlpha(mid, baseAlpha, fadeStart, fadeEnd);
      if (alpha >= alphaCutoff) {
        stroke(r, g, bCol, alpha);
        line(ps.screen.x, ps.screen.y, cs.screen.x, cs.screen.y);
      }
    }
    ps = cs;
  }
}

// ── Grid ───────────────────────────────────────────────────────────────────
function drawGrid(thetaMax, imageRadius, near) {
  const STEPS = 100;
  const { alphaCutoff, step, layerStep, yOffset } = grid;
  const fadeEnd   = gridFadeSlider  ? gridFadeSlider.value()  : grid.fadeEnd;
  const gridRange = max(gridRangeSlider ? gridRangeSlider.value() : grid.xOffset, fadeEnd);

  const xWMin = camera.position.x - gridRange;
  const xWMax = camera.position.x + gridRange;
  const zWMin = camera.position.z - gridRange;
  const zWMax = camera.position.z + gridRange;
  const yWMin = camera.position.y - gridRange;
  const yWMax = camera.position.y + gridRange;
  const xR = buildLineRange(xWMin, xWMax, step);
  const zR = buildLineRange(zWMin, zWMax, step);
  const yR = buildLineRange(yWMin, yWMax, layerStep);
  const xMid = (xWMin + xWMax) * 0.5;
  const zMid = (zWMin + zWMax) * 0.5;

  noFill();

  const H_CHUNKS = 10;
  for (let y = yR.min; y <= yR.max + 1e-6; y += layerStep) {
    const vf = vertFade(y, gridRange);
    if (vf <= 0) continue;
    strokeWeight(abs(y) < 1e-6 ? 1.1 : 0.8);

    for (let x = xR.min; x <= xR.max + 1e-6; x += step) {
      for (let ci = 0; ci < H_CHUNKS; ci++) {
        const za = zWMin + (zWMax - zWMin) * (ci / H_CHUNKS);
        const zb = zWMin + (zWMax - zWMin) * ((ci + 1) / H_CHUNKS);
        const zm = (za + zb) * 0.5;
        const a = horizFade(x, zm, fadeEnd) * vf;
        if (a < alphaCutoff) continue;
        stroke(160, 160, 160, a);
        drawSampledLine({x, y, z: za}, {x, y, z: zb}, 12, thetaMax, imageRadius, near);
      }
    }

    for (let z = zR.min; z <= zR.max + 1e-6; z += step) {
      for (let ci = 0; ci < H_CHUNKS; ci++) {
        const xa = xWMin + (xWMax - xWMin) * (ci / H_CHUNKS);
        const xb = xWMin + (xWMax - xWMin) * ((ci + 1) / H_CHUNKS);
        const xm = (xa + xb) * 0.5;
        const a = horizFade(xm, z, fadeEnd) * vf;
        if (a < alphaCutoff) continue;
        stroke(160, 160, 160, a);
        drawSampledLine({x: xa, y, z}, {x: xb, y, z}, 12, thetaMax, imageRadius, near);
      }
    }
  }

  const Y_CHUNKS = 8;
  strokeWeight(0.9);
  for (let x = xR.min; x <= xR.max + 1e-6; x += step) {
    for (let z = zR.min; z <= zR.max + 1e-6; z += step) {
      const hf = horizFade(x, z, fadeEnd);
      if (hf < alphaCutoff) continue;
      for (let ci = 0; ci < Y_CHUNKS; ci++) {
        const ya = yWMin + (yWMax - yWMin) * (ci / Y_CHUNKS);
        const yb = yWMin + (yWMax - yWMin) * ((ci + 1) / Y_CHUNKS);
        const ym = (ya + yb) * 0.5;
        const a = hf * vertFade(ym, gridRange);
        if (a < alphaCutoff) continue;
        stroke(160, 160, 160, a);
        drawSampledLine({x, y: ya, z}, {x, y: yb, z}, 4, thetaMax, imageRadius, near);
      }
    }
  }
}

// ── Sphere ─────────────────────────────────────────────────────────────────
function drawSphere(cx, cy, cz, thetaMax, imageRadius, near) {
  const R      = 2;
  const N_LAT  = 8;
  const N_LON  = 12;
  const N_SEG  = 64;
  const { fadeEnd, alphaCutoff } = grid;
  const fd = gridFadeSlider ? gridFadeSlider.value() : fadeEnd;

  noFill();
  stroke(100, 160, 220, 80);
  strokeWeight(0.7);

  for (let i = 1; i < N_LAT; i++) {
    const elev  = -HALF_PI + PI * i / N_LAT;
    const y     = cy + R * sin(elev);
    const r_xz  = R * cos(elev);
    for (let j = 0; j < N_SEG; j++) {
      const t0 = TWO_PI * j       / N_SEG;
      const t1 = TWO_PI * (j + 1) / N_SEG;
      const a  = { x: cx + r_xz * cos(t0), y, z: cz + r_xz * sin(t0) };
      const b  = { x: cx + r_xz * cos(t1), y, z: cz + r_xz * sin(t1) };
      const mid = { x: (a.x+b.x)*0.5, y, z: (a.z+b.z)*0.5 };
      const alpha = distFadeAlpha(mid, 180, fd * 0.35, fd);
      if (alpha < alphaCutoff) continue;
      stroke(100, 160, 220, alpha);
      drawSampledLine(a, b, 3, thetaMax, imageRadius, near);
    }
  }

  for (let i = 0; i < N_LON; i++) {
    const lon = TWO_PI * i / N_LON;
    for (let j = 0; j < N_SEG; j++) {
      const t0 = -HALF_PI + PI * j       / N_SEG;
      const t1 = -HALF_PI + PI * (j + 1) / N_SEG;
      const a  = { x: cx + R * cos(t0) * cos(lon), y: cy + R * sin(t0), z: cz + R * cos(t0) * sin(lon) };
      const b  = { x: cx + R * cos(t1) * cos(lon), y: cy + R * sin(t1), z: cz + R * cos(t1) * sin(lon) };
      const mid = { x: (a.x+b.x)*0.5, y: (a.y+b.y)*0.5, z: (a.z+b.z)*0.5 };
      const alpha = distFadeAlpha(mid, 180, fd * 0.35, fd);
      if (alpha < alphaCutoff) continue;
      stroke(100, 160, 220, alpha);
      drawSampledLine(a, b, 3, thetaMax, imageRadius, near);
    }
  }
}

// ── Projection ─────────────────────────────────────────────────────────────
function project(p, thetaMax, imageRadius, near) {
  const mapMode = mapModeSelect ? mapModeSelect.value() : "equidistant";
  const cx = width  * 0.5;
  const cy = height * 0.5;
  const { rx, ry } = fishRadii(imageRadius);

  if (mapMode === "perspective") {
    if (p.z <= near) return null;
    const f = imageRadius / tan(thetaMax);
    if (abs(f) <= 1e-6) return null;
    return { x: cx + f * p.x / p.z, y: cy - f * p.y / p.z };
  }

  const len = sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
  if (len <= near) return null;

  const theta = acos(constrain(p.z / len, -1, 1));
  if (theta > thetaMax) return null;
  const phi = atan2(p.y, p.x);
  let rn, phiW = phi;

  if (mapMode === "equidistant") {
    rn = theta / max(1e-6, thetaMax);

  } else if (mapMode === "orthographic") {
    rn = sin(theta) / max(1e-6, sin(thetaMax));

  } else if (mapMode === "lambda_tan") {
    const lam = abs(mapLambdaSlider ? mapLambdaSlider.value() : 0);
    if (lam <= 1e-4) {
      rn = theta / max(1e-6, thetaMax);
    } else {
      const d = tan(lam * thetaMax);
      if (abs(d) <= 1e-6) return null;
      rn = tan(lam * theta) / d;
    }

  } else if (mapMode === "lambert") {
    rn = sin(theta * 0.5) / max(1e-6, sin(thetaMax * 0.5));

  } else if (mapMode === "power") {
    const p = mapPowerPSlider ? mapPowerPSlider.value() : 1;
    rn = pow(theta / max(1e-6, thetaMax), p);

  } else if (mapMode === "tanh_map") {
    const k = mapTanhKSlider ? mapTanhKSlider.value() : 2;
    const t = theta / max(1e-6, thetaMax);
    rn = tanh(k * t) / max(1e-6, tanh(k));

  } else if (mapMode === "radripple") {
    const a = mapRadRippleASlider ? mapRadRippleASlider.value() : 0.2;
    const n = mapRadRippleNSlider ? mapRadRippleNSlider.value() : 3;
    const t = theta / max(1e-6, thetaMax);
    rn = t + a * sin(n * PI * t - wavePhase);

  } else if (mapMode === "stereo") {
    const d = tan(thetaMax * 0.5);
    if (abs(d) <= 1e-6) return null;
    rn = tan(theta * 0.5) / d;

  } else if (mapMode === "reverse") {
    rn = 1 - theta / max(1e-6, thetaMax);

  } else if (mapMode === "logmap") {
    const t = theta / max(1e-6, thetaMax);
    const wre = log(max(t, 1e-5));
    const wim = phi;
    const maxR = sqrt(pow(log(1e-5), 2) + PI * PI);
    rn   = sqrt(wre*wre + wim*wim) / maxR;
    phiW = atan2(wim, wre);

  } else if (mapMode === "mobius" || mapMode === "kaleido") {
    rn = theta / max(1e-6, thetaMax);

  } else { // weird
    const t  = theta / max(1e-6, thetaMax);
    const sw = mapSwirlSlider  ? mapSwirlSlider.value()  : 0;
    const ri = mapRippleSlider ? mapRippleSlider.value() : 0;
    const fo = mapFoldSlider   ? mapFoldSlider.value()   : 0;
    phiW = phi + sw * t * t + 0.45 * ri * sin(6 * phi + TWO_PI * t);
    rn   = t + ri * sin(8 * phi + TWO_PI * t) * t * (1-t)
             + 0.8 * fo * sin(3 * PI * t) * t * (1-t);
  }

  rn = constrain(rn, 0, 1.35);
  let nx = rn * cos(phiW);
  let ny = rn * sin(phiW);

  if (mapMode === "mobius") {
    const a  = constrain(mapMobiusASlider ? mapMobiusASlider.value() : 0, -0.95, 0.95);
    const dr = 1 + a * nx, di = a * ny;
    const dn = dr*dr + di*di;
    if (dn <= 1e-8) return null;
    const nr = nx + a, ni = ny;
    nx = (nr*dr + ni*di) / dn;
    ny = (ni*dr - nr*di) / dn;
  }

  if (mapMode === "cpow") {
    const n   = mapCPowNSlider ? mapCPowNSlider.value() : 2;
    const r   = sqrt(nx*nx + ny*ny);
    if (r < 1e-8) return null;
    const ang = atan2(ny, nx);
    const rn2 = pow(r, abs(n));
    if (!isFinite(rn2) || rn2 > 4) return null;
    nx = (n < 0 ? 1/max(rn2,1e-6) : rn2) * cos(n * ang);
    ny = (n < 0 ? 1/max(rn2,1e-6) : rn2) * sin(n * ang);
  }

  let sector = null;
  if (mapMode === "kaleido") {
    const n   = max(2, floor((mapKaleidoNSlider ? mapKaleidoNSlider.value() : 8) + 0.5));
    const rot = radians(mapKaleidoRotSlider ? mapKaleidoRotSlider.value() : 0);
    const sec = TWO_PI / n;
    const r   = sqrt(nx*nx + ny*ny);
    const ang = ((atan2(ny, nx) + rot) % TWO_PI + TWO_PI) % TWO_PI;
    const si  = floor(ang / sec);
    sector = si;
    const loc = ang - si * sec;
    const lt  = loc <= sec * 0.5 ? loc : sec - loc + sec * 0.5;
    nx = r * cos(si * sec + lt - rot);
    ny = r * sin(si * sec + lt - rot);
  }

  const result = { x: cx + nx * rx, y: cy - ny * ry };
  if (sector !== null) result.kaleidoSector = sector;
  return result;
}

// ── Line drawing ───────────────────────────────────────────────────────────
function drawSampledLine(a, b, steps, thetaMax, imageRadius, near) {
  const mapMode = mapModeSelect ? mapModeSelect.value() : "equidistant";
  const n    = max(1, floor(steps));
  const opts = {
    maxDepth: 7,
    maxDeviationSq: 0.64,
    maxSegmentLengthSq: pow(max(8, imageRadius * 0.03), 2),
  };
  let open = false, prev = null;

  const emit = (sp) => {
    if (!sp) {
      if (open) { endShape(); open = false; prev = null; }
      return;
    }
    if (!open) {
      beginShape(); open = true;
      vertex(sp.x, sp.y); prev = sp;
      return;
    }
    if (splitStroke(prev, sp, mapMode, imageRadius)) { endShape(); beginShape(); }
    vertex(sp.x, sp.y); prev = sp;
  };

  let ps = samplePoint(a, b, 0, thetaMax, imageRadius, near);
  emit(ps.screen);
  for (let i = 1; i <= n; i++) {
    const cs = samplePoint(a, b, i / n, thetaMax, imageRadius, near);
    if (ps.screen && cs.screen) {
      subdivide(ps.world, ps.screen, cs.world, cs.screen, 0, opts, thetaMax, imageRadius, near, emit);
      emit(cs.screen);
    } else if (cs.screen) {
      emit(cs.screen);
    } else {
      emit(null);
    }
    ps = cs;
  }
  if (open) endShape();
}

function samplePoint(a, b, t, thetaMax, imageRadius, near) {
  const world = { x: lerp(a.x,b.x,t), y: lerp(a.y,b.y,t), z: lerp(a.z,b.z,t) };
  return { world, screen: project(worldToCamera(world), thetaMax, imageRadius, near) };
}

function subdivide(wa, sa, wb, sb, depth, opts, thetaMax, imageRadius, near, emit) {
  if (depth >= opts.maxDepth) return;
  const wm = { x: (wa.x+wb.x)*0.5, y: (wa.y+wb.y)*0.5, z: (wa.z+wb.z)*0.5 };
  const sm = project(worldToCamera(wm), thetaMax, imageRadius, near);
  if (!sm) return;
  const ddx = sm.x - (sa.x+sb.x)*0.5, ddy = sm.y - (sa.y+sb.y)*0.5;
  const sx  = sb.x - sa.x,            sy  = sb.y - sa.y;
  if (ddx*ddx+ddy*ddy <= opts.maxDeviationSq && sx*sx+sy*sy <= opts.maxSegmentLengthSq) return;
  subdivide(wa, sa, wm, sm, depth+1, opts, thetaMax, imageRadius, near, emit);
  emit(sm);
  subdivide(wm, sm, wb, sb, depth+1, opts, thetaMax, imageRadius, near, emit);
}

function splitStroke(prev, cur, mapMode, imageRadius) {
  if (!prev || !cur) return false;
  const dx = cur.x - prev.x, dy = cur.y - prev.y;
  if (dx*dx + dy*dy > pow(max(48, imageRadius * 0.28), 2)) return true;
  if (mapMode !== "kaleido") return false;
  return prev.kaleidoSector !== undefined
      && cur.kaleidoSector  !== undefined
      && prev.kaleidoSector !== cur.kaleidoSector;
}

// ── Camera & geometry ──────────────────────────────────────────────────────
function worldToCamera(p) {
  return rotateXYZ(
    { x: p.x - camera.position.x, y: p.y - camera.position.y, z: p.z - camera.position.z },
    { x: -camera.rotation.x, y: -camera.rotation.y, z: -camera.rotation.z }
  );
}

function rotateXYZ(v, r) {
  const cx = cos(r.x), sx = sin(r.x);
  const cy = cos(r.y), sy = sin(r.y);
  const cz = cos(r.z), sz = sin(r.z);
  const y1 = v.y*cx - v.z*sx, z1 = v.y*sx + v.z*cx;
  const x2 = v.x*cy + z1*sy,  z2 = -v.x*sy + z1*cy;
  return { x: x2*cz - y1*sz, y: x2*sz + y1*cz, z: z2 };
}

function buildBoxVertices(w, h, d) {
  const [hw, hh, hd] = [w/2, h/2, d/2];
  return [
    {x:-hw,y:-hh,z:-hd},{x:hw,y:-hh,z:-hd},{x:hw,y:hh,z:-hd},{x:-hw,y:hh,z:-hd},
    {x:-hw,y:-hh,z: hd},{x:hw,y:-hh,z: hd},{x:hw,y:hh,z: hd},{x:-hw,y:hh,z: hd},
  ];
}

function buildEdgeFaceAdjacency(faces) {
  const m = new Map();
  for (let fi = 0; fi < faces.length; fi++) {
    const f = faces[fi];
    for (let i = 0; i < f.length; i++) {
      const k = edgeKey(f[i], f[(i+1) % f.length]);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(fi);
    }
  }
  return m;
}

function computeVisibleEdgeKeys(camVerts) {
  const center  = avgPoint(camVerts);
  const faceVis = FACES.map(f => isFaceVisible(f, camVerts, center));
  const vis = new Set();
  for (const [a, b] of EDGES) {
    const k = edgeKey(a, b);
    if ((edgeFaceAdj.get(k) || []).some(fi => faceVis[fi])) vis.add(k);
  }
  return vis;
}

function isFaceVisible(face, verts, center) {
  const [p0,p1,p2,p3] = face.map(i => verts[i]);
  const e1x=p1.x-p0.x, e1y=p1.y-p0.y, e1z=p1.z-p0.z;
  const e2x=p2.x-p0.x, e2y=p2.y-p0.y, e2z=p2.z-p0.z;
  let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
  const fcx=(p0.x+p1.x+p2.x+p3.x)*0.25, fcy=(p0.y+p1.y+p2.y+p3.y)*0.25, fcz=(p0.z+p1.z+p2.z+p3.z)*0.25;
  const ox=fcx-center.x, oy=fcy-center.y, oz=fcz-center.z;
  if (nx*ox+ny*oy+nz*oz < 0) { nx=-nx; ny=-ny; nz=-nz; }
  return nx*(-fcx) + ny*(-fcy) + nz*(-fcz) > 0;
}

function avgPoint(pts) {
  let sx=0, sy=0, sz=0;
  for (const p of pts) { sx+=p.x; sy+=p.y; sz+=p.z; }
  const inv = 1 / max(1, pts.length);
  return { x:sx*inv, y:sy*inv, z:sz*inv };
}

function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

// ── Lens ───────────────────────────────────────────────────────────────────
function beginLensClip(r) {
  const { rx, ry } = fishRadii(r);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.ellipse(width*0.5, height*0.5, rx, ry, 0, 0, TWO_PI);
  drawingContext.clip();
}
function endLensClip() { drawingContext.restore(); }

function drawLensBoundary(r) {
  const { rx, ry } = fishRadii(r);
  noFill();
  stroke(180, 180, 180, 200);
  strokeWeight(1.2);
  ellipse(width*0.5, height*0.5, rx*2, ry*2);
}

function fishRadii(r) {
  return { rx: r * fisheyeAspect.x / fisheyeAspect.y, ry: r };
}

// ── Grid fade helpers ──────────────────────────────────────────────────────
function buildLineRange(mn, mx, step) {
  const s = max(1e-6, abs(step));
  return { min: floor(min(mn,mx)/s)*s, max: ceil(max(mn,mx)/s)*s };
}

function horizFade(x, z, fadeEnd) {
  const dx = x - camera.position.x, dz = z - camera.position.z;
  const d = sqrt(dx*dx + dz*dz);
  const t = constrain((d - fadeEnd * 0.35) / max(1e-6, fadeEnd * 0.65), 0, 1);
  return (1 - smoothstep01(t)) * 255;
}

function vertFade(y, yOffset) {
  const dy = abs(y - camera.position.y);
  const t = constrain((dy - yOffset * 0.3) / max(1e-6, yOffset * 0.7), 0, 1);
  return 1 - smoothstep01(t);
}

function distFadeAlpha(wp, base, start, end) {
  const dx=wp.x-camera.position.x, dy=wp.y-camera.position.y, dz=wp.z-camera.position.z;
  const d = sqrt(dx*dx + dy*dy + dz*dz);
  const t = constrain((d - start) / max(1e-6, end - start), 0, 1);
  return base * (1 - smoothstep01(t));
}

function smoothstep01(t) { return t * t * (3 - 2 * t); }

// ── FOV / mode management ──────────────────────────────────────────────────
function updateModeControls(mode) {
  const fish = mode !== "perspective";
  setVisible(fovSlider,      fish);
  setVisible(perspFovSlider, !fish);
  setVisible(mapLambdaSlider,    mode === "lambda_tan");
  setVisible(mapMobiusASlider,   mode === "mobius");
  setVisible(mapKaleidoNSlider,  mode === "kaleido");
  setVisible(mapKaleidoRotSlider, mode === "kaleido");
  setVisible(mapSwirlSlider,       mode === "weird");
  setVisible(mapRippleSlider,      mode === "weird");
  setVisible(mapFoldSlider,        mode === "weird");
  setVisible(mapPowerPSlider,      mode === "power");
  setVisible(mapTanhKSlider,       mode === "tanh_map");
  setVisible(mapCPowNSlider,       mode === "cpow");
  setVisible(mapRadRippleASlider,    mode === "radripple");
  setVisible(mapRadRippleNSlider,    mode === "radripple");
  setVisible(mapRadRippleSpeedSlider, mode === "radripple");
  updateFovConstraint(mode, mapLambdaSlider ? mapLambdaSlider.value() : 0);
}

function setVisible(ctrl, visible) {
  if (!ctrl) return;
  visible ? ctrl.show() : ctrl.hide();
}

function updateFovConstraint(mode, lambda) {
  if (!fovSlider) return;
  if (mode === "orthographic") {
    fovSlider.value(180);
    fovSlider.attribute("min", "180");
    fovSlider.attribute("max", "180");
    return;
  }
  fovSlider.attribute("min", "30");
  let maxFov = mode === "stereo" ? 350 : 360;
  if (mode === "lambda_tan")
    maxFov = max(30, min(360, 180 / max(1e-4, abs(lambda)) - 0.5));
  fovSlider.attribute("max", `${maxFov}`);
  if (fovSlider.value() > maxFov) fovSlider.value(maxFov);
}

function applyLambdaLinkedFov(lambda) {
  if (!fovSlider) return;
  fovSlider.value(lerp(LAMBDA_FOV_AT_ZERO, LAMBDA_FOV_AT_ONE, constrain(abs(lambda), 0, 1)));
}

// ── Equation panel ─────────────────────────────────────────────────────────
const EQUATIONS = {
  equidistant:  ["equidistant  (r ∝ θ)",     ["\\rho = \\frac{\\theta}{\\theta_{\\max}}",  "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  orthographic: ["orthographic (r ∝ sinθ)",   ["\\rho = \\frac{\\sin\\theta}{\\sin\\theta_{\\max}}", "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  perspective:  ["perspective (gnomonic)",    ["f = \\frac{r}{\\tan\\theta_{\\max}}", "x = c_x + f\\,\\frac{X}{Z},\\quad y = c_y - f\\,\\frac{Y}{Z}"]],
  lambda_tan:   ["λ-tan blend",              ["\\rho = \\frac{\\tan(\\lambda\\theta)}{\\tan(\\lambda\\theta_{\\max})}", "\\lambda{\\to}0:\\rho{=}\\tfrac{\\theta}{\\theta_{\\max}},\\quad \\lambda{=}1:\\rho{=}\\tfrac{\\tan\\theta}{\\tan\\theta_{\\max}}"]],
  mobius:       ["möbius disk",              ["z = \\rho\\,e^{i\\phi},\\quad w = \\frac{z+a}{1+\\bar{a}z}", "x = c_x + r_x\\,\\mathrm{Re}(w),\\quad y = c_y - r_y\\,\\mathrm{Im}(w)"]],
  kaleido:      ["kaleidoscope",             ["\\phi' = \\operatorname{mirror}\\!\\left(\\phi,\\,\\tfrac{2\\pi}{n}\\right)", "x = c_x + \\rho\\,r_x\\cos\\phi',\\quad y = c_y - \\rho\\,r_y\\sin\\phi'"]],
  lambert:      ["等積射影 (Lambert)",       ["\\rho = \\frac{\\sin(\\theta/2)}{\\sin(\\theta_{\\max}/2)}", "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  power:        ["冪乗族",                   ["\\rho = \\left(\\frac{\\theta}{\\theta_{\\max}}\\right)^{p}", "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  tanh_map:     ["双曲線写像",               ["t = \\theta/\\theta_{\\max}", "\\rho = \\tanh(k\\,t)\\,/\\,\\tanh(k)"]],
  cpow:         ["複素冪",                   ["z = \\rho\\,e^{i\\phi},\\quad w = z^n", "\\rho' = |w|,\\quad \\phi' = \\arg(w)"]],
  radripple:    ["波紋写像",                 ["t = \\theta/\\theta_{\\max}", "\\rho = t + a\\sin(n\\pi t)"]],
  stereo:       ["ステレオグラフィック",     ["\\rho = \\frac{\\tan(\\theta/2)}{\\tan(\\theta_{\\max}/2)}", "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  reverse:      ["逆透視",                  ["\\rho = 1 - \\dfrac{\\theta}{\\theta_{\\max}}", "x = c_x + \\rho\\,r_x\\cos\\phi,\\quad y = c_y - \\rho\\,r_y\\sin\\phi"]],
  logmap:       ["複素対数",                ["w = \\ln t + i\\phi,\\quad t = \\theta/\\theta_{\\max}", "\\rho = |w|/|w_{\\max}|,\\quad \\phi' = \\arg(w)"]],
  weird:        ["custom g(θ,φ)",            ["\\phi' = \\phi + s\\,t^2 + 0.45r\\sin(6\\phi+2\\pi t)", "\\rho = t + r\\sin(8\\phi+2\\pi t)\\,t(1{-}t) + 0.8f\\sin(3\\pi t)\\,t(1{-}t)"]],
};

function updateEquationPanel(mode) {
  const panel = document.getElementById('equation-panel');
  if (!panel) return;
  const [title, lines] = EQUATIONS[mode] || ["?", []];
  const hasKatex = typeof window !== "undefined" && window.katex;
  const titleHtml = `<div id="eq-title">g(θ,φ): ${title}</div>`;
  const linesHtml = lines.map(line => {
    if (!hasKatex) return `<div style="margin-top:4px"><code>${line}</code></div>`;
    return `<div style="margin-top:4px">${window.katex.renderToString(line, { throwOnError: false, displayMode: true })}</div>`;
  }).join("");
  panel.innerHTML = titleHtml + linesHtml;
}

// ── Key help panel ─────────────────────────────────────────────────────────
function createKeyHelpPanel() {
  const d = createDiv(
    "<b>移動:</b> W/S = 前後 &nbsp; A/D = 左右 &nbsp; Q/E = 上下 &nbsp;&nbsp; " +
    "<b>視点:</b> ↑↓ = 上下向き &nbsp; ←→ = 左右向き"
  );
  d.style("position", "fixed");
  d.style("bottom", "10px");
  d.style("left", "50%");
  d.style("transform", "translateX(-50%)");
  d.style("font-family", "sans-serif");
  d.style("font-size", "12px");
  d.style("color", "#555");
  d.style("background", "rgba(255,255,255,0.85)");
  d.style("padding", "5px 16px");
  d.style("border-radius", "6px");
  d.style("white-space", "nowrap");
  d.style("pointer-events", "none");
}

// ── Misc helpers ───────────────────────────────────────────────────────────
function readNumber(ctrl, fallback) {
  if (!ctrl) return fallback;
  const v = Number(ctrl.value());
  if (Number.isFinite(v)) { ctrl._lastVal = v; return v; }
  return Number.isFinite(ctrl._lastVal) ? ctrl._lastVal : fallback;
}

function windowResized() {
  const side = canvasSide();
  resizeCanvas(side, side);
}
