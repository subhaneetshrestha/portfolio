import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PROMPT } from '../content/resume';
import { reducedMotion } from '../lib/prefs';
import { Link } from '../lib/router';
import '../styles/tokens.css'; // readPalette below needs these as real computed styles
import { readPalette } from '../three/palette';
import { createRenderer } from '../three/renderer';
import { applyAspect, applyCameraOffset, buildScene, cappedDPR, dampParallax, idleDrift } from '../three/scene';
import styles from './landing.module.css';

// Task 8: the desk scene. Task 10 adds the click-to-dive raycast onto the
// screen mesh this already builds; nothing here reacts to a click yet.
export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, homeCameraPosition } = buildScene(readPalette());
    const { renderer, composer, setSize, dispose } = createRenderer(canvas, scene, camera);
    renderer.setPixelRatio(cappedDPR(window.devicePixelRatio));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      applyAspect(camera, w / h);
      setSize(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const pointer = new THREE.Vector2();
    const onPointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    canvas.addEventListener('pointermove', onPointerMove);

    const still = reducedMotion();
    const offset = new THREE.Vector2();
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      offset.copy(dampParallax(offset, idleDrift(now / 1000).add(pointer), dt));
      applyCameraOffset(camera, homeCameraPosition, offset);
      composer.render();
      raf = window.requestAnimationFrame(frame);
    };

    if (still) {
      // One still frame at rest — no drift, no parallax, no ongoing rAF loop.
      applyCameraOffset(camera, homeCameraPosition, offset);
      composer.render();
    } else {
      raf = window.requestAnimationFrame(frame);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      dispose();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        obj.geometry.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
      });
    };
  }, []);

  return (
    <div className={styles.landing}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.overlay}>
        <p>
          {PROMPT} <span className="cursor">▊</span>
        </p>
        <p className={styles.hint}>click the monitor to get inside</p>
        <Link to="/tui" className={styles.skip}>
          skip to the shell →
        </Link>
      </div>
    </div>
  );
}
