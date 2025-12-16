import { AnimationType, AnimationConfig, ModelArchetype } from './types.ts';

export const DEFAULT_ANIMATION: AnimationConfig = {
  type: AnimationType.STATIC,
  speed: 1,
  intensity: 1,
  axis: 'y'
};

export interface SampleModel {
  name: string;
  url: string;
  archetype: ModelArchetype;
  rotation?: [number, number, number];
  forceTPose?: boolean;
  description: string;
}

export const SAMPLE_MODELS: SampleModel[] = [
  {
    name: "Soldier",
    url: "https://raw.githubusercontent.com/Mugen87/dive/master/app/models/soldier.glb",
    archetype: ModelArchetype.HUMANOID,
    description: "Standard humanoid soldier. Best for characters, robots, and aliens."
  },
  {
    name: "Realistic Male",
    url: "https://raw.githubusercontent.com/beekorn/GLB-Soldier/main/realistic_male_character.glb",
    archetype: ModelArchetype.HUMANOID,
    rotation: [0, -Math.PI / 2, 0],
    description: "High-fidelity male human base."
  },
  {
    name: "Soldier (T-Pose)",
    url: "https://raw.githubusercontent.com/beekorn/GLB-Soldier/main/S1.glb",
    archetype: ModelArchetype.HUMANOID,
    forceTPose: true,
    description: "Simplified humanoid in T-Pose."
  },
  {
    name: "Ferrari",
    url: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/ferrari.glb",
    archetype: ModelArchetype.VEHICLE,
    description: "Sports car base. Best for vehicles and mechanical props."
  },
  {
    name: "Duck",
    url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
    archetype: ModelArchetype.ANIMAL,
    description: "Simple bird shape. Good for animals or mascots."
  },
  {
    name: "Damaged Helmet",
    url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    archetype: ModelArchetype.PROP,
    description: "Round sci-fi helmet. Good for heads, spheres, or props."
  },
  {
    name: "Avocado",
    url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
    archetype: ModelArchetype.PROP,
    description: "Organic fruit shape."
  }
];

export const ANIMATION_PRESETS: Record<string, AnimationConfig> = {
  "Slow Spin": { type: AnimationType.SPIN, speed: 0.5, intensity: 1, axis: 'y' },
  "Fast Pulse": { type: AnimationType.PULSE, speed: 3, intensity: 0.2, axis: 'x' },
  "Ghost Float": { type: AnimationType.FLOAT, speed: 1.5, intensity: 0.5, axis: 'y' },
};
