import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { usePlannerStore } from '../state/store';
import WallDrawer from '../viewer/WallDrawer';
export function setupThree(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f4f6);
  const perspCamera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  perspCamera.position.set(4, 3, 6);
  const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  orthoCamera.position.set(0, 20, 0);
  orthoCamera.lookAt(0, 0, 0);
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
  const grid = new THREE.GridHelper(20, 40, 0xdddddd, 0xcccccc);
  scene.add(grid);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const group = new THREE.Group();
  scene.add(group);
  const controls = new OrbitControls(perspCamera, renderer.domElement);
  controls.enableDamping = true;
  const wallDrawer = new WallDrawer(renderer, () => camera, usePlannerStore);
  const orthoSize = 20;
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
  const enterTopDownMode = () => {
    camera = orthoCamera;
    controls.object = camera as any;
    controls.enableRotate = false;
    group.visible = false;
    floor.visible = false;
    onResize();
    wallDrawer.enable();
  };
  const exitTopDownMode = () => {
    wallDrawer.disable();
    camera = perspCamera;
    controls.object = camera as any;
    controls.enableRotate = true;
    group.visible = true;
    floor.visible = true;
    onResize();
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
  };
}
