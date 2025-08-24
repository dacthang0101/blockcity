import * as THREE from 'three';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface ObjectManager {
    mesh: THREE.InstancedMesh;
    addObject: (x: number, y: number, gridCellSize: number, rotY?: number, scale?: number) => number | null;
    removeObject: (index: number) => void;
    freeIndices: number[];
}

export function createObjectManager(object: THREE.Object3D, gridCellSize: number, maxCount: number): ObjectManager {
    // Thu thập tất cả mesh con
    const meshes: THREE.Mesh[] = [];
    object.traverse((child: any) => {
        if (child.isMesh) {
            child.geometry = child.geometry.toNonIndexed();
            meshes.push(child);
        }
    });

    if (meshes.length === 0) {
        throw new Error('No mesh found in object');
    }

    // Giả sử tất cả mesh dùng chung material
    const material = meshes[0].material;

    // Apply transform của từng mesh trước khi merge
    const geometries = meshes.map(m => {
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld); // giữ nguyên hình dạng ban đầu trong FBX
        return g;
    });

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);

    // Scale model fit vào 1 grid cell
    const box = new THREE.Box3().setFromBufferAttribute(mergedGeometry.attributes.position);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = gridCellSize / maxDim;
    mergedGeometry.center();
    mergedGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();

    // InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(mergedGeometry, material, maxCount);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = false;

    // Pool quản lý index
    const dummy = new THREE.Object3D();
    const freeIndices: number[] = Array.from({ length: maxCount }, (_, i) => i);

    function addObject(x: number, y: number, cellSize: number, rotY: number = 0, scale: number = 1): number | null {
        if (freeIndices.length === 0) {
            console.warn("Đã đạt số lượng tối đa!");
            return null;
        }
        const index = freeIndices.pop() as number;

        const gridX = x * cellSize + cellSize / 2;
        const gridZ = y * cellSize + cellSize / 2;

        dummy.position.set(gridX, cellSize / 2, gridZ);
        // dummy.rotation.y = rotY;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(index, dummy.matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;

        return index;
    }

    function removeObject(index: number) {
        dummy.position.set(0, -99999, 0); // Ẩn xuống dưới
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(index, dummy.matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;

        freeIndices.push(index);
    }

    return {
        mesh: instancedMesh,
        addObject,
        removeObject,
        freeIndices
    };
}
