import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cache: Record<string, THREE.Object3D> = {};

export async function loadItemModel(name: string): Promise<THREE.Object3D> {
  if (cache[name]) return cache[name].clone();
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      `/models/${name}.gltf`,
      (gltf) => {
        const scene = gltf.scene;
        if (name === 'cup') scene.scale.set(0.1, 0.1, 0.1);
        if (name === 'plate') scene.scale.set(0.15, 0.02, 0.15);
        cache[name] = scene;
        resolve(scene.clone());
      },
      undefined,
      reject,
    );
  });
}
