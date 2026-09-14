import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildMonitor } from './monitor';
import type { Palette } from './palette';

/**
 * The desk scene the landing page shows before a visitor dives in: a dark
 * room, a desk carrying the CRT, a tower and a keyboard, framed with a true
 * isometric camera. Everything here is primitives — see tasks/plan.md,
 * "The CRT is built procedurally", and "Landing scene redesign" for the
 * isometric/IBL/bevel rework this file went through after Checkpoint B
 * found the first pass "very bad and low quality".
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

function buildRoom(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room';

  // A dark floor with a soft radial falloff toward the desk, done as a vertex-color
  // gradient rather than a texture — no image asset for a plane nobody looks straight at.
  const floorGeometry = new THREE.CircleGeometry(6, 48);
  const center = new THREE.Color(palette.bg).multiplyScalar(1.6);
  const edge = new THREE.Color(palette.bg).multiplyScalar(0.4);
  const pos = floorGeometry.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const d = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / 6);
    const c = center.clone().lerp(edge, d);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  floorGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Two walls meeting in a corner behind/beside the desk — enough for the isometric
  // camera (looking from the +x/+y/+z octant) to read this as a room, not a void.
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.bg).multiplyScalar(3.4),
    roughness: 0.98,
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

  // A cool night window glow on the side wall — the counterpoint to the monitor's
  // warm key light, in the same direction as the existing secondary-tinted rim light.
  const windowMaterial = new THREE.MeshBasicMaterial({ color: palette.secondary });
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), windowMaterial);
  windowMesh.name = 'window';
  windowMesh.rotation.y = Math.PI / 2;
  windowMesh.position.set(ROOM_LEFT_X + 0.01, 2.3, 0.8);
  group.add(windowMesh);

  return group;
}

function buildRug(palette: Palette): THREE.Mesh {
  // Muted with an amber undertone — the reference's orange shag rug, translated
  // into something that sits quietly in the dark palette instead of competing with it.
  const rugColor = new THREE.Color(palette.fg).multiplyScalar(0.14).lerp(new THREE.Color(palette.accent), 0.16);
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 40),
    new THREE.MeshStandardMaterial({ color: rugColor, roughness: 1 }),
  );
  rug.name = 'rug';
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.3, 0.002, 1.4);
  rug.receiveShadow = true;
  return rug;
}

function buildChair(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'chair';
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.bg).multiplyScalar(2.5),
    roughness: 0.6,
    clearcoat: 0.3,
  });

  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.08, 0.5, 2, 0.06), material);
  seat.position.y = 0.5;
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.65, 0.08, 2, 0.06), material);
  back.position.set(0, 0.85, -0.24);
  back.rotation.x = THREE.MathUtils.degToRad(-8);
  back.castShadow = true;
  group.add(back);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), material);
  post.position.y = 0.26;
  group.add(post);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 5), material);
  base.position.y = 0.03;
  base.receiveShadow = true;
  group.add(base);

  return group;
}

function buildDesk(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'desk';
  // Clearcoat: a lacquered desk surface picks up the studio IBL as a soft
  // highlight, the same reason the CRT shell got MeshPhysicalMaterial.
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.fg).multiplyScalar(0.15),
    roughness: 0.6,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
  });

  const slab = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.08, 1.3, 2, 0.03), material);
  slab.position.y = 0.62;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const legXs = [-1.5, 1.5];
  for (const x of legXs) {
    const leg = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.62, 0.08, 1, 0.015), material);
    leg.position.set(x, 0.31, 0.55);
    leg.castShadow = true;
    group.add(leg);
    const legBack = leg.clone();
    legBack.position.z = -0.55;
    group.add(legBack);
  }

  return group;
}

function buildTower(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tower';
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.85, 0.7, 2, 0.025),
    new THREE.MeshPhysicalMaterial({ color: 0x161616, roughness: 0.5, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.35 }),
  );
  body.name = 'towerBody';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // One small status LED — the tower's one point of color, per tasks/plan.md.
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.015, 12),
    new THREE.MeshBasicMaterial({ color: palette.accent }),
  );
  led.name = 'led';
  led.position.set(0, 0.32, 0.351);
  group.add(led);

  // A slim vertical Go-cyan accent strip down the front edge — the reference's
  // magenta RGB tower, translated into the brand's primary token instead.
  const glow = new THREE.Mesh(
    new RoundedBoxGeometry(0.015, 0.7, 0.015, 1, 0.006),
    new THREE.MeshBasicMaterial({ color: palette.primary }),
  );
  glow.name = 'towerGlow';
  glow.position.set(0.14, 0, 0.353);
  group.add(glow);
  // A weak point light so the strip actually casts a little cyan onto the desk
  // beside it, rather than only glowing in isolation.
  const glowLight = new THREE.PointLight(new THREE.Color(palette.primary), 0.25, 1.2, 2);
  glowLight.position.copy(glow.position);
  group.add(glowLight);

  return group;
}

/** A grid of instanced key caps on a slab — one draw call for the whole board. */
function buildKeyboard(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'keyboard';
  const boardMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.fg).multiplyScalar(0.1),
    roughness: 0.7,
    clearcoat: 0.2,
  });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.03, 0.3, 1, 0.01), boardMaterial);
  group.add(slab);

  const COLS = 15;
  const ROWS = 5;
  const KEY_SIZE = 0.045;
  const GAP = 0.006;
  const keyGeometry = new RoundedBoxGeometry(KEY_SIZE, 0.014, KEY_SIZE, 1, 0.003);
  const keyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.55, clearcoat: 0.3 });
  const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, COLS * ROWS);
  keys.name = 'keys';
  keys.castShadow = true;
  const pitch = KEY_SIZE + GAP;
  const originX = -((COLS - 1) * pitch) / 2;
  const originZ = -((ROWS - 1) * pitch) / 2;
  const m = new THREE.Matrix4();
  let i = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      m.makeTranslation(originX + col * pitch, 0.022, originZ + row * pitch);
      keys.setMatrixAt(i++, m);
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  group.add(keys);

  return group;
}

function buildMousepad(palette: Palette): THREE.Mesh {
  const pad = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.008, 0.3, 1, 0.02),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.06), roughness: 0.9 }),
  );
  pad.name = 'mousepad';
  pad.receiveShadow = true;
  return pad;
}

function buildMouse(palette: Palette): THREE.Mesh {
  const mouse = new THREE.Mesh(
    new RoundedBoxGeometry(0.075, 0.035, 0.12, 2, 0.03),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.12), roughness: 0.45, clearcoat: 0.5 }),
  );
  mouse.name = 'mouse';
  mouse.castShadow = true;
  mouse.receiveShadow = true;
  return mouse;
}



function buildLaptop(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'laptop';
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.fg).multiplyScalar(0.12),
    roughness: 0.4,
    metalness: 0.3,
    clearcoat: 0.5,
  });

  const base = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.018, 0.24, 1, 0.015), material);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.012, 1, 0.015), material);
  screen.name = 'laptopScreen';
  // Hinged open: pivot from the base's back edge, tilted well past vertical.
  screen.position.set(0, 0.1, -0.114);
  screen.rotation.x = THREE.MathUtils.degToRad(-100);
  screen.castShadow = true;
  group.add(screen);

  return group;
}

function buildTablet(palette: Palette): THREE.Mesh {
  const tablet = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.012, 0.3, 1, 0.02),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.1), roughness: 0.35, clearcoat: 0.6 }),
  );
  tablet.name = 'tablet';
  tablet.castShadow = true;
  tablet.receiveShadow = true;
  return tablet;
}

function buildMug(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mug';
  const material = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(palette.secondary).multiplyScalar(0.6), roughness: 0.5, clearcoat: 0.3 });

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
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.08), roughness: 0.6 }),
  );
  cup.position.y = 0.04;
  cup.castShadow = true;
  cup.receiveShadow = true;
  group.add(cup);

  // A couple of pens leaning out, just enough to read as "pens" at this scale.
  const penMaterial = new THREE.MeshBasicMaterial({ color: palette.accent });
  for (const [x, tilt] of [[0.008, 0.15], [-0.006, -0.1]] as const) {
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), penMaterial);
    pen.position.set(x, 0.1, 0);
    pen.rotation.z = tilt;
    group.add(pen);
  }

  return group;
}

function buildSucculent(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'succulent';
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.026, 0.045, 16),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.15), roughness: 0.8 }),
  );
  pot.position.y = 0.0225;
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);

  const plant = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 6),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0x1c3a24), roughness: 0.9 }),
  );
  plant.position.y = 0.06;
  plant.scale.y = 0.8;
  plant.castShadow = true;
  group.add(plant);

  return group;
}

function buildShelf(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'shelf';
  const woodMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.fg).multiplyScalar(0.13),
    roughness: 0.6,
    clearcoat: 0.2,
  });

  const plank = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.04, 0.22, 1, 0.015), woodMaterial);
  plank.castShadow = true;
  plank.receiveShadow = true;
  group.add(plank);

  const books = new THREE.Group();
  books.name = 'books';
  const bookColors = [palette.secondary, palette.accent, palette.fg];
  let bx = -0.45;
  for (const color of bookColors) {
    const w = 0.05;
    const book = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.18, 0.16, 1, 0.008),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), roughness: 0.7 }),
    );
    book.position.set(bx, 0.11, 0);
    book.castShadow = true;
    books.add(book);
    bx += w + 0.01;
  }
  books.position.y = 0.02;
  group.add(books);

  const cactus = new THREE.Group();
  cactus.name = 'cactus';
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.05, 12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.15), roughness: 0.8 }),
  );
  pot.position.y = 0.045;
  cactus.add(pot);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.022, 0.07, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.85 }),
  );
  body.position.y = 0.11;
  cactus.add(body);
  cactus.position.set(0.4, 0.02, 0);
  group.add(cactus);

  return group;
}

function buildPoster(color: THREE.ColorRepresentation): THREE.Mesh {
  return new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.68, 0.015, 1, 0.01),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
}

function buildMonstera(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'monstera';
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.13, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.85), roughness: 0.6 }),
  );
  pot.position.y = 0.11;
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);

  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x224a2c, roughness: 0.85 });
  const leafSpots: [number, number, number, number][] = [
    [0, 0.55, 0, 0.22],
    [0.12, 0.72, 0.08, 0.17],
    [-0.14, 0.68, -0.06, 0.18],
    [0.02, 0.9, -0.1, 0.15],
  ];
  for (const [x, y, z, r] of leafSpots) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMaterial);
    leaf.position.set(x, y, z);
    leaf.scale.set(1, 1.3, 0.6);
    leaf.castShadow = true;
    group.add(leaf);
  }

  return group;
}

function buildBin(palette: Palette): THREE.Mesh {
  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.09, 0.22, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.1), roughness: 0.7, side: THREE.DoubleSide }),
  );
  bin.name = 'bin';
  bin.castShadow = true;
  bin.receiveShadow = true;
  return bin;
}

function buildSlippers(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'slippers';
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.accent).multiplyScalar(0.5), roughness: 0.9 });
  for (const x of [-0.09, 0.09]) {
    const slipper = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.03, 0.22, 1, 0.03), material);
    slipper.position.set(x, 0.015, 0);
    slipper.castShadow = true;
    slipper.receiveShadow = true;
    group.add(slipper);
  }
  return group;
}

export type Scene = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  monitor: ReturnType<typeof buildMonitor>;
  homeCameraPosition: THREE.Vector3;
};

export function buildScene(palette: Palette): Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.bg);
  scene.fog = new THREE.Fog(new THREE.Color(palette.bg).getHex(), 5, 13);

  scene.add(buildRoom(palette));
  scene.add(buildRug(palette));
  const chair = buildChair(palette);
  chair.position.set(0.3, 0, 1.35);
  scene.add(chair);

  const desk = buildDesk(palette);
  scene.add(desk);

  const monitor = buildMonitor(palette);
  monitor.group.position.set(0, 1.14, -0.35);
  scene.add(monitor.group);

  const tower = buildTower(palette);
  tower.position.set(1.35, 0.435 + 0.66, -0.35);
  scene.add(tower);

  const keyboard = buildKeyboard(palette);
  keyboard.position.set(0, 0.68, 0.35);
  scene.add(keyboard);

  const mousepad = buildMousepad(palette);
  mousepad.position.set(0.62, 0.664, 0.3);
  scene.add(mousepad);

  const mouse = buildMouse(palette);
  mouse.position.set(0.62, 0.685, 0.3);
  mouse.rotation.y = THREE.MathUtils.degToRad(8);
  scene.add(mouse);

  const laptop = buildLaptop(palette);
  laptop.scale.setScalar(1.7);
  laptop.position.set(-1.05, 0.669, 0.1);
  laptop.rotation.y = THREE.MathUtils.degToRad(12);
  scene.add(laptop);

  const tablet = buildTablet(palette);
  tablet.scale.setScalar(1.7);
  tablet.position.set(-0.62, 0.666, 0.42);
  tablet.rotation.y = THREE.MathUtils.degToRad(-6);
  scene.add(tablet);

  const mug = buildMug(palette);
  mug.scale.setScalar(1.6);
  mug.position.set(-1.15, 0.66, 0.5);
  scene.add(mug);

  const penCup = buildPenCup(palette);
  penCup.scale.setScalar(1.6);
  penCup.position.set(-1.35, 0.66, -0.35);
  scene.add(penCup);

  const succulent = buildSucculent(palette);
  succulent.scale.setScalar(1.6);
  succulent.position.set(1.05, 0.66, -0.5);
  scene.add(succulent);

  // Wall dressing, mounted on the back wall (z = ROOM_BACK_Z) above the desk.
  const shelf = buildShelf(palette);
  shelf.position.set(0.6, 2.15, ROOM_BACK_Z + 0.12);
  scene.add(shelf);

  const posterA = buildPoster(new THREE.Color(palette.fg).multiplyScalar(0.9));
  posterA.name = 'posterA';
  posterA.position.set(-1.4, 1.75, ROOM_BACK_Z + 0.01);
  scene.add(posterA);

  const posterB = buildPoster(new THREE.Color(palette.fg).multiplyScalar(0.35));
  posterB.name = 'posterB';
  posterB.position.set(1.9, 1.55, ROOM_BACK_Z + 0.01);
  scene.add(posterB);

  // One poster carries the brand mark — the block cursor, in --accent, per tasks/plan.md.
  const posterMark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.09),
    new THREE.MeshBasicMaterial({ color: palette.accent }),
  );
  posterMark.name = 'posterMark';
  posterMark.position.set(1.9, 1.4, ROOM_BACK_Z + 0.02);
  scene.add(posterMark);

  const monstera = buildMonstera(palette);
  monstera.position.set(-2.5, 0, -0.6);
  scene.add(monstera);

  const bin = buildBin(palette);
  bin.position.set(1.55, 0.11, 0.95);
  scene.add(bin);

  const slippers = buildSlippers(palette);
  slippers.position.set(0.85, 0.001, 1.95);
  scene.add(slippers);

  // Lighting: the monitor's own glow (in buildMonitor) is the warm key light. A cool rim
  // light tinted toward the secondary token separates the desk from the dark room,
  // and one shadow-casting spot gives the desk objects contact shadows. IBL (in
  // renderer.ts, via RoomEnvironment) supplies the soft ambient fill and the
  // reflections that make the new MeshPhysicalMaterial clearcoats read as physical.
  const rim = new THREE.DirectionalLight(new THREE.Color(palette.secondary), 0.35);
  rim.position.set(-3, 3, 1.5);
  scene.add(rim);

  const key = new THREE.SpotLight(0xffffff, 0.6, 9, Math.PI / 4.2, 0.45);
  key.position.set(2, 4, 2.5);
  // Aim at the desk SURFACE, not the desk group's origin (which sits at floor
  // level) — otherwise everything actually resting on the desk reads dim.
  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, 0.66, -0.1);
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
