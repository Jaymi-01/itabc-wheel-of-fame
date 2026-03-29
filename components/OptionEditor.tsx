"use client";

import React from "react";

interface WheelOption {
  id: string;
  text: string;
  isPicked: boolean;
  colorIndex: number;
}

interface OptionEditorProps {
  options: WheelOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onTogglePicked: (id: string) => void;
  disabled: boolean;
}

const OptionEditor: React.FC<OptionEditorProps> = ({ 
  options, onAdd, onRemove, onUpdate, onTogglePicked, disabled 
}) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white/50 backdrop-blur-md rounded-2xl shadow-xl border border-[#141935]/10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#141935]">Book Options</h2>
        <span className="text-sm font-medium text-[#141935]/60">
          {options.length}/30
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2 group">
            <button
              onClick={() => onTogglePicked(option.id)}
              disabled={disabled}
              className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                option.isPicked 
                  ? "bg-zinc-400 border-zinc-400 text-white" 
                  : "border-[#141935]/20 text-transparent hover:border-[#141935]"
              }`}
              title={option.isPicked ? "Mark as not picked" : "Mark as picked"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <input
              type="text"
              value={option.text}
              onChange={(e) => onUpdate(option.id, e.target.value)}
              disabled={disabled}
              className={`flex-1 px-3 py-2 text-sm rounded-lg bg-white/80 border border-[#141935]/10 focus:outline-none focus:ring-2 focus:ring-[#141935]/20 transition-all disabled:opacity-50 text-[#141935] ${
                option.isPicked ? "line-through text-zinc-400" : ""
              }`}
              placeholder="Book name..."
            />
            <button
              onClick={() => onRemove(option.id)}
              disabled={disabled || options.length <= 10}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100"
              aria-label="Remove book"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      
      <button
        onClick={onAdd}
        disabled={disabled || options.length >= 30}
        className="mt-2 w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-[#141935]/10 rounded-lg text-[#141935]/60 hover:text-[#141935] hover:border-[#141935]/30 transition-all disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Book
      </button>
    </div>
  );
};

export default OptionEditor;
