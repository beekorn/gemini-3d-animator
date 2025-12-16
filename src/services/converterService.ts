import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const HEIGHT = 1.75;
const ARM_SPAN = 1.6;
const HALF_SPAN = ARM_SPAN / 2;

const BONES = {
  ROOT: 'Hips', SPINE: 'Spine', CHEST: 'Spine1', NECK: 'Neck', HEAD: 'Head',
  L_SHOULDER: 'LeftShoulder', L_ARM: 'LeftArm', L_FOREARM: 'LeftForeArm', L_HAND: 'LeftHand',
  R_SHOULDER: 'RightShoulder', R_ARM: 'RightArm', R_FOREARM: 'RightForeArm', R_HAND: 'RightHand',
  L_UPLEG: 'LeftUpLeg', L_LEG: 'LeftLeg', L_FOOT: 'LeftFoot',
  R_UPLEG: 'RightUpLeg', R_LEG: 'RightLeg', R_FOOT: 'RightFoot'
};

const applyPlanarUVs = (geometry: THREE.BufferGeometry) => {
  const posAttribute = geometry.attributes.position;
  const uvAttribute = geometry.attributes.uv;
  const worldMinX = -HALF_SPAN * 0.9; 
  const worldMaxX = HALF_SPAN * 0.9;
  const worldMinY = 0;
  const worldMaxY = HEIGHT * 1.05;
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const y = posAttribute.getY(i);
    let u = (x - worldMinX) / (worldMaxX - worldMinX);
    let v = (y - worldMinY) / (worldMaxY - worldMinY);
    u = Math.max(0.001, Math.min(0.999, u));
    v = Math.max(0.001, Math.min(0.999, v));
    uvAttribute.setXY(i, u, v);
  }
};

const mergeGeometries = (geometries: THREE.BufferGeometry[]) => {
  let vertexCount = 0;
  geometries.forEach(g => vertexCount += g.attributes.position.count);
  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const uv = new Float32Array(vertexCount * 2);
  const skinIndex = new Uint16Array(vertexCount * 4);
  const skinWeight = new Float32Array(vertexCount * 4);
  let offset = 0;
  for (const geom of geometries) {
    const count = geom.attributes.position.count;
    position.set(geom.attributes.position.array as Float32Array, offset * 3);
    normal.set(geom.attributes.normal.array as Float32Array, offset * 3);
    uv.set(geom.attributes.uv.array as Float32Array, offset * 2);
    if (geom.attributes.skinIndex) skinIndex.set(geom.attributes.skinIndex.array as Uint16Array, offset * 4);
    if (geom.attributes.skinWeight) skinWeight.set(geom.attributes.skinWeight.array as Float32Array, offset * 4);
    else for (let i = 0; i < count; i++) skinWeight[ (offset + i) * 4 ] = 1;
    offset += count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  merged.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  return merged;
};

const createPart = (geometry: THREE.BufferGeometry, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, boneIndices: [number, number, number, number], boneWeights: [number, number, number, number]) => {
    const nonIndexed = geometry.toNonIndexed(); 
    nonIndexed.rotateX(rotation.x);
    nonIndexed.rotateY(rotation.y);
    nonIndexed.rotateZ(rotation.z);
    nonIndexed.scale(scale.x, scale.y, scale.z);
    nonIndexed.translate(position.x, position.y, position.z);
    const count = nonIndexed.attributes.position.count;
    const indices = [];
    const weights = [];
    for(let i=0; i<count; i++) {
        indices.push(...boneIndices);
        weights.push(...boneWeights);
    }
    nonIndexed.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    nonIndexed.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    applyPlanarUVs(nonIndexed);
    return nonIndexed;
};

export const convertImageToGLB = async (imageUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No Context");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
           const r = data[i], g = data[i+1], b = data[i+2];
           if (r > 240 && g > 240 && b > 240) data[i+3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        const HIPS_Y = 0.95, SPINE_Y = 1.15, CHEST_Y = 1.35, NECK_Y = 1.50, HEAD_Y = 1.65, SHOULDER_Y = 1.38, SHOULDER_X = 0.18;
        const bones: THREE.Bone[] = [];
        const hips = new THREE.Bone(); hips.name = BONES.ROOT; hips.position.set(0, HIPS_Y, 0); bones.push(hips);
        const spine = new THREE.Bone(); spine.name = BONES.SPINE; spine.position.set(0, SPINE_Y - HIPS_Y, 0); hips.add(spine); bones.push(spine);
        const chest = new THREE.Bone(); chest.name = BONES.CHEST; chest.position.set(0, CHEST_Y - SPINE_Y, 0); spine.add(chest); bones.push(chest);
        const neck = new THREE.Bone(); neck.name = BONES.NECK; neck.position.set(0, NECK_Y - CHEST_Y, 0); chest.add(neck); bones.push(neck);
        const head = new THREE.Bone(); head.name = BONES.HEAD; head.position.set(0, HEAD_Y - NECK_Y, 0); neck.add(head); bones.push(head);
        const createSide = (isLeft: boolean) => {
            const s = isLeft ? 1 : -1;
            const shoulder = new THREE.Bone(); shoulder.name = isLeft ? BONES.L_SHOULDER : BONES.R_SHOULDER; shoulder.position.set(s * SHOULDER_X, SHOULDER_Y - CHEST_Y, 0); chest.add(shoulder); bones.push(shoulder);
            const arm = new THREE.Bone(); arm.name = isLeft ? BONES.L_ARM : BONES.R_ARM; arm.position.set(s * 0.12, 0, 0); shoulder.add(arm); bones.push(arm);
            const foreArm = new THREE.Bone(); foreArm.name = isLeft ? BONES.L_FOREARM : BONES.R_FOREARM; foreArm.position.set(s * 0.28, 0, 0); arm.add(foreArm); bones.push(foreArm);
            const hand = new THREE.Bone(); hand.name = isLeft ? BONES.L_HAND : BONES.R_HAND; hand.position.set(s * 0.25, 0, 0); foreArm.add(hand); bones.push(hand);
            const upLeg = new THREE.Bone(); upLeg.name = isLeft ? BONES.L_UPLEG : BONES.R_UPLEG; upLeg.position.set(s * 0.1, 0, 0); hips.add(upLeg); bones.push(upLeg);
            const leg = new THREE.Bone(); leg.name = isLeft ? BONES.L_LEG : BONES.R_LEG; leg.position.set(0, -0.42, 0); upLeg.add(leg); bones.push(leg);
            const foot = new THREE.Bone(); foot.name = isLeft ? BONES.L_FOOT : BONES.R_FOOT; foot.position.set(0, -0.42, 0); leg.add(foot); bones.push(foot);
        };
        createSide(true); createSide(false);
        const skeleton = new THREE.Skeleton(bones);
        const bIdx = (name: string) => bones.findIndex(b => b.name === name);
        const geometries: THREE.BufferGeometry[] = [];
        geometries.push(createPart(new THREE.SphereGeometry(0.1, 16, 16), new THREE.Vector3(0, HEAD_Y + 0.05, -0.02), new THREE.Euler(0,0,0), new THREE.Vector3(0.92, 1.1, 1.0), [bIdx(BONES.HEAD), 0, 0, 0], [1, 0, 0, 0]));
        geometries.push(createPart(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12), new THREE.Vector3(0, HEAD_Y + 0.01, 0.02), new THREE.Euler(0,0,0), new THREE.Vector3(1, 1, 0.8), [bIdx(BONES.HEAD), 0, 0, 0], [1, 0, 0, 0]));
        geometries.push(createPart(new THREE.BoxGeometry(0.03, 0.06, 0.04), new THREE.Vector3(0, HEAD_Y + 0.02, 0.11), new THREE.Euler(-0.1, 0, 0), new THREE.Vector3(1,1,1), [bIdx(BONES.HEAD), 0, 0, 0], [1, 0, 0, 0]));
        geometries.push(createPart(new THREE.CylinderGeometry(0.065, 0.075, 0.15, 12), new THREE.Vector3(0, 1.55, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(BONES.NECK), 0, 0, 0], [1, 0, 0, 0]));
        geometries.push(createPart(new THREE.CylinderGeometry(0.18, 0.14, 0.45, 12), new THREE.Vector3(0, 1.40, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,0.7), [bIdx(BONES.CHEST), bIdx(BONES.SPINE), 0, 0], [0.7, 0.3, 0, 0]));
        geometries.push(createPart(new THREE.CylinderGeometry(0.13, 0.14, 0.25, 12), new THREE.Vector3(0, 1.05, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,0.75), [bIdx(BONES.ROOT), 0, 0, 0], [1, 0, 0, 0]));
        const addLimb = (isLeft: boolean) => {
            const s = isLeft ? 1 : -1; const armY = SHOULDER_Y; const legX = s * 0.1;
            geometries.push(createPart(new THREE.SphereGeometry(0.07, 12, 8), new THREE.Vector3(s * SHOULDER_X, armY, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_SHOULDER : BONES.R_SHOULDER), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 12), new THREE.Vector3(s * (SHOULDER_X + 0.14), armY, 0), new THREE.Euler(0,0, s * -Math.PI/2), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_ARM : BONES.R_ARM), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.SphereGeometry(0.05, 12, 8), new THREE.Vector3(s * (SHOULDER_X + 0.28), armY, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_ARM : BONES.R_ARM), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.CylinderGeometry(0.05, 0.04, 0.25, 12), new THREE.Vector3(s * (SHOULDER_X + 0.28 + 0.125), armY, 0), new THREE.Euler(0,0, s * -Math.PI/2), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_FOREARM : BONES.R_FOREARM), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.BoxGeometry(0.08, 0.1, 0.04), new THREE.Vector3(s * (SHOULDER_X + 0.28 + 0.25 + 0.04), armY, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_HAND : BONES.R_HAND), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.SphereGeometry(0.08, 12, 8), new THREE.Vector3(legX, HIPS_Y, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_UPLEG : BONES.R_UPLEG), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.CylinderGeometry(0.08, 0.06, 0.42, 12), new THREE.Vector3(legX, HIPS_Y - 0.21, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_UPLEG : BONES.R_UPLEG), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.SphereGeometry(0.06, 12, 8), new THREE.Vector3(legX, HIPS_Y - 0.42, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_UPLEG : BONES.R_UPLEG), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 12), new THREE.Vector3(legX, HIPS_Y - 0.42 - 0.21, 0), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_LEG : BONES.R_LEG), 0, 0, 0], [1, 0, 0, 0]));
            geometries.push(createPart(new THREE.BoxGeometry(0.08, 0.06, 0.18), new THREE.Vector3(legX, 0.03, 0.05), new THREE.Euler(0,0,0), new THREE.Vector3(1,1,1), [bIdx(isLeft ? BONES.L_FOOT : BONES.R_FOOT), 0, 0, 0], [1, 0, 0, 0]));
        };
        addLimb(true); addLimb(false);
        const finalGeometry = mergeGeometries(geometries);
        const material = new THREE.MeshStandardMaterial({ map: texture, skinning: true, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
        const mesh = new THREE.SkinnedMesh(finalGeometry, material);
        mesh.bind(skeleton);
        mesh.name = "Humanoid_Mesh";
        mesh.castShadow = true; mesh.receiveShadow = true;
        const group = new THREE.Group();
        group.add(hips); group.add(mesh);
        const exporter = new GLTFExporter();
        exporter.parse(group, (gltf) => { const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' }); resolve(blob); }, (err) => reject(err), { binary: true });
      } catch (e) { reject(e); }
    };
    img.onerror = (e) => reject(e);
    img.src = imageUrl;
  });
};
