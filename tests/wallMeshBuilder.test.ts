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
    expect(params.width).toBeCloseTo(1); // length in metres
    expect(params.height).toBeCloseTo(3); // 3000mm -> 3m
    expect(params.depth).toBeCloseTo(0.2); // 200mm -> 0.2m
  });
});

