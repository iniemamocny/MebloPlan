import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { usePlannerStore } from '../state/store';
import CabinetDragger from '../viewer/CabinetDragger';

export function setupThree(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f4f6);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(4, 3, 6);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(6, 8, 4);
  scene.add(dir);

  const grid = new THREE.GridHelper(10, 20, 0xdddddd, 0xcccccc);
  scene.add(grid);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const group = new THREE.Group();
  scene.add(group);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const playerControls = new PointerLockControls(camera, renderer.domElement);

  const cabinetDragger = new CabinetDragger(
    renderer,
    () => camera,
    group,
    usePlannerStore,
  );
  cabinetDragger.enable?.();

  const move = { forward: false, backward: false, left: false, right: false };
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        move.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        move.left = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        move.backward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        move.right = true;
        break;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        move.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        move.left = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        move.backward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        move.right = false;
        break;
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  const onResize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  const run = true;
  const floorHalf = 5;
  const speed = 0.1;
  const forward = new THREE.Vector3();
  const side = new THREE.Vector3();
  const moveDir = new THREE.Vector3();
  const loop = () => {
    if (!run) return;
    if (playerControls.isLocked) {
      const oldPos = camera.position.clone();
      forward.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      side.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      moveDir.set(0, 0, 0);
      if (move.forward) moveDir.add(forward);
      if (move.backward) moveDir.add(forward.clone().multiplyScalar(-1));
      if (move.left) moveDir.add(side.clone().multiplyScalar(-1));
      if (move.right) moveDir.add(side);
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize().multiplyScalar(speed);
        const newPos = oldPos.clone().add(moveDir);
        newPos.y = 1.6;
        newPos.x = Math.max(-floorHalf, Math.min(floorHalf, newPos.x));
        newPos.z = Math.max(-floorHalf, Math.min(floorHalf, newPos.z));
        let blocked = false;
        const box = new THREE.Box3();
        group.children.forEach((child) => {
          box.setFromObject(child);
          if (box.containsPoint(newPos)) blocked = true;
        });
        if (!blocked) camera.position.copy(newPos);
      }
      camera.position.y = 1.6;
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();

  return {
    scene,
    camera,
    renderer,
    controls,
    playerControls,
    group,
    cabinetDragger,
  };
}
