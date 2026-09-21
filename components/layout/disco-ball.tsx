"use client";

import { useEffect, useRef } from "react";

const SIZE = 36;

/**
 * Tiny WebGL disco ball for the header — mirrored facets, slow spin.
 */
export function DiscoBall({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    let frameId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let pmrem: import("three").PMREMGenerator | null = null;
    let cleanupIo: (() => void) | undefined;

    void (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import(
        "three/addons/environments/RoomEnvironment.js"
      );
      if (disposed || !canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.z = 3.15;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(SIZE, SIZE, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;

      pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;

      const ball = new THREE.Group();
      scene.add(ball);

      const tileGeo = new THREE.PlaneGeometry(1, 1);
      const silverMats = [
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 1,
          roughness: 0.06,
          envMapIntensity: 1.7,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshStandardMaterial({
          color: 0xffe8f4,
          metalness: 1,
          roughness: 0.08,
          envMapIntensity: 1.6,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshStandardMaterial({
          color: 0xeee6ff,
          metalness: 1,
          roughness: 0.07,
          envMapIntensity: 1.65,
          side: THREE.DoubleSide,
        }),
      ];

      // Dense mirror grid — tile size scales with latitude so seams stay tight
      const lonSteps = 28;
      const latSteps = 18;
      const radius = 0.95;
      for (let lat = 0; lat < latSteps; lat++) {
        const phi0 = (lat / latSteps) * Math.PI;
        const phi1 = ((lat + 1) / latSteps) * Math.PI;
        const phi = (phi0 + phi1) / 2;
        const bandH = (phi1 - phi0) * radius * 1.02;
        const ringR = Math.sin(phi) * radius;
        const bandW = ((Math.PI * 2) / lonSteps) * Math.max(ringR, 0.08) * 1.05;

        for (let lon = 0; lon < lonSteps; lon++) {
          const theta = ((lon + 0.5) / lonSteps) * Math.PI * 2;
          const x = Math.sin(phi) * Math.cos(theta);
          const y = Math.cos(phi);
          const z = Math.sin(phi) * Math.sin(theta);
          const tile = new THREE.Mesh(
            tileGeo,
            silverMats[(lat + lon) % silverMats.length],
          );
          tile.scale.set(bandW, bandH, 1);
          tile.position.set(x, y, z).multiplyScalar(radius);
          tile.lookAt(0, 0, 0);
          tile.rotateY(Math.PI);
          ball.add(tile);
        }
      }

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 32, 24),
        new THREE.MeshStandardMaterial({
          color: 0xb8b0c4,
          metalness: 0.85,
          roughness: 0.3,
          envMapIntensity: 0.9,
        }),
      );
      ball.add(core);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      scene.add(new THREE.HemisphereLight(0xffffff, 0x5a2878, 0.7));

      const key = new THREE.DirectionalLight(0xffffff, 1.8);
      key.position.set(2.5, 3, 2);
      scene.add(key);

      const pink = new THREE.PointLight(0xff4db3, 4.5, 10);
      pink.position.set(1.6, 1.2, 2.2);
      scene.add(pink);

      const orchid = new THREE.PointLight(0xc83cd3, 3.8, 10);
      orchid.position.set(-1.8, 0.6, 1.8);
      scene.add(orchid);

      const gold = new THREE.PointLight(0xffc1d1, 3.2, 10);
      gold.position.set(0.2, -1.4, 2);
      scene.add(gold);

      const sparkle = new THREE.PointLight(0xffffff, 2.8, 8);
      sparkle.position.set(1.2, 1.5, 2);
      scene.add(sparkle);

      let visible = true;
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? true;
        },
        { threshold: 0.1 },
      );
      io.observe(canvas);
      cleanupIo = () => io.disconnect();

      const clock = new THREE.Clock();
      const spin = reduced ? 0 : 0.35;

      const render = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(render);
        if (!visible) return;

        const t = clock.getElapsedTime();
        ball.rotation.y = t * spin;
        ball.rotation.x = Math.sin(t * 0.4) * 0.12;

        pink.position.set(
          Math.cos(t * 1.1) * 2.1,
          0.8 + Math.sin(t * 0.7) * 0.6,
          1.6 + Math.sin(t * 1.1) * 0.8,
        );
        orchid.position.set(
          Math.cos(t * 0.85 + 2) * 2.0,
          Math.sin(t * 1.3) * 1.1,
          1.5 + Math.cos(t * 0.85) * 0.7,
        );
        gold.position.set(
          Math.sin(t * 1.4) * 1.8,
          -0.9 + Math.cos(t * 0.9) * 0.5,
          1.7,
        );

        pink.intensity = 3.8 + Math.sin(t * 3.1) * 1.4;
        orchid.intensity = 3.2 + Math.sin(t * 2.6 + 1) * 1.2;
        gold.intensity = 2.6 + Math.sin(t * 4.0 + 0.5) * 1.1;
        sparkle.intensity = 2.2 + Math.sin(t * 5.2) * 0.9;

        renderer?.render(scene, camera);
      };

      if (reduced) {
        renderer.render(scene, camera);
      } else {
        render();
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cleanupIo?.();
      pmrem?.dispose();
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className={className}
      aria-hidden
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
