import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadModel } from './models';
import { buildMonitor } from './monitor';
import type { Palette } from './palette';

/**
 * The desk scene the landing page shows before a visitor dives in: a room,
 * a desk carrying the monitor and a tower, framed with a true isometric
 * camera. See tasks/plan.md, "Landing scene redesign" and "Loading a real
 * 3D model instead of hand-coded geometry" — most furniture here is now
 * loaded from Kenney's CC0 Furniture Kit (public/models/kenney/, via
 * loadModel() in ./models) and recolored to the site's exact sampled
 * palette; the monitor and tower stay hand-built primitives because they
 * need a named, raycastable screen and exact glow-color control that a
 * generic asset doesn't give us.
 */

export const LOOK_AT = new THREE.Vector3(0.15, 0.7, -0.15);

/** True isometric: a (1,1,1) direction gives exactly the classic ~35.264° elevation. */
const ISO_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
const ISO_DISTANCE = 6.2;

/** Vertical world-space height the frustum shows at aspect 1; width follows aspect. */
const FRUSTUM_HEIGHT = 7.5;

const ROOM_HEIGHT = 4.5;
const ROOM_BACK_Z = -3;
const ROOM_LEFT_X = -3.6;

/**
 * Grounds a loaded model onto a horizontal surface at height `restY` (the
 * floor at 0, or a desk top) and centers its footprint at (x, z). Kenney's
 * kit doesn't share a consistent pivot across models — some sit at their own
 * bottom-center, some don't (a raw .position.set() left the chair, keyboard,
 * mouse and laptop floating, offset, or hanging off the desk's back edge) —
 * so every loaded model goes through this rather than a direct position set.
 * Set rotation on the model BEFORE calling this: the box is measured with
 * whatever rotation is already applied.
 */
function groundAt(model: THREE.Object3D, x: number, z: number, restY = 0): THREE.Box3 {
  model.position.set(0, 0, 0);
  const box = new THREE.Box3().setFromObject(model);
  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  model.position.set(x - centerX, restY - box.min.y, z - centerZ);
  return new THREE.Box3().setFromObject(model);
}

/**
 * Mounts a loaded model on a wall: centers its footprint at x, sets its
 * lowest point to sit at y, and pushes its back face (min z) flush against
 * backZ. Unlike groundAt(), never floor-grounded — for shelves and anything
 * else that hangs rather than stands.
 */
function mountOnWall(model: THREE.Object3D, x: number, y: number, backZ: number): THREE.Box3 {
  model.position.set(0, 0, 0);
  const box = new THREE.Box3().setFromObject(model);
  const centerX = (box.min.x + box.max.x) / 2;
  model.position.set(x - centerX, y - box.min.y, backZ - box.min.z);
  return new THREE.Box3().setFromObject(model);
}

function buildRoom(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room';

  // A flat wood floor with a very slight, wide gradient (barely perceptible —
  // this is a lit daylight room, not a night vignette). Large enough that its
  // boundary sits outside the frame; a vertex-color gradient rather than a
  // texture, no image asset for a plane the camera barely grazes.
  const floorGeometry = new THREE.CircleGeometry(12, 48);
  const center = new THREE.Color(palette.wood);
  const edge = new THREE.Color(palette.woodDark).lerp(center, 0.5);
  const pos = floorGeometry.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const d = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / 12);
    const c = center.clone().lerp(edge, d);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  floorGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Two walls meeting in a corner behind/beside the desk — enough for the isometric
  // camera (looking from the +x/+y/+z octant) to read this as a room, not a void.
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: palette.wall,
    roughness: 0.95,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, ROOM_HEIGHT), wallMaterial);
  backWall.name = 'backWall';
  backWall.position.set(0, ROOM_HEIGHT / 2, ROOM_BACK_Z);
  backWall.receiveShadow = true;
  group.add(backWall);

  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(7, ROOM_HEIGHT), wallMaterial);
  sideWall.name = 'sideWall';
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(ROOM_LEFT_X, ROOM_HEIGHT / 2, 0);
  sideWall.receiveShadow = true;
  group.add(sideWall);

  // Daylight through the window on the side wall — the reference's actual light
  // source; the room is lit like midday, not like the monitor's own glow.
  const windowMaterial = new THREE.MeshBasicMaterial({ color: palette.window });
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), windowMaterial);
  windowMesh.name = 'window';
  windowMesh.rotation.y = Math.PI / 2;
  windowMesh.position.set(ROOM_LEFT_X + 0.01, 2.3, 0.8);
  group.add(windowMesh);

  return group;
}

function buildTower(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tower';
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: palette.tower, roughness: 0.35, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2,
  });

  const DEPTH = 0.7;
  const FRONT_Z = DEPTH / 2; // 0.35 — the true front plane, where the frame sits
  // The shell itself stops short of the true front — a solid RoundedBoxGeometry
  // has no "hole", so the only way to genuinely reveal the window behind it is
  // to make the whole shell shallower and let a separate frame (below) form
  // the visible front, open in the middle. Heavily rounded — the reference's
  // tower reads almost pill-shaped, not a sharp-edged box with a light bevel.
  const SHELL_FRONT_Z = FRONT_Z - 0.06;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.85, SHELL_FRONT_Z * 2, 4, 0.09), shellMaterial);
  body.name = 'towerBody';
  // Geometry is centered on its own origin, so at z=0 its front face already
  // lands exactly at SHELL_FRONT_Z — no extra offset needed.
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Vent slats across the top — real geometry, not a texture, matching the
  // reference's grille detail.
  const vents = new THREE.Group();
  vents.name = 'towerVents';
  const ventMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.tower).multiplyScalar(0.85), roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.012, 0.02, 1, 0.004), ventMaterial);
    slat.position.set(0, 0.425, -0.22 + i * 0.06);
    slat.castShadow = true;
    vents.add(slat);
  }
  group.add(vents);

  // Inside the window: a colorful fan — a warm hub over a magenta/violet glow
  // disc, the reference's RGB-fan look, all unlit so it reads as genuinely
  // glowing regardless of the room's own lighting. Sits just in front of the
  // shell's own (now-shallower) front face, genuinely open to view through
  // the frame's hole below — nothing solid occupies this z-range here.
  const winCenterY = -0.02;
  const winW = 0.2;
  const winH = 0.48;
  const fanZ = SHELL_FRONT_Z + 0.02;
  const glassBack = new THREE.Mesh(
    new RoundedBoxGeometry(winW, winH, 0.01, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: palette.bezel, roughness: 0.4 }),
  );
  glassBack.name = 'towerWindow';
  glassBack.position.set(0, winCenterY, SHELL_FRONT_Z + 0.005);
  group.add(glassBack);

  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: palette.glow2 }));
  glowDisc.position.set(0, winCenterY, fanZ);
  group.add(glowDisc);

  const fanHub = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), new THREE.MeshBasicMaterial({ color: palette.bookA }));
  fanHub.position.set(0, winCenterY, fanZ + 0.004);
  fanHub.rotation.z = Math.PI / 10;
  group.add(fanHub);

  // The reference's own magenta glow, sampled directly — kept as a named,
  // independently-colored element so the window reads as multi-hued, not flat.
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.065, 0.11, 24),
    new THREE.MeshBasicMaterial({ color: palette.glow, side: THREE.DoubleSide }),
  );
  glow.name = 'towerGlow';
  glow.position.set(0, winCenterY, fanZ + 0.002);
  group.add(glow);

  // A weak point light so the glow actually casts a little color onto the
  // desk beside it, rather than only glowing in isolation.
  const glowLight = new THREE.PointLight(new THREE.Color(palette.glow), 0.5, 1.6, 2);
  glowLight.position.set(0, winCenterY, FRONT_Z);
  group.add(glowLight);

  // The front frame: four bars at the true front plane, bordering the window
  // rectangle with an open center — this, not the shell, is what actually
  // reveals the fan/glow behind it.
  const frame = new THREE.Group();
  frame.name = 'towerFrame';
  const margin = 0.03;
  const barZ = FRONT_Z - 0.008;
  const vBar = new RoundedBoxGeometry(margin, winH + margin * 2, 0.02, 1, 0.006);
  const hBar = new RoundedBoxGeometry(winW + margin * 2, margin, 0.02, 1, 0.006);
  const left = new THREE.Mesh(vBar, shellMaterial);
  left.position.set(-(winW / 2 + margin / 2), winCenterY, barZ);
  frame.add(left);
  const right = new THREE.Mesh(vBar, shellMaterial);
  right.position.set(winW / 2 + margin / 2, winCenterY, barZ);
  frame.add(right);
  const top = new THREE.Mesh(hBar, shellMaterial);
  top.position.set(0, winCenterY + winH / 2 + margin / 2, barZ);
  frame.add(top);
  const bottom = new THREE.Mesh(hBar, shellMaterial);
  bottom.position.set(0, winCenterY - winH / 2 - margin / 2, barZ);
  frame.add(bottom);
  frame.children.forEach((m) => { (m as THREE.Mesh).castShadow = true; (m as THREE.Mesh).receiveShadow = true; });
  group.add(frame);

  // A physical power button beside the window frame, on solid material —
  // a recessed ring plus a raised cap — with the LED, green per the
  // reference, seated just below it.
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.tower).multiplyScalar(0.5), roughness: 0.5 });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16), buttonMaterial);
  button.name = 'towerButton';
  button.rotation.x = Math.PI / 2;
  button.position.set(winW / 2 + margin + 0.03, 0.06, FRONT_Z - 0.005);
  group.add(button);

  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.008, 12),
    new THREE.MeshBasicMaterial({ color: palette.led }),
  );
  led.name = 'led';
  led.position.set(winW / 2 + margin + 0.03, -0.02, FRONT_Z + 0.001);
  group.add(led);

  return group;
}

function buildMousepad(palette: Palette): THREE.Mesh {
  const pad = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.008, 0.3, 1, 0.02),
    new THREE.MeshPhysicalMaterial({ color: palette.mousepad, roughness: 0.9 }),
  );
  pad.name = 'mousepad';
  pad.receiveShadow = true;
  return pad;
}

function buildTablet(palette: Palette): THREE.Mesh {
  const tablet = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.012, 0.3, 1, 0.02),
    new THREE.MeshPhysicalMaterial({ color: palette.bezel, roughness: 0.35, clearcoat: 0.6 }),
  );
  tablet.name = 'tablet';
  tablet.castShadow = true;
  tablet.receiveShadow = true;
  return tablet;
}

function buildMug(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mug';
  const material = new THREE.MeshPhysicalMaterial({ color: palette.bezel, roughness: 0.45, clearcoat: 0.4 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.07, 16), material);
  body.position.y = 0.035;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 8, 16, Math.PI), material);
  handle.position.set(0.032, 0.035, 0);
  handle.rotation.y = Math.PI / 2;
  group.add(handle);

  return group;
}

function buildPenCup(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'penCup';
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.026, 0.08, 16),
    new THREE.MeshPhysicalMaterial({ color: palette.pot, roughness: 0.4, clearcoat: 0.3 }),
  );
  cup.position.y = 0.04;
  cup.castShadow = true;
  cup.receiveShadow = true;
  group.add(cup);

  // Orange and red-orange pens, matching the reference — two colors read as
  // "pens" better than one flat tone at this scale.
  const penColors = [palette.bookA, palette.bookB];
  for (const [i, [x, tilt]] of ([[0.008, 0.15], [-0.006, -0.1]] as const).entries()) {
    const pen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6),
      new THREE.MeshBasicMaterial({ color: penColors[i] }),
    );
    pen.position.set(x, 0.1, 0);
    pen.rotation.z = tilt;
    group.add(pen);
  }

  return group;
}

/** A framed poster: a white frame behind a slightly smaller, inset colored face. */
function buildPoster(faceColor: THREE.ColorRepresentation, frameColor: THREE.ColorRepresentation): THREE.Group {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.68, 0.02, 1, 0.008),
    new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6 }),
  );
  group.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.62),
    new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.85 }),
  );
  face.position.z = 0.011;
  group.add(face);
  return group;
}

function buildSlippers(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'slippers';
  const foamMaterial = new THREE.MeshStandardMaterial({ color: palette.pot, roughness: 0.85 });
  const strapMaterial = new THREE.MeshBasicMaterial({ color: palette.bookB });
  for (const x of [-0.09, 0.09]) {
    const slipper = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.03, 0.22, 1, 0.03), foamMaterial);
    slipper.position.set(x, 0.015, 0);
    slipper.castShadow = true;
    slipper.receiveShadow = true;
    group.add(slipper);

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 12, Math.PI), strapMaterial);
    strap.rotation.set(0, 0, Math.PI / 2);
    strap.position.set(x, 0.03, -0.02);
    group.add(strap);
  }
  return group;
}

export type Scene = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  monitor: ReturnType<typeof buildMonitor>;
  homeCameraPosition: THREE.Vector3;
};

const MODEL = (name: string) => `/models/kenney/${name}.glb`;

// Kenney's own internal unit doesn't match this scene's — calibrated once,
// visually, against the desk (see tasks/plan.md, "Loading a real 3D model").
// Not every prop shares one scale: the kit isn't internally consistent across
// categories (a chair and a bookcase aren't sized relative to the desk the
// way real furniture would be), so a few props get their own tuned factor.
const FURNITURE_SCALE = 4.3;
const CHAIR_SCALE = 1.7;
const SHELF_SCALE = 0.95;
// trashcan.glb measured taller than the desk itself (1.84 units) at
// FURNITURE_SCALE — another model the kit didn't author to the same internal
// scale as the desk/rug/monstera. Scaled down to sit at knee height instead.
const BIN_SCALE = 1.2;

export async function buildScene(palette: Palette): Promise<Scene> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.wall);
  scene.fog = new THREE.Fog(new THREE.Color(palette.wall).getHex(), 6, 15);

  scene.add(buildRoom(palette));

  // The rug grounds first so later floor objects (chair) can sit visibly on it.
  const rug = await loadModel(MODEL('rugRound'), palette, {
    carpet: palette.rug, carpetDarker: palette.rug, carpetWhite: palette.rug,
  });
  rug.scale.setScalar(FURNITURE_SCALE);
  groundAt(rug, 0.3, 1.4);
  rug.name = 'rug';
  scene.add(rug);

  // The kit's chair and desk aren't proportioned to the same internal scale —
  // measured (see git history for the calibration pass): chairDesk at
  // FURNITURE_SCALE alone comes out taller than the desk itself. Its own,
  // separately-tuned scale.
  const chair = await loadModel(MODEL('chairDesk'), palette, {
    metalMedium: palette.chair, carpet: palette.chair,
  });
  chair.scale.setScalar(CHAIR_SCALE);
  groundAt(chair, 0.25, 1.5);
  chair.name = 'chair';
  scene.add(chair);

  // The desk anchors every object that sits on top of it — its real (loaded,
  // measured) top surface height, not a guessed constant.
  const desk = await loadModel(MODEL('desk'), palette);
  desk.scale.setScalar(FURNITURE_SCALE);
  const deskBox = groundAt(desk, 0, 0);
  desk.name = 'desk';
  scene.add(desk);
  const deskTop = deskBox.max.y;

  const monitor = buildMonitor(palette);
  monitor.group.position.set(0, deskTop + 0.49, -0.35);
  scene.add(monitor.group);

  const tower = buildTower(palette);
  tower.position.set(1.35, deskTop + 0.435, -0.35);
  scene.add(tower);

  const keyboard = await loadModel(MODEL('computerKeyboard'), palette);
  keyboard.scale.setScalar(FURNITURE_SCALE);
  groundAt(keyboard, 0, 0.35, deskTop);
  keyboard.name = 'keyboard';
  scene.add(keyboard);

  const mousepad = buildMousepad(palette);
  mousepad.position.set(0.62, deskTop + 0.004, 0.3);
  scene.add(mousepad);

  const mouse = await loadModel(MODEL('computerMouse'), palette);
  mouse.scale.setScalar(FURNITURE_SCALE);
  mouse.rotation.y = THREE.MathUtils.degToRad(8);
  groundAt(mouse, 0.62, 0.3, deskTop + 0.02);
  mouse.name = 'mouse';
  scene.add(mouse);

  // laptop.glb's open footprint measured far wider than the desk's own left
  // half at FURNITURE_SCALE (1.33 units — it swallowed the keyboard, tablet,
  // mug and pen cup entirely, and hung 0.13 units off the desk's own edge).
  // A dedicated smaller scale, so the left side of the desk has room for its
  // other occupants instead of one prop covering all of them.
  const laptop = await loadModel(MODEL('laptop'), palette);
  laptop.scale.setScalar(3.2);
  laptop.rotation.y = THREE.MathUtils.degToRad(6);
  groundAt(laptop, -1.05, -0.15, deskTop);
  laptop.name = 'laptop';
  scene.add(laptop);

  const tablet = buildTablet(palette);
  tablet.scale.setScalar(1.7);
  tablet.rotation.y = THREE.MathUtils.degToRad(-6);
  tablet.position.set(-1.05, deskTop + 0.006, 0.6);
  scene.add(tablet);

  const mug = buildMug(palette);
  mug.scale.setScalar(1.6);
  mug.position.set(-1.45, deskTop, 0.55);
  scene.add(mug);

  const penCup = buildPenCup(palette);
  penCup.scale.setScalar(1.6);
  penCup.position.set(-1.45, deskTop, -0.7);
  scene.add(penCup);

  // Front-right corner of the desk, clear of the tower's footprint — at its
  // old spot (tucked behind the tower in x and z) the isometric camera's
  // (1,1,1) view direction let the tower fully occlude it.
  const succulent = await loadModel(MODEL('plantSmall1'), palette, { wood: palette.pot, woodDark: palette.pot });
  succulent.scale.setScalar(FURNITURE_SCALE * 0.7);
  groundAt(succulent, 1.35, 0.55, deskTop);
  succulent.name = 'succulent';
  scene.add(succulent);

  // Wall dressing, mounted on the back wall above the desk.
  // bookcaseOpen.glb is a full floor-to-shoulder bookcase in the kit's own
  // terms, not a small floating shelf — using it at FURNITURE_SCALE produced
  // something the size of a ladder. Scaled down hard and mounted on the wall
  // (centered in x, its bottom edge at a chosen height, its back flush against
  // the wall) rather than floor-grounded.
  const shelf = await loadModel(MODEL('bookcaseOpen'), palette);
  shelf.scale.setScalar(SHELF_SCALE);
  const shelfBox = mountOnWall(shelf, 0.6, 2.0, ROOM_BACK_Z + 0.02);
  shelf.name = 'shelf';
  scene.add(shelf);

  const books = await loadModel(MODEL('books'), palette, {
    carpetDarker: palette.bookB, carpetWhite: palette.bookA, plant: palette.bookC,
  });
  books.scale.setScalar(SHELF_SCALE);
  mountOnWall(books, 0.35, shelfBox.max.y - 0.02, ROOM_BACK_Z + 0.06);
  books.name = 'books';
  scene.add(books);

  const shelfCactus = await loadModel(MODEL('plantSmall1'), palette);
  shelfCactus.scale.setScalar(SHELF_SCALE * 0.8);
  mountOnWall(shelfCactus, 0.95, shelfBox.max.y - 0.02, ROOM_BACK_Z + 0.06);
  shelfCactus.name = 'cactus';
  scene.add(shelfCactus);

  // Poster A: a dark, moody face (the reference's illustrated bottle poster) —
  // a solid color stands in for the artwork itself; recreating someone else's
  // specific illustration isn't the goal, matching its color language is.
  const posterA = buildPoster(palette.bezel, palette.wall);
  posterA.name = 'posterA';
  posterA.position.set(-1.4, 1.75, ROOM_BACK_Z + 0.01);
  scene.add(posterA);

  // Poster B: a plain cream face (the reference's "Stay Hungry" text poster).
  const posterB = buildPoster(new THREE.Color(palette.wall).multiplyScalar(0.97), palette.wall);
  posterB.name = 'posterB';
  posterB.position.set(1.9, 1.55, ROOM_BACK_Z + 0.01);
  scene.add(posterB);

  // A third poster on the side wall — the reference's colorful running-figure
  // print — approximated as a bright accent face, same reasoning as posterA.
  const posterC = buildPoster(palette.glow2, palette.wall);
  posterC.name = 'posterC';
  posterC.rotation.y = Math.PI / 2;
  posterC.position.set(ROOM_LEFT_X + 0.02, 1.9, -1.6);
  scene.add(posterC);

  // Poster A carries the brand mark — the block cursor — in the tower's own
  // magenta glow color, tying the landing back to the terminal it opens into.
  const posterMark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.09),
    new THREE.MeshBasicMaterial({ color: palette.glow }),
  );
  posterMark.name = 'posterMark';
  posterMark.position.set(-1.4, 1.62, ROOM_BACK_Z + 0.02);
  scene.add(posterMark);

  const monstera = await loadModel(MODEL('pottedPlant'), palette, { wood: palette.pot, woodDark: palette.pot });
  monstera.scale.setScalar(FURNITURE_SCALE);
  groundAt(monstera, -2.5, -0.6);
  monstera.name = 'monstera';
  scene.add(monstera);

  const bin = await loadModel(MODEL('trashcan'), palette);
  bin.scale.setScalar(BIN_SCALE);
  groundAt(bin, 1.55, 0.95);
  bin.name = 'bin';
  scene.add(bin);

  const slippers = buildSlippers(palette);
  slippers.position.set(0.85, 0.001, 1.95);
  scene.add(slippers);

  // Lighting: a daylight scene, not a night one — the window (in buildRoom) is
  // the implied source. A warm fill light stands in for it directionally, and
  // one shadow-casting key light gives the desk objects contact shadows. IBL
  // (in renderer.ts, via RoomEnvironment) supplies most of the soft ambient
  // fill that makes the MeshPhysicalMaterial clearcoats read as physical.
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-3, 3, 1.5);
  scene.add(fill);

  const key = new THREE.SpotLight(0xffffff, 0.55, 9, Math.PI / 4.2, 0.45);
  key.position.set(2, 4, 2.5);
  // Aim at the desk SURFACE, not the desk's own group origin — otherwise
  // everything actually resting on the desk reads dim.
  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, deskTop, -0.1);
  scene.add(keyTarget);
  key.target = keyTarget;
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const camera = new THREE.OrthographicCamera();
  applyAspect(camera, 1);
  const homeCameraPosition = LOOK_AT.clone().add(ISO_DIRECTION.clone().multiplyScalar(ISO_DISTANCE));
  camera.position.copy(homeCameraPosition);
  camera.lookAt(LOOK_AT);

  return { scene, camera, monitor, homeCameraPosition };
}

/**
 * Resizes the orthographic frustum for a new aspect ratio, keeping the
 * vertical extent fixed — the isometric equivalent of setting `camera.aspect`
 * on a perspective camera. Call after every canvas resize.
 */
export function applyAspect(camera: THREE.OrthographicCamera, aspect: number): void {
  const halfHeight = FRUSTUM_HEIGHT / 2;
  const halfWidth = halfHeight * aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = 0.1;
  camera.far = 30;
  camera.updateProjectionMatrix();
}

/** A 3x/4x phone display triples fragment cost for no visible gain; cap it. */
export const cappedDPR = (raw: number): number => Math.min(raw, 2);

/**
 * Idle drift: a small, slow Lissajous wander around home so the scene never
 * looks frozen. Pure and deterministic in t (seconds) — no Date.now() inside.
 */
export function idleDrift(t: number, amplitude = 0.12, periodSeconds = 18): THREE.Vector2 {
  const w = (2 * Math.PI) / periodSeconds;
  return new THREE.Vector2(Math.sin(t * w) * amplitude, Math.sin(t * w * 0.6) * amplitude * 0.5);
}

/**
 * Exponential damping toward a target — frame-rate independent (uses dt, not a
 * fixed step) so parallax feels the same at 30fps and 120fps.
 */
export function dampParallax(
  current: THREE.Vector2,
  targetPointer: THREE.Vector2,
  dt: number,
  halfLifeSeconds = 0.25,
  pointerInfluence = 0.2,
): THREE.Vector2 {
  const k = 1 - Math.pow(0.5, dt / halfLifeSeconds);
  const target = targetPointer.clone().multiplyScalar(pointerInfluence);
  return current.clone().lerp(target, k);
}

/** Applies a camera offset from its resting position and re-aims it at the desk. */
export function applyCameraOffset(camera: THREE.Camera, home: THREE.Vector3, offset: THREE.Vector2): void {
  camera.position.set(home.x + offset.x, home.y + offset.y, home.z);
  camera.lookAt(LOOK_AT);
}
