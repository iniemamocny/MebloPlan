import * as THREE from 'three';
import { Opening } from '../types';

export function createWallGeometry(
  lengthMm: number,
  heightMm: number,
  thicknessMm: number,
  openings: Opening[],
): THREE.BufferGeometry {
  const len = lengthMm / 1000;
  const h = heightMm / 1000;
  const t = thicknessMm / 1000;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, h);
  shape.lineTo(0, h);
  shape.lineTo(0, 0);
  openings.forEach((o) => {
    const ox = (o.offset || 0) / 1000;
    const ob = (o.bottom || 0) / 1000;
    const ow = (o.width || 0) / 1000;
    const oh = (o.height || 0) / 1000;
    const hole = new THREE.Path();
    hole.moveTo(ox, ob);
    hole.lineTo(ox + ow, ob);
    hole.lineTo(ox + ow, ob + oh);
    hole.lineTo(ox, ob + oh);
    hole.lineTo(ox, ob);
    shape.holes.push(hole);
  });
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: t,
    bevelEnabled: false,
  });
  geom.translate(-len / 2, -h / 2, -t / 2);
  return geom;
}

export function createWallMaterial(
  type: 'dzialowa' | 'nosna',
): THREE.Material[] {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = -size; i < size; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    if (type === 'nosna') {
      for (let i = 0; i < size * 2; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - size, size);
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  const topMaterial = new THREE.MeshStandardMaterial({ map: texture });
  const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d5db });
  // group 0 in ExtrudeGeometry corresponds to the wall's vertical faces while
  // group 1 represents the top and bottom faces. Returning the materials in
  // this order keeps the sides plain and applies the texture only to the top.
  return [sideMaterial, topMaterial];
}
