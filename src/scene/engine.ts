import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { usePlannerStore } from '../state/store';
import WallDrawer from '../viewer/WallDrawer';
import CabinetDragger from '../viewer/CabinetDragger';
export function setupThree(
  container: HTMLElement,
  callbacks?: {
    onEnterTopDownMode?: () => void;
    onExitTopDownMode?: () => void;
    onLengthChange?: (len: number) => void;
    onAngleChange?: (angle: number) => void;
  },
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f4f6);
  const perspCamera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  perspCamera.position.set(4, 3, 6);
  const orthoCamera = new THREE.OrthographicCamera(
    -5,
    5,
    5,
    -5,
    0.1,
    100,
  );
  orthoCamera.position.set(0, 20, 0);
  orthoCamera.lookAt(0, 0, 0);
  const defaultPerspPos = perspCamera.position.clone();
  const defaultPerspQuat = perspCamera.quaternion.clone();
  const topPos = orthoCamera.position.clone();
  const topQuat = orthoCamera.quaternion.clone();
  let camera: THREE.Camera = perspCamera;
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
  const controls = new OrbitControls(perspCamera, renderer.domElement);
  controls.enableDamping = true;
  const wallDrawer = new WallDrawer(
    renderer,
    () => camera,
    scene,
    usePlannerStore,
    callbacks?.onLengthChange,
    callbacks?.onAngleChange,
  );
  const cabinetDragger = new CabinetDragger(
    renderer,
    () => camera,
    group,
    usePlannerStore,
  );
  const orthoSize = 10;
  const onResize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    if (camera === perspCamera) {
      perspCamera.aspect = w / h;
      perspCamera.updateProjectionMatrix();
    } else {
      const aspect = w / h;
      orthoCamera.left = (-orthoSize * aspect) / 2;
      orthoCamera.right = (orthoSize * aspect) / 2;
      orthoCamera.top = orthoSize / 2;
      orthoCamera.bottom = -orthoSize / 2;
      orthoCamera.updateProjectionMatrix();
    }
  };
  window.addEventListener('resize', onResize);
  const transition = (
    startPos: THREE.Vector3,
    startQuat: THREE.Quaternion,
    endPos: THREE.Vector3,
    endQuat: THREE.Quaternion,
    onDone: () => void,
  ) => {
    const duration = 500;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      perspCamera.position.lerpVectors(startPos, endPos, t);
      perspCamera.quaternion.slerpQuaternions(startQuat, endQuat, t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onDone();
      }
    };
    requestAnimationFrame(animate);
  };
  const enterTopDownMode = () => {
    wallDrawer.disable();
    cabinetDragger.disable();
    transition(
      perspCamera.position.clone(),
      perspCamera.quaternion.clone(),
      topPos,
      topQuat,
      () => {
        camera = orthoCamera;
        controls.object = camera as any;
        controls.enableRotate = false;
        onResize();
        wallDrawer.enable();
        cabinetDragger.enable();
        callbacks?.onEnterTopDownMode?.();
      },
    );
  };
  const exitTopDownMode = () => {
    wallDrawer.disable();
    cabinetDragger.disable();
    callbacks?.onExitTopDownMode?.();
    perspCamera.position.copy(topPos);
    perspCamera.quaternion.copy(topQuat);
    camera = perspCamera;
    controls.object = camera as any;
    controls.enableRotate = true;
    onResize();
    transition(
      perspCamera.position.clone(),
      perspCamera.quaternion.clone(),
      defaultPerspPos,
      defaultPerspQuat,
      () => {},
    );
  };
  const run = true;
  const loop = () => {
    if (!run) return;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();
  return {
    scene,
    camera,
    renderer,
    controls,
    group,
    enterTopDownMode,
    exitTopDownMode,
    applyWallLength: (len: number) => {
      const safeLength = Math.min(len, 99999);
      wallDrawer.applyLength(safeLength);
    },
    setWallMode: (mode: 'draw' | 'edit' | 'move') => wallDrawer.setMode(mode),
  };
}
