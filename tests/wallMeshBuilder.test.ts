import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoomShapeMesh } from '../src/scene/roomShapeBuilder';
import type { RoomShape, ShapePoint } from '../src/types';

describe('buildRoomShapeMesh', () => {
  it('creates wall meshes with provided thickness and height', () => {
    const a: ShapePoint = { id: 'a', x: 0, y: 0 };
    const b: ShapePoint = { id: 'b', x: 1, y: 0 };
    const shape: RoomShape = {
      points: [a, b],
      segments: [{ start: a, end: b }],
    };
    const group = buildRoomShapeMesh(shape, { height: 3000, thickness: 200 });
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    const params = (mesh.geometry as THREE.BoxGeometry).parameters;
    // Length is extended by the wall thickness so adjoining walls overlap
    expect(params.width).toBeCloseTo(1.2); // length + thickness in metres
    expect(params.height).toBeCloseTo(3); // 3000mm -> 3m
    expect(params.depth).toBeCloseTo(0.2); // 200mm -> 0.2m
  });

  it('aligns corner meshes to expected inside and outside coordinates', () => {
    const a: ShapePoint = { id: 'a', x: 0, y: 0 };
    const b: ShapePoint = { id: 'b', x: 1, y: 0 };
    const c: ShapePoint = { id: 'c', x: 1, y: 1 };
    const shape: RoomShape = {
      points: [a, b, c],
      segments: [
        { start: a, end: b },
        { start: b, end: c },
      ],
    };
    const thickness = 200;
    const group = buildRoomShapeMesh(shape, { height: 3000, thickness });
    expect(group.children).toHaveLength(2);

    const [horizontal, vertical] = group.children as THREE.Mesh[];
    const t = thickness / 1000; // metres

    // Inside corner where the drawn segments meet
    const inside = {
      x: vertical.position.x - t / 2,
      z: horizontal.position.z - t / 2,
    };
    expect(inside.x).toBeCloseTo(1);
    expect(inside.z).toBeCloseTo(0);

    // Outside corner formed by the exterior faces of both walls
    const outside = {
      x: vertical.position.x + t / 2,
      z: horizontal.position.z + t / 2,
    };
    expect(outside.x).toBeCloseTo(1 + t);
    expect(outside.z).toBeCloseTo(t);
  });
});

