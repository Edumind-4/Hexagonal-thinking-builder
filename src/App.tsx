import React, { useState, useRef, useEffect } from 'react';
import { Plus, Link as LinkIcon, Trash2, Download, Hexagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { domToPng } from 'modern-screenshot';

interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface Link {
  id: string;
  fromId: string;
  toId: string;
  justification: string;
}

const HEX_WIDTH = 128;
const HEX_HEIGHT = 128;

const COLORS = [
  'bg-slate-700',
  'bg-indigo-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-indigo-700',
];

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Add a new node
  const addNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newNode: Node = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      color: COLORS[nodes.length % COLORS.length],
    };

    setNodes([...nodes, newNode]);
    setInputValue('');
  };

  // Delete a node and its links
  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setLinks(links.filter(l => l.fromId !== id && l.toId !== id));
    if (linkingFrom === id) setLinkingFrom(null);
  };

  // Initiate or complete a link
  const handleLinkAction = (id: string) => {
    if (!linkingFrom) {
      setLinkingFrom(id);
    } else {
      if (linkingFrom !== id) {
        // Check if link already exists
        const exists = links.some(
          l => (l.fromId === linkingFrom && l.toId === id) || (l.fromId === id && l.toId === linkingFrom)
        );
        if (!exists) {
          setLinks([
            ...links,
            {
              id: crypto.randomUUID(),
              fromId: linkingFrom,
              toId: id,
              justification: '',
            },
          ]);
        }
      }
      setLinkingFrom(null);
    }
  };

  // Update justification
  const updateJustification = (linkId: string, text: string) => {
    setLinks(links.map(l => (l.id === linkId ? { ...l, justification: text } : l)));
  };

  // Dragging logic
  const handleMouseDown = (id: string) => {
    setDraggingNodeId(id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingNodeId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - HEX_WIDTH / 2;
      const y = e.clientY - rect.top - HEX_HEIGHT / 2;

      setNodes(prev =>
        prev.map(n =>
          n.id === draggingNodeId
            ? {
                ...n,
                x: Math.max(0, Math.min(rect.width - HEX_WIDTH, x)),
                y: Math.max(0, Math.min(rect.height - HEX_HEIGHT, y)),
              }
            : n
        )
      );
    };

    const handleMouseUp = () => {
      setDraggingNodeId(null);
    };

    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId]);

  const exportImage = async () => {
    if (!mainRef.current) return;
    
    setIsExporting(true);
    
    // Give time for UI to switch to export mode
    await new Promise(resolve => setTimeout(resolve, 300));

    const scrollContainer = mainRef.current.querySelector('.custom-scrollbar') as HTMLElement;
    const aside = mainRef.current.querySelector('aside') as HTMLElement;

    // Store original styles
    const originalAsideHeight = aside.style.height;
    const originalMainHeight = mainRef.current.style.height;
    const originalMainOverflow = mainRef.current.style.overflow;
    const originalScrollOverflow = scrollContainer ? scrollContainer.style.overflowY : '';
    const originalScrollHeight = scrollContainer ? scrollContainer.style.height : '';

    if (scrollContainer) {
      // Calculate height needed to fit all content plus some buffer
      const requiredHeight = Math.max(mainRef.current.clientHeight, scrollContainer.scrollHeight + 200);
      
      // Temporarily expand containers for extraction
      mainRef.current.style.height = `${requiredHeight}px`;
      mainRef.current.style.overflow = 'visible';
      aside.style.height = `${requiredHeight}px`;
      scrollContainer.style.overflowY = 'visible';
      scrollContainer.style.height = 'auto';
    }

    try {
      const dataUrl = await domToPng(mainRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        features: {
          // Disable some features if needed, but defaults are usually good
        },
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.hasAttribute('data-html2canvas-ignore');
          }
          return true;
        }
      });

      const link = document.createElement('a');
      link.download = `hexagonal-thinking-map-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      // Restore original styles
      if (scrollContainer) {
        scrollContainer.style.overflowY = originalScrollOverflow;
        scrollContainer.style.height = originalScrollHeight;
      }
      aside.style.height = originalAsideHeight;
      mainRef.current.style.height = originalMainHeight;
      mainRef.current.style.overflow = originalMainOverflow;
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-900 font-sans">
      {/* Header */}
      <header className="h-auto lg:h-16 px-4 lg:px-6 py-4 lg:py-0 border-b border-slate-700 bg-slate-800-80 flex flex-col lg:flex-row items-center justify-between gap-4 z-50 shrink-0">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-500 rounded flex items-center justify-center safe-shadow-lg">
            <Hexagon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm lg:text-base font-black text-white uppercase tracking-tighter leading-none">Hex Builder</h1>
            <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Critical Analysis Tool</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <form onSubmit={addNode} className="flex flex-1 lg:flex-none" data-html2canvas-ignore="true">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add concept..."
              className="bg-slate-700 border border-slate-600 rounded-l py-1.5 lg:py-2 px-3 lg:px-4 text-xs lg:text-sm flex-1 lg:w-48 outline-none focus:ring-1 ring-indigo-400 text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-r text-xs lg:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Add Node
            </button>
          </form>

          <button
            onClick={exportImage}
            className="bg-slate-100 hover:bg-white text-slate-900 px-3 lg:px-4 py-1.5 lg:py-2 rounded text-xs lg:text-sm font-bold flex items-center gap-2 transition-all safe-shadow-sm active:scale-95 ml-auto lg:ml-0"
            data-html2canvas-ignore="true"
          >
            <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Canvas */}
        <div 
          ref={canvasRef}
          className="flex-1 relative grid-bg overflow-hidden cursor-crosshair bg-slate-900 min-h-[50vh] lg:min-h-0"
        >
          {/* SVG Overlay for Connections */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            {links.map((link) => {
              const fromNode = nodes.find(n => n.id === link.fromId);
              const toNode = nodes.find(n => n.id === link.toId);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={link.id}
                  x1={fromNode.x + HEX_WIDTH / 2}
                  y1={fromNode.y + HEX_HEIGHT / 2}
                  x2={toNode.x + HEX_WIDTH / 2}
                  y2={toNode.y + HEX_HEIGHT / 2}
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeDasharray="4"
                  opacity="0.6"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              initial={false}
              animate={{ x: node.x, y: node.y }}
              transition={draggingNodeId === node.id ? { type: "spring", stiffness: 1000, damping: 50, mass: 0.1 } : { type: "spring", stiffness: 300, damping: 30 }}
              className={`absolute group cursor-pointer z-10 ${draggingNodeId === node.id ? 'z-20' : ''}`}
            >
              {/* Node Main Shape */}
              <div
                onMouseDown={() => handleMouseDown(node.id)}
                className={`w-32 h-32 scale-75 lg:scale-100 flex items-center justify-center relative transition-transform cursor-grab active:cursor-grabbing`}
              >
                <svg viewBox="0 0 100 86.6" className="hexagon-svg" style={{ fill: `var(--color-${node.color.split('-')[1]}-${node.color.split('-')[2]})` }}>
                  <polygon points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" />
                </svg>
                <div className={`hexagon-inner text-white ${isExporting ? 'brightness-125' : 'drop-shadow-md'} px-4 uppercase tracking-tight relative z-20`}>
                  {node.text}
                </div>
              </div>

              {/* Hover Actions */}
              {!isExporting && (
                <div 
                  className="absolute -top-2 -right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all z-30"
                  data-html2canvas-ignore="true"
                >
                  <button
                    onClick={() => handleLinkAction(node.id)}
                    title="Link"
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all safe-shadow-lg text-[10px] ${
                      linkingFrom === node.id ? 'bg-amber-500 scale-110' : 'bg-indigo-500 hover:bg-indigo-400'
                    } text-white border border-white-20`}
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => deleteNode(node.id)}
                    title="Delete"
                    className="w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center transition-all safe-shadow-lg text-[10px] border border-white-20"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Linking indicator */}
              {linkingFrom === node.id && (
                <div className="absolute -inset-2 border-2 border-dashed border-indigo-400 rounded-full animate-pulse pointer-events-none" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Right Column: Justification Panel */}
        <aside className="w-full lg:w-80 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col shrink-0 z-40 relative">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800-40 shrink-0">
            <h2 className="text-xs lg:text-sm font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Justification Panel</h2>
            {links.length > 0 && (
              <span className="px-2 py-0.5 bg-indigo-900 text-indigo-200 text-[9px] lg:text-[10px] rounded-full font-bold">{links.length} Links</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 bg-slate-800-20 min-h-[300px] lg:min-h-0">
            <AnimatePresence>
              {links.map((link) => {
                const fromNode = nodes.find(n => n.id === link.fromId);
                const toNode = nodes.find(n => n.id === link.toId);
                if (!fromNode || !toNode) return null;

                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-700-50 rounded-lg border border-slate-600 p-3 safe-shadow-sm group/card"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-tight leading-normal py-0.5">
                          {fromNode.text} ↔ {toNode.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => setLinks(links.filter(l => l.id !== link.id))}
                        className="text-slate-500 hover:text-rose-400 transition-colors ml-2"
                        data-html2canvas-ignore="true"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="relative min-h-[96px] bg-slate-900 border border-slate-600 rounded overflow-hidden">
                      {isExporting ? (
                        <div className="p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words min-h-full">
                          {link.justification || <span className="text-slate-600 italic">No justification provided...</span>}
                        </div>
                      ) : (
                        <textarea
                          placeholder="Explain the connection..."
                          value={link.justification}
                          onChange={(e) => updateJustification(link.id, e.target.value)}
                          className="w-full min-h-[96px] bg-transparent border-none p-3 text-xs text-slate-300 resize-none outline-none focus:ring-0 placeholder:text-slate-600 block"
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {links.length === 0 && (
              <div className="h-40 flex items-center justify-center text-slate-500 text-[10px] lg:text-[11px] italic text-center p-8 uppercase tracking-widest leading-loose opacity-50">
                Awaiting conceptual links
              </div>
            )}
            
            {/* Poster Watermark - only visible during export and positioned at end of content */}
            {isExporting && (
              <div className="pt-16 pb-12 text-center border-t border-slate-700/30 mt-8 px-6">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed break-all">
                  Created at<br/>
                  <span className="text-slate-400 font-bold block mt-1">https://cbse.smartresourcesacademy.com/hexagonal-thinking-builder</span>
                  <span className="block mt-2 opacity-60">Digital Curriculum Sandbox</span>
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Persistent Viewport Footer - hidden during export to avoid overlaps */}
        {!isExporting && (
          <footer className="h-8 bg-slate-950 px-4 flex items-center justify-center shrink-0 border-t border-slate-800 z-50 lg:absolute lg:bottom-0 lg:left-0 lg:right-0">
            <span className="text-[9px] lg:text-[10px] text-slate-500 uppercase tracking-widest text-center px-4">
              Created at https://cbse.smartresourcesacademy.com/hexagonal-thinking-builder — Digital Curriculum Sandbox
            </span>
          </footer>
        )}
      </main>
    </div>
  );
}
