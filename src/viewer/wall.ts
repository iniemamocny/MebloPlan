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
