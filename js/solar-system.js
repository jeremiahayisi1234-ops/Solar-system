import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const ASSET_BASE = "assets-management/";

/** Expected texture filenames from your course zip (adjust if your zip uses different names). */
const TEXTURE_FILES = {
  sun: "sun.jpg",
  mercury: "mercury.jpg",
  venus: "venus.jpg",
  earth: "earth.jpg",
  mars: "mars.jpg",
  jupiter: "jupiter.jpg",
  saturn: "saturn.jpg",
  uranus: "uranus.jpg",
  neptune: "neptune.jpg",
  pluto: "pluto.jpg",
};

/**
 * Layout matches a typical “diagram” view: bodies orbit in the XZ plane,
 * with increasing radius so all appear “away from” the sun along their orbits.
 * Orbital angular speed: inner planets complete orbits faster (Kepler-inspired).
 */
const BODIES = [
  { name: "Mercury", radius: 0.35, orbitRadius: 5, speed: 2.8, tilt: 0.03, color: "#b5b5b5" },
  { name: "Venus", radius: 0.55, orbitRadius: 7.5, speed: 2.1, tilt: 0.05, color: "#e6c87a" },
  { name: "Earth", radius: 0.58, orbitRadius: 10, speed: 1.75, tilt: 0.41, color: "#4a90d9" },
  { name: "Mars", radius: 0.42, orbitRadius: 12.5, speed: 1.45, tilt: 0.09, color: "#c86446" },
  { name: "Jupiter", radius: 1.15, orbitRadius: 16, speed: 0.85, tilt: 0.05, color: "#c9a574" },
  { name: "Saturn", radius: 0.98, orbitRadius: 20, speed: 0.62, tilt: 0.09, color: "#e0d0a8", ring: true },
  { name: "Uranus", radius: 0.72, orbitRadius: 24, speed: 0.45, tilt: 1.7, color: "#9fd0e6" },
  { name: "Neptune", radius: 0.7, orbitRadius: 28, speed: 0.36, tilt: 0.49, color: "#5b7dd6" },
  { name: "Pluto", radius: 0.22, orbitRadius: 31.5, speed: 0.28, tilt: 0.3, color: "#c9b8a8" },
];

function createNoiseCanvas(baseHex, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const base = new THREE.Color(baseHex);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = 0.08 + Math.random() * 0.15;
    ctx.fillStyle = `rgba(${Math.floor(base.r * 255)},${Math.floor(base.g * 255)},${Math.floor(
      base.b * 255
    )},${a})`;
    ctx.fillRect(x, y, 2, 2);
  }
  return canvas;
}

function loadTextureOrFallback(loader, key, fallbackColor) {
  const file = TEXTURE_FILES[key];
  if (!file) {
    return Promise.resolve(new THREE.CanvasTexture(createNoiseCanvas(fallbackColor)));
  }
  return new Promise((resolve) => {
    loader.load(
      ASSET_BASE + file,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      () => resolve(new THREE.CanvasTexture(createNoiseCanvas(fallbackColor)))
    );
  });
}

async function main() {
  const container = document.getElementById("canvas-container");
  const w = container.clientWidth;
  const h = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020208);

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
  camera.position.set(0, 42, 58);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 15;
  controls.maxDistance = 200;

  const ambient = new THREE.AmbientLight(0x333366, 0.35);
  scene.add(ambient);

  const sunLight = new THREE.PointLight(0xfff5e6, 3.2, 400, 1.5);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const loader = new THREE.TextureLoader();
  const sunTex = await loadTextureOrFallback(loader, "sun", "#ffcc33");
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
  const sunGeo = new THREE.SphereGeometry(3.2, 64, 64);
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sunMesh);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })
  );
  scene.add(stars);

  const planetMeshes = [];

  for (let i = 0; i < BODIES.length; i++) {
    const b = BODIES[i];
    const key = b.name.toLowerCase();
    const map = await loadTextureOrFallback(loader, key, b.color);

    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.85,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 48, 48), mat);
    mesh.rotation.z = b.tilt;

    const orbit = new THREE.Group();
    orbit.userData.orbitSpeed = b.speed;
    mesh.position.set(b.orbitRadius, 0, 0);
    orbit.add(mesh);
    orbit.rotation.y = (i / BODIES.length) * Math.PI * 1.35 + 0.15;

    if (b.ring) {
      const torus = new THREE.TorusGeometry(b.radius * 1.75, b.radius * 0.38, 2, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xc9b896,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
        roughness: 0.95,
      });
      const ring = new THREE.Mesh(torus, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }

    scene.add(orbit);

    const orbitLineGeo = new THREE.RingGeometry(b.orbitRadius - 0.04, b.orbitRadius + 0.04, 128);
    const orbitLine = new THREE.Mesh(
      orbitLineGeo,
      new THREE.MeshBasicMaterial({
        color: 0x334466,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      })
    );
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);

    planetMeshes.push({ orbit, mesh, spinSpeed: 0.5 + i * 0.08 });
  }

  function onResize() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch);
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    sunMesh.rotation.y += dt * 0.15;

    planetMeshes.forEach(({ orbit, mesh, spinSpeed }) => {
      orbit.rotation.y += orbit.userData.orbitSpeed * dt * 0.35;
      mesh.rotation.y += spinSpeed * dt;
    });

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

main().catch(console.error);
