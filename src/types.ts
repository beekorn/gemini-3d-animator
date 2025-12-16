export enum AnimationType {
  STATIC = 'static',
  SPIN = 'spin',
  FLOAT = 'float',
  PULSE = 'pulse',
  WOBBLE = 'wobble',
  SHAKE = 'shake',
  ORBIT = 'orbit'
}

export type AnimationConfig = {
  type: AnimationType;
  speed: number;
  intensity: number;
  axis: 'x' | 'y' | 'z';
};

export interface AnimationResponse {
  animation: AnimationType;
  speed: number;
  intensity: number;
  axis: 'x' | 'y' | 'z';
  reasoning: string;
}

export interface ModelFile {
  name: string;
  url: string;
  size: number;
}

export interface AnimationAsset {
  id: string;
  name: string;
  url: string;
}

export interface ModelModifiers {
  height: number;
  width: number;
  headSize: number;
  armThickness: number;
  legThickness: number;
  chestSize: number;
}

export enum ModelArchetype {
  HUMANOID = 'humanoid',
  VEHICLE = 'vehicle',
  ANIMAL = 'animal',
  PROP = 'prop',
  ABSTRACT = 'abstract'
}

export interface GenerationState {
  isGenerating: boolean;
  step: 'idle' | 'analyzing' | 'texturing' | 'shaping' | 'complete';
  progress: number;
  error: string | null;
}
