import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Settings, HelpCircle, Palette } from 'lucide-react';
import ControlPanel from './components/ControlPanel.tsx';
import ModelViewer, { ModelViewerRef } from './components/ModelViewer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import ImagePreviewModal from './components/ImagePreviewModal.tsx';
import { generateAnimationConfig, generateTexture, generateCharacterImage } from './services/geminiService.ts';
import { convertImageToGLB } from './services/converterService.ts';
import { DEFAULT_ANIMATION, SAMPLE_MODELS, SampleModel } from './constants.ts';
import { AnimationConfig, AnimationAsset, ModelModifiers, GenerationState, ModelArchetype } from './types.ts';

// --- Modals ---

const ReadmeModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" /> User Manual
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto text-slate-300 space-y-4">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">1. Getting Started</h3>
            <p>Enter your <strong>Gemini API Key</strong> in the Settings menu (top-left). The app requires this to function.</p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">2. Creating Models</h3>
            <p>Go to the <strong>Gen AI</strong> tab. Describe a character (e.g., "A futuristic robot soldier") and click "Generate Character". The AI will create an image and automatically convert it into a 3D model.</p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">3. Animating</h3>
            <p>Switch to the <strong>Animate</strong> tab. You can use procedural animations (Spin, Float, Pulse) or describe a custom motion (e.g., "Shake violently like an earthquake") to generate a config.</p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">4. Texturing</h3>
            <p>If you have a model loaded, use the "Retexture" section to repaint it using AI. You can also upload a style reference image.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, theme, setTheme }: any) => {
  if (!isOpen) return null;
  const themes = [
    { name: 'Slate (Default)', value: 'slate', class: 'bg-slate-950' },
    { name: 'Midnight Blue', value: 'blue', class: 'bg-blue-950' },
    { name: 'Deep Purple', value: 'purple', class: 'bg-purple-950' },
    { name: 'Forest Emerald', value: 'emerald', class: 'bg-emerald-950' },
    { name: 'Burnt Orange', value: 'orange', class: 'bg-orange-950' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" /> Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder="AIzaSy..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-2">Key is stored locally in your browser.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">App Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(t => (
                <button 
                  key={t.value} 
                  onClick={() => setTheme(t.value)}
                  className={`p-2 rounded text-xs font-medium border transition-all ${theme === t.value ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700 hover:border-slate-500'} ${t.class} text-white`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

function App() {
  // Global Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [theme, setTheme] = useState('slate');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<'create' | 'animate'>('create');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [modelRotation, setModelRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [modelForceTPose, setModelForceTPose] = useState<boolean>(false);
  const [modelModifiers, setModelModifiers] = useState<ModelModifiers | null>(null);
  const [showTexture, setShowTexture] = useState(true);
  const [currentSourceImage, setCurrentSourceImage] = useState<string | null>(null);
  const [animations, setAnimations] = useState<AnimationAsset[]>([]);
  const [activeAnimId, setActiveAnimId] = useState<string | null>(null);
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(DEFAULT_ANIMATION);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
     isGenerating: false, step: 'idle', progress: 0, error: null
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const viewerRef = useRef<ModelViewerRef>(null);

  // Persist API Key
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Theme Classes
  const getThemeClass = () => {
    switch(theme) {
      case 'blue': return 'bg-blue-950';
      case 'purple': return 'bg-purple-950';
      case 'emerald': return 'bg-emerald-950';
      case 'orange': return 'bg-orange-950';
      default: return 'bg-slate-950';
    }
  };

  useEffect(() => {
    handleSelectSample(SAMPLE_MODELS[0]);
  }, []);

  const resetState = () => {
    setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: null });
    setActiveAnimId(null);
    setShowSkeleton(false);
  };

  const handleSelectSample = (model: SampleModel) => {
    setFileUrl(model.url);
    setModelName(model.name);
    setModelRotation(model.rotation ? [...model.rotation] : [0, 0, 0]);
    setModelForceTPose(!!model.forceTPose);
    setAnimationConfig(DEFAULT_ANIMATION);
    setModelModifiers(null);
    setCurrentSourceImage(null);
    setShowTexture(true);
    resetState();
  };

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setModelName(file.name);
    setModelRotation([0, 0, 0]);
    setModelForceTPose(false);
    setModelModifiers(null);
    setCurrentSourceImage(null);
    setShowTexture(true);
    resetState();
  };

  const handleTextureLoaded = (url: string) => {
    setCurrentSourceImage(url);
  };

  const toGrayscale = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if(ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
          const data = imageData.data;
          for(let i=0; i<data.length; i+=4) {
             const avg = (data[i] + data[i+1] + data[i+2]) / 3;
             data[i] = avg; 
             data[i+1] = avg; 
             data[i+2] = avg; 
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL());
        } else {
          resolve(base64);
        }
      };
      img.src = base64;
    });
  };

  const handleGenerateCharacter = async (prompt: string) => {
      if (!apiKey) { alert("Please enter your API Key in Settings first."); return; }
      setGenerationState({ isGenerating: true, step: 'analyzing', progress: 10, error: null });
      setActiveAnimId(null);
      setShowSkeleton(false);

      try {
          const imageUrl = await generateCharacterImage(apiKey, prompt);
          setPreviewImage(imageUrl);
          setGenerationState({ isGenerating: true, step: 'shaping', progress: 50, error: null });
          
          const glbBlob = await convertImageToGLB(imageUrl);
          const url = URL.createObjectURL(glbBlob);
          
          setFileUrl(url);
          setModelName("AI Generated Character");
          setModelRotation([0, 0, 0]); 
          setModelForceTPose(false);
          setAnimationConfig(DEFAULT_ANIMATION);
          setCurrentSourceImage(imageUrl);
          setShowTexture(true);
          setGenerationState({ isGenerating: false, step: 'complete', progress: 100, error: null });
      } catch (e: any) {
          console.error(e);
          setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: e.message || "Failed to generate model" });
      }
  };

  const handleUploadTo3D = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          setPreviewImage(result);
          setShowPreview(true);
      };
      reader.readAsDataURL(file);
  };

  const handleConvertPreviewTo3D = async () => {
    if (!previewImage) return;
    setShowPreview(false);
    setGenerationState({ isGenerating: true, step: 'shaping', progress: 10, error: null });
    try {
        const glbBlob = await convertImageToGLB(previewImage);
        const url = URL.createObjectURL(glbBlob);
        setFileUrl(url);
        setModelName("AI Generated Character");
        setModelRotation([0, 0, 0]); 
        setModelForceTPose(false);
        setAnimationConfig(DEFAULT_ANIMATION);
        setCurrentSourceImage(previewImage); 
        setShowTexture(true);
        resetState();
        setGenerationState({ isGenerating: false, step: 'complete', progress: 100, error: null });
    } catch (e: any) {
        setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: "3D Conversion failed: " + e.message });
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const handleTextTo3D = async (prompt: string, styleFile?: File) => {
    if (!apiKey) { alert("Please enter your API Key in Settings first."); return; }
    if (!fileUrl) {
       setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: "No base model selected." });
       return;
    }
    setGenerationState({ isGenerating: true, step: 'texturing', progress: 10, error: null });
    try {
      let baseTexture = currentSourceImage;
      if (!baseTexture && viewerRef.current) {
         try { baseTexture = viewerRef.current.getScreenshot(); } catch (e) { console.warn("Screenshot fallback failed", e); }
      } 
      if (!baseTexture || baseTexture.length < 100) {
          throw new Error("Could not access model texture. Please wait for the model to fully load or try a different one.");
      }
      const untexturedInput = await toGrayscale(baseTexture);
      let styleRefBase64 = undefined;
      if (styleFile) {
         styleRefBase64 = await readFileAsBase64(styleFile);
      }
      const newTexture = await generateTexture(apiKey, untexturedInput, prompt, styleRefBase64);
      viewerRef.current?.updateTexture(newTexture);
      setCurrentSourceImage(newTexture); 
      setShowTexture(true); 
      setGenerationState({ isGenerating: false, step: 'complete', progress: 100, error: null });
    } catch (err: any) {
      console.error(err);
      setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: err.message || "Generation failed. Try a different prompt." });
    }
  };

  const handleGenerateConfig = async (prompt: string) => {
     if (!apiKey) { alert("Please enter your API Key in Settings first."); return; }
     setGenerationState({ isGenerating: true, step: 'analyzing', progress: 50, error: null });
     try {
        const config = await generateAnimationConfig(apiKey, prompt);
        setAnimationConfig({
          type: config.animation,
          speed: config.speed,
          intensity: config.intensity,
          axis: config.axis
        });
        setActiveAnimId(null); 
     } catch(e) {
        console.error(e);
     } finally {
        setGenerationState({ isGenerating: false, step: 'idle', progress: 0, error: null });
     }
  };

  const handleAnimUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const newAnim: AnimationAsset = {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      url: url
    };
    setAnimations(prev => [...prev, newAnim]);
    setActiveAnimId(newAnim.id);
  };

  const handleDeleteAnim = (id: string) => {
    setAnimations(prev => prev.filter(a => a.id !== id));
    if (activeAnimId === id) setActiveAnimId(null);
  };

  const handleRotationChange = (yRadians: number) => {
     setModelRotation([modelRotation[0], yRadians, modelRotation[2]]);
  };

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full ${getThemeClass()} overflow-hidden transition-colors duration-500`}>
      {/* Top Left Menu Button */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg border border-slate-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Collapsible Menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-4 z-50 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-5">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center">
             <span className="font-bold text-white">Menu</span>
             <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
          <div className="p-2 space-y-1">
            <button 
              onClick={() => { setShowReadme(true); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> Readme / Help
            </button>
            <button 
              onClick={() => { setShowSettings(true); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ReadmeModal isOpen={showReadme} onClose={() => setShowReadme(false)} />
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        apiKey={apiKey} 
        setApiKey={setApiKey}
        theme={theme}
        setTheme={setTheme}
      />

      <div className="order-2 md:order-1 flex-1 md:flex-none w-full md:w-80 h-full overflow-hidden border-t md:border-t-0 md:border-r border-slate-800 relative z-10">
        <ControlPanel 
          key={fileUrl || 'panel'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFileUpload={handleFileUpload}
          onSelectSample={handleSelectSample}
          onDownloadSource={() => { if(fileUrl) window.open(fileUrl) }}
          onExport={() => viewerRef.current?.exportGLB()}
          modelName={modelName}
          generationState={generationState}
          onGenerateNew={handleGenerateCharacter}
          onUploadImageTo3D={handleUploadTo3D}
          onTextTo3D={handleTextTo3D}
          onReskin={handleTextTo3D}
          animations={animations}
          activeAnimId={activeAnimId}
          onAnimUpload={handleAnimUpload}
          onDeleteAnim={handleDeleteAnim}
          onSelectAnim={setActiveAnimId}
          currentConfig={animationConfig}
          onConfigChange={setAnimationConfig}
          onGenerateConfig={handleGenerateConfig}
          showSkeleton={showSkeleton}
          onToggleSkeleton={() => setShowSkeleton(!showSkeleton)}
          showTexture={showTexture}
          onToggleTexture={() => setShowTexture(!showTexture)}
          modelRotationY={modelRotation[1]}
          onRotationChange={handleRotationChange}
          error={generationState.error}
          apiKey={apiKey}
        />
      </div>
      
      <main className="order-1 md:order-2 w-full h-[45vh] md:h-full md:flex-1 relative bg-black/20 z-0">
        <ErrorBoundary resetKey={fileUrl || 'init'}>
            <ModelViewer 
              ref={viewerRef}
              fileUrl={fileUrl}
              fileName={modelName}
              rotation={modelRotation}
              animations={animations}
              activeAnimId={activeAnimId}
              config={animationConfig}
              showSkeleton={showSkeleton}
              onTextureLoaded={handleTextureLoaded}
              forceTPose={modelForceTPose}
              modifiers={modelModifiers}
              showTexture={showTexture}
            />
        </ErrorBoundary>

        <ImagePreviewModal 
          isOpen={showPreview}
          imageUrl={previewImage}
          onClose={() => setShowPreview(false)}
          onConvert={handleConvertPreviewTo3D}
          onDownload={() => {
             if (previewImage) {
                const a = document.createElement('a');
                a.href = previewImage;
                a.download = 'generated-character.png';
                a.click();
             }
          }}
        />
      </main>
    </div>
  );
}

export default App;