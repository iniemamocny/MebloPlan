import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { usePlannerStore } from '../state/store';
import CabinetDragger from '../viewer/CabinetDragger';

export function setupThree(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9fafc);

  const perspectiveCamera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  perspectiveCamera.position.set(4, 3, 6);

  const aspect = container.clientWidth / container.clientHeight;
  const size = 5;
  const orthographicCamera = new THREE.OrthographicCamera(
    -size * aspect,
    size * aspect,
    size,
    -size,
    0.1,
    100,
  );
  orthographicCamera.position.set(0, 10, 0);
  orthographicCamera.up.set(0, 0, -1);
  orthographicCamera.lookAt(0, 0, 0);

  let camera: THREE.Camera = perspectiveCamera;

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

  const boardWidth = 16;
  const boardHeight = 9;
  let grid: THREE.LineSegments | null = null;
  let currentDivX = 0;
  let currentDivY = 0;
  const updateGrid = (divisions: number) => {
    const divX = Math.max(1, Math.round(divisions));
    const divY = Math.max(
      1,
      Math.round(divisions * (boardHeight / boardWidth)),
    );
    if (divX === currentDivX && divY === currentDivY) return;
    if (grid) {
      scene.remove(grid);
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    }
    const vertices: number[] = [];
    for (let i = 0; i <= divX; i++) {
      const x = -boardWidth / 2 + (i * boardWidth) / divX;
      vertices.push(x, 0, -boardHeight / 2, x, 0, boardHeight / 2);
    }
    for (let j = 0; j <= divY; j++) {
      const z = -boardHeight / 2 + (j * boardHeight) / divY;
      vertices.push(-boardWidth / 2, 0, z, boardWidth / 2, 0, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    const material = new THREE.LineBasicMaterial({ color: 0x515152 });
    grid = new THREE.LineSegments(geometry, material);
    scene.add(grid);
    currentDivX = divX;
    currentDivY = divY;
  };
  const baseDivisions = Math.max(
    1,
    Math.round(boardWidth / (usePlannerStore.getState().gridSize / 100)),
  );
  updateGrid(baseDivisions);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth, boardHeight),
    new THREE.MeshStandardMaterial({ color: 0xf9fafc, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const group = new THREE.Group();
  scene.add(group);

  let controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const playerControls = new PointerLockControls(perspectiveCamera, renderer.domElement);
  const isMobile =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
  if (isMobile) {
    (playerControls as any).lock = () => {
      (playerControls as any).isLocked = true;
      playerControls.dispatchEvent({ type: 'lock' });
    };
    (playerControls as any).unlock = () => {
      (playerControls as any).isLocked = false;
      playerControls.dispatchEvent({ type: 'unlock' });
    };
  }

  const cabinetDragger = new CabinetDragger(
    renderer,
    () => camera,
    group,
    usePlannerStore,
  );
  cabinetDragger.enable?.();

  const move = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
  };
  const setMove = ({
    forward = false,
    backward = false,
    left = false,
    right = false,
  }) => {
    move.forward = forward;
    move.backward = backward;
    move.left = left;
    move.right = right;
  };
  const setMoveFromJoystick = ({ x = 0, y = 0 }: { x?: number; y?: number }) => {
    const t = 0.3;
    setMove({
      forward: y < -t,
      backward: y > t,
      left: x < -t,
      right: x > t,
    });
  };
  const updateCameraRotation = (dx: number, dy: number) => {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= dx * 0.002;
    euler.x -= dy * 0.002;
    const PI_2 = Math.PI / 2;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
    camera.quaternion.setFromEuler(euler);
  };
  const resetCameraRotation = () => {
    camera.rotation.set(0, 0, 0);
  };
  const onJump = () => {
    move.jump = true;
    if (camera.position.y <= (move.crouch ? crouchHeight : playerHeight) + 0.01)
      velocityY = 0.2;
    setTimeout(() => (move.jump = false), 100);
  };
  const onCrouch = (active: boolean) => {
    move.crouch = active;
    if (active) {
      if (camera.position.y <= playerHeight + 0.01) camera.position.y = crouchHeight;
    } else {
      camera.position.y = Math.max(camera.position.y, playerHeight);
    }
  };
  let velocityY = 0;
  const gravity = 0.01;
  let playerHeight = usePlannerStore.getState().playerHeight;
  let crouchHeight = playerHeight - 0.6;
  let playerSpeed = usePlannerStore.getState().playerSpeed;
  const movementKeys = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
    'ControlLeft',
    'ControlRight',
  ]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault();
      return;
    }
    if (playerControls.isLocked && movementKeys.has(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
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
      case 'Space':
        move.jump = true;
        if (camera.position.y <= (move.crouch ? crouchHeight : playerHeight) + 0.01)
          velocityY = 0.2;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        move.crouch = true;
        if (camera.position.y <= playerHeight + 0.01) camera.position.y = crouchHeight;
        break;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault();
      return;
    }
    if (playerControls.isLocked && movementKeys.has(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
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
      case 'Space':
        move.jump = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        move.crouch = false;
        camera.position.y = Math.max(camera.position.y, playerHeight);
        break;
    }
  };
  document.addEventListener('keydown', onKeyDown, { capture: true });
  document.addEventListener('keyup', onKeyUp, { capture: true });

  let lookId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  const onPointerDown = (e: PointerEvent) => {
    if (e.clientX > window.innerWidth / 2) {
      lookId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (lookId !== e.pointerId || !playerControls.isLocked) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= dx * 0.002;
    euler.x -= dy * 0.002;
    const PI_2 = Math.PI / 2;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
    camera.quaternion.setFromEuler(euler);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (lookId === e.pointerId) lookId = null;
  };
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  const onResize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    perspectiveCamera.aspect = w / h;
    perspectiveCamera.updateProjectionMatrix();
    const aspect = w / h;
    orthographicCamera.left = -size * aspect;
    orthographicCamera.right = size * aspect;
    orthographicCamera.top = size;
    orthographicCamera.bottom = -size;
    orthographicCamera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  const run = true;
  const floorHalf = 5;
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
        moveDir.normalize().multiplyScalar(playerSpeed);
        const collisionPos = oldPos.clone().add(moveDir);
        collisionPos.y = playerHeight;
        collisionPos.x = Math.max(-floorHalf, Math.min(floorHalf, collisionPos.x));
        collisionPos.z = Math.max(-floorHalf, Math.min(floorHalf, collisionPos.z));
        let blocked = false;
        const box = new THREE.Box3();
        group.children.forEach((child) => {
          box.setFromObject(child);
          if (box.containsPoint(collisionPos)) blocked = true;
        });
        if (!blocked) {
          camera.position.x = collisionPos.x;
          camera.position.z = collisionPos.z;
        }
      }
      camera.position.y += velocityY;
      const minY = move.crouch ? crouchHeight : playerHeight;
      if (camera.position.y <= minY) {
        camera.position.y = minY;
        velocityY = 0;
      } else {
        velocityY -= gravity;
      }
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();

  const setPlayerParams = ({ height, speed }: { height?: number; speed?: number }) => {
    if (typeof height === 'number') {
      playerHeight = height;
      crouchHeight = height - 0.6;
    }
    if (typeof speed === 'number') playerSpeed = speed;
  };

  const dispose = () => {
    document.removeEventListener('keydown', onKeyDown, { capture: true });
    document.removeEventListener('keyup', onKeyUp, { capture: true });
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('resize', onResize);
  };

  const three: any = {
    scene,
    camera,
    renderer,
    controls,
    playerControls,
    group,
    cabinetDragger,
    perspectiveCamera,
    orthographicCamera,
    setPlayerParams,
    setMove,
    setMoveFromJoystick,
    updateCameraRotation,
    resetCameraRotation,
    onJump,
    onCrouch,
    updateGrid,
    dispose,
  };

  const setCamera = (cam: THREE.Camera) => {
    camera = cam;
    three.camera = cam;
  };
  const setControls = (c: OrbitControls) => {
    controls = c;
    three.controls = c;
  };

  three.setCamera = setCamera;
  three.setControls = setControls;

  return three;
}
