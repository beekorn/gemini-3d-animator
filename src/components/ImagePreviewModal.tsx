import React from 'react';
import { X, Download, Box, Sparkles } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: () => void;
  onDownload: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, isOpen, onClose, onConvert, onDownload }) => {
  if (!isOpen || !imageUrl) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h2 className="font-semibold text-sm tracking-wide uppercase">AI Character Preview</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <div className="relative w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mb-6 flex items-center justify-center group">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b),linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b)] bg-[length:20px_20px] opacity-20" />
            <img src={imageUrl} alt="Generated Character" className="relative z-10 max-h-full object-contain drop-shadow-2xl" />
          </div>
          <p className="text-slate-400 text-sm text-center mb-6">Character generated successfully. <br/> Convert to 3D to auto-rig and animate it, or download the image.</p>
          <div className="flex w-full gap-3">
            <button onClick={onDownload} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600">
              <Download className="w-4 h-4" /> Download Image
            </button>
            <button onClick={onConvert} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-3 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2">
              <Box className="w-4 h-4" /> Convert to 3D
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImagePreviewModal;