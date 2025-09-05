import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * Load a room model from a File object.
 * Supports glTF (gltf/glb) and OBJ formats.
 */
export async function loadRoomFile(file: File): Promise<THREE.Group> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  if (ext === 'gltf' || ext === 'glb') {
    const loader = new GLTFLoader();
    return await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        normalize(scene);
        resolve(scene);
      }, reject);
    });
  } else if (ext === 'obj') {
    const loader = new OBJLoader();
    const text = new TextDecoder().decode(arrayBuffer);
    const obj = loader.parse(text);
    normalize(obj);
    return obj;
  }
  throw new Error('Unsupported format');
}

/**
 * Center the model at origin and normalize units to meters.
 */
function normalize(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.length() > 100) {
    // assume centimeters and convert to meters
    obj.scale.setScalar(0.01);
    box.setFromObject(obj);
  }
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.sub(center);
}
