import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoomShapeMesh } from '../src/scene/roomShapeBuilder';
import type { RoomShape, ShapePoint } from '../src/types';

describe('buildRoomShapeMesh', () => {
  describe("mode: 'axis'", () => {
    it('centers meshes on segments and distributes thickness symmetrically', () => {
      const a: ShapePoint = { id: 'a', x: 0, y: 0 };
      const b: ShapePoint = { id: 'b', x: 1, y: 0 };
      const shape: RoomShape = {
        points: [a, b],
        segments: [{ start: a, end: b }],
      };
      const group = buildRoomShapeMesh(shape, {
        height: 3000,
        thickness: 200,
        mode: 'axis',
      });
      expect(group.children).toHaveLength(1);
      const mesh = group.children[0] as THREE.Mesh;
      const params = (mesh.geometry as THREE.BoxGeometry).parameters;
      expect(params.width).toBeCloseTo(1); // no length extension
      expect(params.depth).toBeCloseTo(0.2);
      expect(mesh.position.x).toBeCloseTo(0.5);
      expect(mesh.position.z).toBeCloseTo(0); // no offset
      mesh.updateMatrixWorld();
      const bbox = new THREE.Box3().setFromObject(mesh);
      expect(bbox.min.z).toBeCloseTo(-0.1);
      expect(bbox.max.z).toBeCloseTo(0.1);
    });
  });

  describe("mode: 'inside'", () => {
    it('creates wall meshes with provided thickness and height', () => {
      const a: ShapePoint = { id: 'a', x: 0, y: 0 };
      const b: ShapePoint = { id: 'b', x: 1, y: 0 };
      const shape: RoomShape = {
        points: [a, b],
        segments: [{ start: a, end: b }],
      };
      const group = buildRoomShapeMesh(shape, {
        height: 3000,
        thickness: 200,
        mode: 'inside',
      });
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
      const group = buildRoomShapeMesh(shape, {
        height: 3000,
        thickness,
        mode: 'inside',
      });
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

    it('aligns corner meshes for clockwise winding', () => {
      const a: ShapePoint = { id: 'a', x: 0, y: 0 };
      const b: ShapePoint = { id: 'b', x: 1, y: 0 };
      const c: ShapePoint = { id: 'c', x: 1, y: 1 };
      const shape: RoomShape = {
        points: [c, b, a],
        segments: [
          { start: c, end: b },
          { start: b, end: a },
        ],
      };
      const thickness = 200;
      const group = buildRoomShapeMesh(shape, {
        height: 3000,
        thickness,
        mode: 'inside',
      });
      expect(group.children).toHaveLength(2);

      const [vertical, horizontal] = group.children as THREE.Mesh[];
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

    it('expands wall thickness outward regardless of polygon winding', () => {
      const a: ShapePoint = { id: 'a', x: 0, y: 0 };
      const b: ShapePoint = { id: 'b', x: 1, y: 0 };
      const c: ShapePoint = { id: 'c', x: 1, y: 1 };
      const d: ShapePoint = { id: 'd', x: 0, y: 1 };
      const thickness = 200;

      // Clockwise winding
      const cw: RoomShape = {
        points: [a, b, c, d],
        segments: [
          { start: a, end: b },
          { start: b, end: c },
          { start: c, end: d },
          { start: d, end: a },
        ],
      };
      const cwGroup = buildRoomShapeMesh(cw, {
        height: 3000,
        thickness,
        mode: 'inside',
      });
      const top = cwGroup.children[0] as THREE.Mesh; // segment a->b
      expect(top.position.z).toBeCloseTo(thickness / 2000);

      // Counter-clockwise winding
      const ccw: RoomShape = {
        points: [a, d, c, b],
        segments: [
          { start: a, end: d },
          { start: d, end: c },
          { start: c, end: b },
          { start: b, end: a },
        ],
      };
      const ccwGroup = buildRoomShapeMesh(ccw, {
        height: 3000,
        thickness,
        mode: 'inside',
      });
      const left = ccwGroup.children[0] as THREE.Mesh; // segment a->d
      expect(left.position.x).toBeCloseTo(-thickness / 2000);
    });

    it('keeps first wall at positive Z with mixed Y coordinates for both windings', () => {
      const a: ShapePoint = { id: 'a', x: 0, y: -1 };
      const b: ShapePoint = { id: 'b', x: 1, y: -1 };
      const c: ShapePoint = { id: 'c', x: 1, y: 1 };
      const d: ShapePoint = { id: 'd', x: 0, y: 1 };
      const thickness = 200;

      // Counter-clockwise winding
      const ccw: RoomShape = {
        points: [a, b, c, d],
        segments: [
          { start: a, end: b },
          { start: b, end: c },
          { start: c, end: d },
          { start: d, end: a },
        ],
      };
      const ccwGroup = buildRoomShapeMesh(ccw, {
        height: 3000,
        thickness,
        mode: 'inside',
      });
      const topCcw = ccwGroup.children[0] as THREE.Mesh; // segment a->b
      expect(topCcw.position.z).toBeGreaterThan(0);

      // Clockwise winding
      const cw: RoomShape = {
        points: [b, a, d, c],
        segments: [
          { start: b, end: a },
          { start: a, end: d },
          { start: d, end: c },
          { start: c, end: b },
        ],
      };
        const cwGroup = buildRoomShapeMesh(cw, {
          height: 3000,
          thickness,
          mode: 'inside',
        });
        const topCw = cwGroup.children[0] as THREE.Mesh; // segment b->a
        expect(topCw.position.z).toBeGreaterThan(0);
      });
  });
});

