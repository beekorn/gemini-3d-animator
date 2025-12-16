import React, { useRef, useState } from 'react';
import { Upload, Box, Wand2, Loader2, Download, Plus, Play, Pause, Trash2, Bone, Image as ImageIcon, Sparkles, RotateCw, Eye, EyeOff, ExternalLink, X } from 'lucide-react';
import { SAMPLE_MODELS } from '../constants.ts';
import { AnimationConfig, AnimationType, AnimationAsset, GenerationState } from '../types.ts';

interface ControlPanelProps {
  activeTab: 'create' | 'animate';
  onTabChange: (tab: 'create' | 'animate') => void;
  onFileUpload: (file: File) => void;
  onSelectSample: (model: any) => void;
  onDownloadSource: () => void;
  onExport: () => void;
  modelName: string | null;
  generationState: GenerationState;
  onGenerateNew: (prompt: string) => void;
  onUploadImageTo3D: (file: File) => void;
  onTextTo3D: (prompt: string, styleImage?: File) => void;
  onReskin: (prompt: string, referenceFile?: File) => void;
  animations: AnimationAsset[];
  activeAnimId: string | null;
  onAnimUpload: (file: File) => void;
  onDeleteAnim: (id: string) => void;
  onSelectAnim: (id: string | null) => void;
  currentConfig: AnimationConfig;
  onConfigChange: (config: AnimationConfig) => void;
  onGenerateConfig: (prompt: string) => Promise<void>;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  showTexture: boolean;
  onToggleTexture: () => void;
  modelRotationY: number;
  onRotationChange: (radians: number) => void;
  error: string | null;
  apiKey: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  activeTab, onTabChange, onFileUpload, onSelectSample, onDownloadSource, onExport, modelName,
  generationState, onGenerateNew, onUploadImageTo3D, onTextTo3D, animations, activeAnimId,
  onAnimUpload, onDeleteAnim, onSelectAnim, currentConfig, onConfigChange, onGenerateConfig,
  showSkeleton, onToggleSkeleton, showTexture, onToggleTexture, modelRotationY, onRotationChange, error, apiKey
}) => {
  const [prompt, setPrompt] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [styleFile, setStyleFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
          onFileUpload(file);
      } else {
          alert("Please upload a .glb or .gltf file.");
      }
    }
  };
  
  const handleStyleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) setStyleFile(e.target.files[0]);
  };

  const handleAnimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onAnimUpload(e.target.files[0]);
  };
  
  const handleTextTo3D = () => {
    if(!genPrompt.trim()) return;
    onTextTo3D(genPrompt, styleFile || undefined);
  };

  return (
    <div className="w-full h-full bg-black/20 backdrop-blur-sm flex flex-col overflow-hidden text-slate-200">
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => onTabChange('create')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors relative ${
            activeTab === 'create' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" />
            Gen AI
          </div>
          {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
        </button>
        <button
          onClick={() => onTabChange('animate')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors relative ${
            activeTab === 'animate' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className="w-4 h-4 text-indigo-500" />
            Animate
          </div>
          {activeTab === 'animate' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <div className="space-y-6">
             <div className="space-y-3">
                <div className="flex items-center gap-2 text-white">
                    <Box className="w-4 h-4 text-pink-400" />
                    <h3 className="text-xs font-bold uppercase">Generate New Model</h3>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3 relative overflow-hidden">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe a character (e.g. A cute robot)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none h-20"
                    />
                    <button 
                        onClick={() => onGenerateNew(prompt)}
                        disabled={generationState.isGenerating || !prompt.trim()}
                        className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20"
                    >
                        {generationState.isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                        Generate Character
                    </button>
                </div>
             </div>
             
             <div className="border-t border-slate-700/50 pt-2"></div>

             <div className="space-y-3">
               <div className="flex items-center gap-2 text-white">
                  <Box className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase">Retexture Model</h3>
               </div>
               
               <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 space-y-3">
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="e.g. Make it look like a rusty statue..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16"
                  />
                  <div className="flex gap-2">
                     <button
                       onClick={() => styleInputRef.current?.click()}
                       className="flex-1 py-2 border border-dashed border-slate-600 hover:border-purple-400 rounded-lg text-xs text-slate-400 hover:text-purple-300 flex items-center justify-center gap-2 transition-colors"
                     >
                       <ImageIcon className="w-3 h-3" />
                       {styleFile ? "Change Style Ref" : "Add Style Image"}
                     </button>
                     <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={handleStyleFileChange} />
                     {styleFile && (
                        <button onClick={() => setStyleFile(null)} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700">
                           <X className="w-4 h-4" />
                        </button>
                     )}
                  </div>
                  <button
                    onClick={handleTextTo3D}
                    disabled={generationState.isGenerating || !genPrompt.trim()}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                  >
                    {generationState.step === 'texturing' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                    Generate Texture
                  </button>
               </div>
             </div>

             <div className="space-y-2">
                 <div className="flex gap-2">
                     <button onClick={onToggleTexture} className={`flex-1 py-2 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-2 ${!showTexture ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {showTexture ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {showTexture ? 'Hide Texture' : 'Untextured'}
                     </button>
                     <button onClick={onToggleSkeleton} className={`flex-1 py-2 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-2 ${showSkeleton ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Bone className="w-3 h-3" />
                        Skeleton
                     </button>
                 </div>
                 <div className="bg-slate-800/50 p-2 rounded flex items-center gap-2 border border-slate-700">
                      <RotateCw className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-400 font-medium w-12">Rotate Y</span>
                      <input 
                        type="range" min={-180} max={180} step={5}
                        value={Math.round(modelRotationY * (180/Math.PI))} 
                        onChange={(e) => onRotationChange(parseInt(e.target.value) * (Math.PI/180))}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                 </div>
             </div>

             <div className="space-y-3 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-white">
                  <Box className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold uppercase">Model Library</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {SAMPLE_MODELS.slice(0, 6).map(model => (
                      <button 
                        key={model.name}
                        onClick={() => onSelectSample(model)}
                        className={`p-2 rounded text-left border transition-colors ${
                            modelName === model.name ? 'bg-slate-700 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                         <div className="text-[10px] font-bold text-slate-200">{model.name}</div>
                         <div className="text-[9px] text-slate-500 capitalize opacity-70">{model.archetype}</div>
                      </button>
                   ))}
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="p-2 rounded border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[50px]"
                   >
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span className="text-[9px] text-slate-500">Upload GLB</span>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="text-xs font-bold uppercase text-white">Animations</h3>
                   <button 
                     onClick={() => animInputRef.current?.click()}
                     className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 flex items-center gap-1"
                   >
                     <Plus className="w-3 h-3" /> Import Anim
                   </button>
                   <input type="file" ref={animInputRef} className="hidden" accept=".fbx,.glb,.gltf" onChange={handleAnimChange} />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                   {animations.map(anim => (
                      <div 
                        key={anim.id}
                        onClick={() => onSelectAnim(activeAnimId === anim.id ? null : anim.id)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                           activeAnimId === anim.id ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                         <div className="flex items-center gap-2">
                            {activeAnimId === anim.id ? <Pause className="w-3 h-3 text-indigo-400" /> : <Play className="w-3 h-3 text-slate-500" />}
                            <span className="text-xs text-slate-300 truncate w-32">{anim.name}</span>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); onDeleteAnim(anim.id); }} className="text-slate-600 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                   {animations.length === 0 && (
                      <div className="text-center py-4 text-slate-600 text-xs italic">No clips loaded</div>
                   )}
                </div>
             </div>

             <div className="space-y-3 pt-4 border-t border-slate-700/50">
                <h3 className="text-xs font-bold uppercase text-white">Procedural Motion</h3>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                   <textarea
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder="Describe motion (e.g. 'Hover gently like a ghost')..."
                     className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 mb-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                   />
                   <button
                     onClick={() => onGenerateConfig(prompt)}
                     disabled={generationState.isGenerating || !prompt.trim()}
                     className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-2"
                   >
                     <Wand2 className="w-3 h-3" /> Generate Config
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {Object.values(AnimationType).map(type => (
                      <button
                        key={type}
                        onClick={() => onConfigChange({...currentConfig, type})}
                        className={`py-1 px-2 rounded text-[10px] uppercase font-bold border transition-colors ${
                           currentConfig.type === type ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                         {type}
                      </button>
                   ))}
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-slate-500 w-8">Speed</span>
                   <input 
                     type="range" min="0.1" max="5" step="0.1" 
                     value={currentConfig.speed}
                     onChange={(e) => onConfigChange({...currentConfig, speed: parseFloat(e.target.value)})}
                     className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                   />
                </div>
             </div>
             
             <div className="pt-4 border-t border-slate-700/50 flex gap-2">
                <button onClick={onDownloadSource} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-medium">
                   Download Source
                </button>
                <button onClick={onExport} className="flex-1 py-2 bg-slate-200 hover:bg-white text-slate-900 rounded text-xs font-bold shadow-lg shadow-white/10">
                   Export GLB
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;