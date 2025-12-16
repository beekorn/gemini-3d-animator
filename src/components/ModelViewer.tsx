import React, { useRef, useMemo, useEffect, useState, useImperativeHandle, forwardRef, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Grid } from '@react-three/drei';
import { Maximize, Minimize } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import { TextureLoader } from 'three';
import { AnimationConfig, AnimationType, AnimationAsset, ModelModifiers } from '../types.ts';

// --- Robust Retargeting Logic ---

const BONE_REGEX_MAP: Record<string, RegExp[]> = {
  'Hips': [/hips/i, /pelvis/i, /root/i, /bip001.?pelvis/i],
  'Spine': [/spine/i, /spine.?01/i, /bip001.?spine/i],
  'Spine1': [/spine.?1/i, /spine.?02/i, /chest/i, /bip001.?spine1/i],
  'Spine2': [/spine.?2/i, /spine.?03/i, /upper.?chest/i, /bip001.?spine2/i],
  'Neck': [/neck/i, /head.?01/i, /bip001.?neck/i],
  'Head': [/head/i, /head.?02/i, /bip001.?head/i],
  'LeftShoulder': [/left.*shoulder/i, /l.*shoulder/i, /shoulder.*l/i, /clavicle.*l/i],
  'LeftArm': [/left.*arm/i, /l.*arm/i, /arm.*l/i, /upper.*arm.*l/i],
  'LeftForeArm': [/left.*fore.*arm/i, /l.*fore.*arm/i, /fore.*arm.*l/i],
  'LeftHand': [/left.*hand/i, /l.*hand/i, /hand.*l/i, /wrist.*l/i],
  'RightShoulder': [/right.*shoulder/i, /r.*shoulder/i, /shoulder.*r/i, /clavicle.*r/i],
  'RightArm': [/right.*arm/i, /r.*arm/i, /arm.*r/i, /upper.*arm.*r/i],
  'RightForeArm': [/right.*fore.*arm/i, /r.*fore.*arm/i, /fore.*arm.*r/i],
  'RightHand': [/right.*hand/i, /r.*hand/i, /hand.*r/i, /wrist.*r/i],
  'LeftUpLeg': [/left.*up.*leg/i, /l.*up.*leg/i, /up.*leg.*l/i, /left.*thigh/i],
  'LeftLeg': [/left.*leg/i, /l.*leg/i, /leg.*l/i, /left.*shin/i],
  'LeftFoot': [/left.*foot/i, /l.*foot/i, /foot.*l/i, /left.*ankle/i],
  'RightUpLeg': [/right.*up.*leg/i, /r.*up.*leg/i, /up.*leg.*r/i, /right.*thigh/i],
  'RightLeg': [/right.*leg/i, /r.*leg/i, /leg.*r/i, /right.*shin/i],
  'RightFoot': [/right.*foot/i, /r.*foot/i, /foot.*r/i, /right.*ankle/i],
};

const identifyBoneRole = (boneName: string): string | null => {
  if (!boneName) return null;
  for (const [role, patterns] of Object.entries(BONE_REGEX_MAP)) {
    for (const pattern of patterns) {
      if (pattern.test(boneName)) return role;
    }
  }
  return null;
};

const retargetClip = (originalClip: THREE.AnimationClip, modelBoneNames: Set<string>, modelHeight: number = 1.0, hipsBindQuat?: THREE.Quaternion) => {
  if (!originalClip || !originalClip.tracks) return originalClip;
  const roleToModelBone = new Map<string, string>();
  modelBoneNames.forEach((boneName) => {
    const role = identifyBoneRole(boneName);
    if (role && !roleToModelBone.has(role)) roleToModelBone.set(role, boneName);
  });
  const exactNameMap = new Map<string, string>();
  modelBoneNames.forEach(name => exactNameMap.set(name.toLowerCase(), name));
  const newTracks: THREE.KeyframeTrack[] = [];
  let matchedCount = 0;
  originalClip.tracks.forEach((track) => {
    if (!track) return;
    const trackName = track.name;
    const periodIndex = trackName.lastIndexOf('.');
    if (periodIndex === -1) return;
    const trackNodeName = trackName.substring(0, periodIndex);
    const property = trackName.substring(periodIndex + 1);
    if (property === 'scale') return;
    let targetBoneName: string | undefined;
    const cleanTrackName = trackNodeName.replace(/mixamorig\d*:/i, '');
    const trackRole = identifyBoneRole(cleanTrackName);
    if (trackRole && roleToModelBone.has(trackRole)) {
      targetBoneName = roleToModelBone.get(trackRole);
    } else {
      targetBoneName = exactNameMap.get(cleanTrackName.toLowerCase());
    }
    if (targetBoneName) {
      const isHips = trackRole === 'Hips' || /hips|root|pelvis/i.test(targetBoneName);
      if (property === 'position' && !isHips) return;
      let finalTrack = track.clone();
      finalTrack.name = `${targetBoneName}.${property}`;
      if (isHips && property === 'quaternion' && hipsBindQuat && finalTrack instanceof THREE.QuaternionKeyframeTrack) {
        const values = finalTrack.values;
        const numFrames = values.length / 4;
        const startQuat = new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
        const invStartQuat = startQuat.clone().invert();
        const currentQuat = new THREE.Quaternion();
        const deltaQuat = new THREE.Quaternion();
        const resultQuat = new THREE.Quaternion();
        for (let i = 0; i < numFrames; i++) {
          const idx = i * 4;
          currentQuat.set(values[idx], values[idx+1], values[idx+2], values[idx+3]);
          deltaQuat.copy(invStartQuat).multiply(currentQuat);
          resultQuat.copy(hipsBindQuat).multiply(deltaQuat);
          values[idx] = resultQuat.x; values[idx+1] = resultQuat.y; values[idx+2] = resultQuat.z; values[idx+3] = resultQuat.w;
        }
      }
      if (property === 'position' && isHips && finalTrack instanceof THREE.VectorKeyframeTrack) {
        const values = finalTrack.values;
        for (let i = 0; i < values.length; i += 3) {
          values[i] = 0; 
          let yVal = values[i+1];
          if (Math.abs(yVal) > 50 && modelHeight < 10) yVal *= 0.01;
          values[i+1] = yVal;
          values[i + 2] = 0; 
        }
      }
      newTracks.push(finalTrack);
      matchedCount++;
    }
  });
  if (matchedCount === 0) return originalClip.clone();
  return new THREE.AnimationClip(originalClip.name, originalClip.duration, newTracks);
};

const AnimationProcessor = ({ animations, id, name, modelBoneNames, modelHeight, scene, onLoad, onUnload }: any) => {
  useEffect(() => {
    if (!animations || !animations.length) return;
    let hipsBone: THREE.Bone | null = null;
    scene.traverse((obj: any) => {
       if (identifyBoneRole(obj.name) === 'Hips') hipsBone = obj as THREE.Bone;
    });
    const hipsBindQuat = hipsBone ? (hipsBone as THREE.Bone).quaternion.clone() : undefined;
    const clip = retargetClip(animations[0], modelBoneNames, modelHeight, hipsBindQuat);
    const safeName = name ? name.replace(/\.[^/.]+$/, "") : `Anim_${id}`;
    if (clip) clip.name = safeName;
    if (clip) onLoad(id, clip);
    return () => { onUnload(id); };
  }, [animations, id, name, modelBoneNames, modelHeight, onLoad, onUnload, scene]);
  return null;
};

const FBXAnimLoader = (props: any) => {
  const fbx = useLoader(FBXLoader, props.url);
  return <AnimationProcessor animations={fbx.animations} {...props} />;
};

const GLTFAnimLoader = (props: any) => {
  const gltf = useLoader(GLTFLoader, props.url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);
  });
  return <AnimationProcessor animations={gltf.animations} {...props} />;
};

const CameraFitter = ({ scene, isFullscreen }: { scene: THREE.Object3D, isFullscreen: boolean }) => {
  const { camera, controls } = useThree();
  const fittedRef = useRef(false);
  const lastSceneRef = useRef<THREE.Object3D | null>(null);
  const lastFullscreenRef = useRef(isFullscreen);
  useEffect(() => {
    if (scene !== lastSceneRef.current || isFullscreen !== lastFullscreenRef.current) {
        fittedRef.current = false;
        lastSceneRef.current = scene;
        lastFullscreenRef.current = isFullscreen;
    }
    if (fittedRef.current || !scene) return;
    const timeoutId = setTimeout(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        if (size.lengthSq() === 0) return;
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const aspect = (camera as THREE.PerspectiveCamera).aspect || 1;
        const paddingMultiplier = isFullscreen ? 3.2 : 1.6;
        const fitHeight = size.y * paddingMultiplier;
        const distV = Math.abs(fitHeight / 2 / Math.tan(fov / 2));
        const fitWidth = size.x * paddingMultiplier;
        const distH = Math.abs(fitWidth / 2 / (Math.tan(fov / 2) * aspect));
        const distance = Math.max(distV, distH);
        const finalDist = Math.max(distance, size.y);
        const newPos = new THREE.Vector3(0, size.y / 2, finalDist);
        camera.position.copy(newPos);
        camera.lookAt(center);
        if (controls) {
            (controls as any).target.copy(center);
            (controls as any).update();
        }
        fittedRef.current = true;
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [scene, isFullscreen, camera, controls]);
  return null;
};

const XRaySkeleton = ({ target }: { target: THREE.Object3D }) => {
  const helper = useMemo(() => {
    const h = new THREE.SkeletonHelper(target);
    const mat = h.material as THREE.LineBasicMaterial;
    mat.color.set('cyan');
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.toneMapped = false;
    mat.linewidth = 2;
    return h;
  }, [target]);
  return <primitive object={helper} />;
};

const ScreenshotHandler = ({ expose }: { expose: (fn: () => string) => void }) => {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    expose(() => {
       gl.render(scene, camera);
       return gl.domElement.toDataURL('image/png', 0.8);
    });
  }, [expose, gl, scene, camera]);
  return null;
};

const Model = ({ url, fileName, rotation, animations, activeAnimId, config, setExportFunc, showSkeleton, isFullscreen, setScreenshotFunc, setUpdateTextureFunc, onTextureLoaded, forceTPose, modifiers, showTexture }: any) => {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);
  });
  const proceduralGroupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [modelHeight, setModelHeight] = useState(1);
  const [clips, setClips] = useState<Record<string, THREE.AnimationClip>>({});

  const scene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    const s = SkeletonUtils.clone(gltf.scene);
    s.name = "CharacterRoot";
    s.position.set(0,0,0);
    if (rotation) s.rotation.set(rotation[0], rotation[1], rotation[2]);
    else s.rotation.set(0,0,0);
    s.scale.set(1,1,1);
    s.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    s.position.set(-center.x, -box.min.y, -center.z);
    setModelHeight(size.y);
    s.traverse((o: any) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    return s;
  }, [gltf, rotation]);

  useEffect(() => {
    if (scene && forceTPose) {
       scene.traverse((obj: any) => {
          if (obj.isBone) {
             const role = identifyBoneRole(obj.name);
             if (role === 'LeftArm') obj.rotation.z += 0.87; 
             if (role === 'RightArm') obj.rotation.z -= 0.87;
          }
       });
       scene.updateMatrixWorld(true);
    }
  }, [scene, forceTPose]);
  
  useEffect(() => {
     if (!scene) return;
     scene.scale.set(1,1,1);
     scene.traverse((obj: any) => { if (obj.isBone) obj.scale.set(1,1,1); });
     if (modifiers) {
        scene.scale.set(modifiers.width, modifiers.height, modifiers.width);
        scene.traverse((obj: any) => {
           if (obj.isBone) {
              const role = identifyBoneRole(obj.name);
              if (role === 'Head') obj.scale.setScalar(modifiers.headSize);
              else if (role?.includes('Arm') || role?.includes('ForeArm')) obj.scale.set(modifiers.armThickness, 1, modifiers.armThickness);
              else if (role?.includes('Leg') || role?.includes('UpLeg')) obj.scale.set(modifiers.legThickness, 1, modifiers.legThickness);
              else if (role === 'Spine' || role === 'Spine1' || role === 'Spine2') obj.scale.set(modifiers.chestSize, 1, modifiers.chestSize);
           }
        });
     }
     scene.updateMatrixWorld(true);
  }, [scene, modifiers]);

  useEffect(() => {
    if (scene && onTextureLoaded) {
      let bestMap: { image: HTMLImageElement, area: number } | null = null;
      scene.traverse((o: any) => {
        if (o.isMesh) {
          const mat = o.material;
          if (mat && mat.map && mat.map.image) {
             const img = mat.map.image;
             if (img.width && img.height) {
                 const area = img.width * img.height;
                 if (!bestMap || area > bestMap.area) bestMap = { image: img, area };
             }
          }
        }
      });
      if (bestMap) {
         try {
             const canvas = document.createElement('canvas');
             const image = bestMap.image;
             const MAX_SIZE = 1024;
             let width = image.width || 1024;
             let height = image.height || 1024;
             if (width > MAX_SIZE || height > MAX_SIZE) {
                const ratio = width / height;
                if (width > height) { width = MAX_SIZE; height = Math.round(MAX_SIZE / ratio); }
                else { height = MAX_SIZE; width = Math.round(MAX_SIZE * ratio); }
             }
             canvas.width = width; canvas.height = height;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                ctx.drawImage(image, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/png', 0.9);
                onTextureLoaded(dataUrl);
             }
         } catch(e) { console.warn("Failed to extract texture", e); }
      }
    }
  }, [scene, onTextureLoaded]);

  useEffect(() => {
    if (scene) {
        scene.traverse((obj: any) => {
            if (obj.isMesh) {
                const mat = obj.material;
                if (mat.map && !obj.userData.originalMap) obj.userData.originalMap = mat.map;
                if (showTexture) {
                    if (obj.userData.originalMap) {
                        mat.map = obj.userData.originalMap;
                        mat.color.set(0xffffff);
                    }
                } else {
                    mat.map = null;
                    mat.color.set(0xdddddd);
                }
                mat.needsUpdate = true;
            }
        });
    }
  }, [scene, showTexture]);

  const modelBoneNames = useMemo(() => {
    const names = new Set<string>();
    if (!scene) return names;
    scene.traverse((obj: any) => {
      if (obj.isBone || obj.type === 'Bone' || (obj.name && obj.children.length > 0)) names.add(obj.name);
    });
    return names;
  }, [scene]);

  useEffect(() => {
    if(setUpdateTextureFunc && scene) {
      setUpdateTextureFunc((textureUrl: string) => {
         const tex = new TextureLoader().load(textureUrl);
         tex.flipY = false;
         tex.colorSpace = THREE.SRGBColorSpace;
         scene.traverse((o: any) => {
           if (o.isMesh) {
             const mat = o.material;
             mat.map = tex;
             o.userData.originalMap = tex;
             mat.needsUpdate = true;
             if (mat.color) mat.color.set(0xffffff);
           }
         });
      });
    }
  }, [setUpdateTextureFunc, scene]);

  const handleClipLoaded = useCallback((id: string, clip: THREE.AnimationClip) => {
    setClips(prev => ({ ...prev, [id]: clip }));
  }, []);

  const handleClipUnloaded = useCallback((id: string) => {
    setClips(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  useEffect(() => {
    if (!scene) return;
    mixerRef.current = new THREE.AnimationMixer(scene);
    return () => { mixerRef.current?.stopAllAction(); mixerRef.current = null; };
  }, [scene]); 

  useEffect(() => {
    if (!mixerRef.current) return;
    mixerRef.current.stopAllAction();
    if (activeAnimId && clips[activeAnimId]) {
      const clip = clips[activeAnimId];
      const action = mixerRef.current.clipAction(clip);
      action.fadeIn(0.5); action.reset(); action.play();
    }
  }, [activeAnimId, clips]);

  useEffect(() => {
    setExportFunc(() => {
      if (!scene) return;
      const exporter = new GLTFExporter();
      const animationsToExport = Object.values(clips);
      const options = { binary: true, animations: animationsToExport, truncateDrawRange: false };
      if (proceduralGroupRef.current) {
        proceduralGroupRef.current.position.set(0, 0, 0);
        proceduralGroupRef.current.rotation.set(0, 0, 0);
        proceduralGroupRef.current.scale.set(1, 1, 1);
        proceduralGroupRef.current.updateMatrixWorld(true);
      }
      exporter.parse(scene, (result) => {
          const output = result as ArrayBuffer;
          const blob = new Blob([output], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = 'rigged-character.glb'; link.click();
          URL.revokeObjectURL(url);
        }, (error) => { console.error('Export error:', error); alert('Export failed.'); }, options
      );
    });
  }, [setExportFunc, clips, scene]);

  useFrame((state, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
    if (!proceduralGroupRef.current) return;
    if (activeAnimId) {
        proceduralGroupRef.current.position.set(0, 0, 0);
        proceduralGroupRef.current.rotation.set(0, 0, 0);
        proceduralGroupRef.current.scale.set(1, 1, 1);
        return; 
    }
    timeRef.current += delta * config.speed;
    const t = timeRef.current;
    const i = config.intensity;
    let posX = 0, posY = 0, posZ = 0, rotX = 0, rotY = 0, rotZ = 0, scaleX = 1, scaleY = 1, scaleZ = 1;
    switch (config.type) {
      case AnimationType.SPIN: if (config.axis === 'x') rotX = t; else if (config.axis === 'z') rotZ = t; else rotY = t; break;
      case AnimationType.FLOAT: const floatY = Math.sin(t) * 0.5 * i; if (config.axis === 'x') posX = floatY; else if (config.axis === 'z') posZ = floatY; else posY += floatY; break;
      case AnimationType.PULSE: const scale = 1 + Math.sin(t * 2) * 0.2 * i; scaleX = scale; scaleY = scale; scaleZ = scale; break;
      case AnimationType.WOBBLE: const rot = Math.sin(t) * 0.5 * i; if (config.axis === 'x') rotX = rot; else if (config.axis === 'z') rotZ = rot; else rotZ = rot; break;
      case AnimationType.SHAKE: posX += (Math.random() - 0.5) * 0.1 * i; posY += (Math.random() - 0.5) * 0.1 * i; posZ += (Math.random() - 0.5) * 0.1 * i; break;
      case AnimationType.ORBIT: const radius = 2 * i; posX = Math.cos(t) * radius; posZ = Math.sin(t) * radius; rotY = -t; break;
    }
    proceduralGroupRef.current.position.set(posX, posY, posZ);
    proceduralGroupRef.current.rotation.set(rotX, rotY, rotZ);
    proceduralGroupRef.current.scale.set(scaleX, scaleY, scaleZ);
  });

  return (
    <group>
       {scene && <CameraFitter scene={scene} isFullscreen={isFullscreen} />}
       {setScreenshotFunc && <ScreenshotHandler expose={setScreenshotFunc} />}
       <group ref={proceduralGroupRef}>
          {scene && <primitive object={scene} />}
       </group>
       {scene && animations.map(anim => {
          const isGLB = anim.name.toLowerCase().endsWith('.glb') || anim.name.toLowerCase().endsWith('.gltf');
          const Loader = isGLB ? GLTFAnimLoader : FBXAnimLoader;
          return (
             <Suspense key={anim.id} fallback={null}>
               <Loader id={anim.id} url={anim.url} name={anim.name} modelBoneNames={modelBoneNames} modelHeight={modelHeight} scene={scene} onLoad={handleClipLoaded} onUnload={handleClipUnloaded} />
             </Suspense>
          );
       })}
       {showSkeleton && scene && <XRaySkeleton target={scene} />}
    </group>
  );
};

export interface ModelViewerRef {
  exportGLB: () => void;
  getScreenshot: () => string;
  updateTexture: (url: string) => void;
}

const ModelViewer = forwardRef<ModelViewerRef, any>(({ fileUrl, fileName, rotation, animations, activeAnimId, config, showSkeleton, onTextureLoaded, forceTPose, modifiers, showTexture = true }, ref) => {
  const exportFuncRef = useRef<(() => void) | null>(null);
  const screenshotFuncRef = useRef<(() => string) | null>(null);
  const updateTextureFuncRef = useRef<((url: string) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useImperativeHandle(ref, () => ({
    exportGLB: () => { if (exportFuncRef.current) exportFuncRef.current(); },
    getScreenshot: () => { return screenshotFuncRef.current ? screenshotFuncRef.current() : ""; },
    updateTexture: (url: string) => { if (updateTextureFuncRef.current) updateTextureFuncRef.current(url); }
  }));

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) await containerRef.current.requestFullscreen();
      else await document.exitFullscreen();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-transparent rounded-lg overflow-hidden shadow-2xl border border-slate-700/50 group">
      {!fileUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 z-10 pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-medium">No model loaded</p>
            <p className="text-sm">Upload a GLB, Image or select a sample</p>
          </div>
        </div>
      )}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />
        {fileUrl && (
          <React.Suspense fallback={null}>
            <Model 
                url={fileUrl} fileName={fileName} rotation={rotation} animations={animations} activeAnimId={activeAnimId} config={config} 
                setExportFunc={(fn: any) => exportFuncRef.current = fn} setScreenshotFunc={(fn: any) => screenshotFuncRef.current = fn} 
                setUpdateTextureFunc={(fn: any) => updateTextureFuncRef.current = fn} onTextureLoaded={onTextureLoaded} showSkeleton={showSkeleton} 
                isFullscreen={isFullscreen} forceTPose={forceTPose} modifiers={modifiers} showTexture={showTexture}
            />
          </React.Suspense>
        )}
        <Environment preset="city" />
        <OrbitControls makeDefault />
        <Grid position={[0, -0.01, 0]} args={[20, 20]} cellColor="#334155" sectionColor="#475569" fadeDistance={20} />
      </Canvas>
      <div className={`absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur text-xs text-slate-400 p-2 rounded border border-slate-800 pointer-events-none z-10 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
        {activeAnimId ? (
           <p className="text-emerald-400 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Playing External Animation</p>
        ) : (
          <><p>Type: <span className="text-cyan-400 uppercase">{config.type}</span></p><p>Speed: <span className="text-cyan-400">{config.speed.toFixed(1)}x</span></p></>
        )}
      </div>
      <button onClick={toggleFullscreen} className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2 rounded-lg border border-slate-700 transition-colors z-20 backdrop-blur">
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>
    </div>
  );
});

export default ModelViewer;