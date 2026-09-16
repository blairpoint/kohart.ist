"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Copy, 
  Upload,
  FileJson,
  Image as ImageIcon,
  CloudUpload,
  X
} from "lucide-react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const GRID_SIZE = 32;
const NUM_CELLS = GRID_SIZE * GRID_SIZE;
const DEFAULT_COLOR = "#000000";

type Tool = "pen" | "eraser" | "fill";

export default function Home() {
  const [frames, setFrames] = useState<string[][]>([
    Array(NUM_CELLS).fill(DEFAULT_COLOR),
  ]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [currentTool, setCurrentTool] = useState<Tool>("pen");
  const [currentColor, setCurrentColor] = useState("#ff0000");
  const [fps, setFps] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // MEGA Upload State
  const [isMegaModalOpen, setIsMegaModalOpen] = useState(false);
  const [isUploadingMega, setIsUploadingMega] = useState(false);
  const [megaLink, setMegaLink] = useState("");
  const [megaError, setMegaError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // Stop playing if frame index changes manually
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, fps, frames.length]);

  // Draw current frame on main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = frames[currentFrameIdx];
    ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

    for (let i = 0; i < NUM_CELLS; i++) {
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE);
      ctx.fillStyle = frame[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }, [frames, currentFrameIdx]);

  // Draw current preview frame
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = frames[currentFrameIdx];
    ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

    for (let i = 0; i < NUM_CELLS; i++) {
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE);
      ctx.fillStyle = frame[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }, [frames, currentFrameIdx]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GRID_SIZE / rect.width;
    const scaleY = GRID_SIZE / rect.height;
    
    let x = Math.floor((e.clientX - rect.left) * scaleX);
    let y = Math.floor((e.clientY - rect.top) * scaleY);
    
    x = Math.max(0, Math.min(x, GRID_SIZE - 1));
    y = Math.max(0, Math.min(y, GRID_SIZE - 1));
    
    return { x, y };
  };

  const floodFill = (
    grid: string[],
    x: number,
    y: number,
    targetColor: string,
    replacementColor: string
  ) => {
    if (targetColor === replacementColor) return;
    const stack = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
      const idx = cy * GRID_SIZE + cx;
      if (grid[idx] === targetColor) {
        grid[idx] = replacementColor;
        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
      }
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    const idx = y * GRID_SIZE + x;

    setFrames((prev) => {
      const newFrames = [...prev];
      const newFrame = [...newFrames[currentFrameIdx]];

      if (currentTool === "pen") {
        newFrame[idx] = currentColor;
      } else if (currentTool === "eraser") {
        newFrame[idx] = DEFAULT_COLOR;
      } else if (currentTool === "fill") {
        floodFill(newFrame, x, y, newFrame[idx], currentColor);
      }

      newFrames[currentFrameIdx] = newFrame;
      return newFrames;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    draw(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (currentTool === "fill") return; // Don't re-fill on drag
    draw(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
  };

  const handleAddFrame = () => {
    setFrames((prev) => {
      const newFrames = [...prev];
      newFrames.splice(currentFrameIdx + 1, 0, Array(NUM_CELLS).fill(DEFAULT_COLOR));
      return newFrames;
    });
    setCurrentFrameIdx((prev) => prev + 1);
  };

  const handleDuplicateFrame = () => {
    setFrames((prev) => {
      const newFrames = [...prev];
      newFrames.splice(currentFrameIdx + 1, 0, [...prev[currentFrameIdx]]);
      return newFrames;
    });
    setCurrentFrameIdx((prev) => prev + 1);
  };

  const handleDeleteFrame = () => {
    if (frames.length === 1) {
      setFrames([Array(NUM_CELLS).fill(DEFAULT_COLOR)]);
      return;
    }
    setFrames((prev) => {
      const newFrames = [...prev];
      newFrames.splice(currentFrameIdx, 1);
      return newFrames;
    });
    setCurrentFrameIdx((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const generateGifBytes = (): Uint8Array | null => {
    try {
      const gif = new GIFEncoder();
      
      frames.forEach((frame) => {
        const rgba = new Uint8Array(GRID_SIZE * GRID_SIZE * 4);
        for (let i = 0; i < NUM_CELLS; i++) {
          const rgb = hexToRgb(frame[i]);
          rgba[i * 4] = rgb.r;
          rgba[i * 4 + 1] = rgb.g;
          rgba[i * 4 + 2] = rgb.b;
          rgba[i * 4 + 3] = 255;
        }

        const palette = quantize(rgba, 256);
        const index = applyPalette(rgba, palette);
        
        gif.writeFrame(index, GRID_SIZE, GRID_SIZE, { 
          palette, 
          delay: 1000 / fps 
        });
      });

      gif.finish();
      return gif.bytesView();
    } catch (err) {
      console.error("Failed to generate GIF", err);
      return null;
    }
  };

  const handleExportGif = () => {
    const bytes = generateGifBytes();
    if (!bytes) {
      alert("Failed to export GIF.");
      return;
    }
    
    const blob = new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "idotmatrix_animation.gif";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitMegaUpload = async () => {
    setMegaError("");
    setIsUploadingMega(true);

    const bytes = generateGifBytes();
    if (!bytes) {
      setMegaError("Failed to generate GIF for upload.");
      setIsUploadingMega(false);
      return;
    }

    try {
      // Convert Uint8Array to base64
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = window.btoa(binary);

      const res = await fetch("/api/mega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: "idotmatrix_animation.gif"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      setMegaLink(data.link);
    } catch (err: any) {
      setMegaError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUploadingMega(false);
    }
  };

  const processJsonFiles = async (filesList: FileList | null, append: boolean) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    // Sort files by name to merge in order
    files.sort((a, b) => a.name.localeCompare(b.name));

    const parsedFrames: string[][] = [];

    const parseFrame = (grid: any[]) => {
      const frame = Array(NUM_CELLS).fill(DEFAULT_COLOR);
      for (let y = 0; y < Math.min(grid.length, GRID_SIZE); y++) {
        const row = grid[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < Math.min(row.length, GRID_SIZE); x++) {
          const rgb = row[x];
          if (Array.isArray(rgb) && rgb.length >= 3) {
            const r = Math.max(0, Math.min(255, rgb[0]));
            const g = Math.max(0, Math.min(255, rgb[1]));
            const b = Math.max(0, Math.min(255, rgb[2]));
            frame[y * GRID_SIZE + x] = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          }
        }
      }
      return frame;
    };

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (Array.isArray(data) && data.length > 0) {
          if (Array.isArray(data[0]) && Array.isArray(data[0][0]) && typeof data[0][0][0] === "number") {
            parsedFrames.push(parseFrame(data));
          } 
          else if (Array.isArray(data[0]) && Array.isArray(data[0][0]) && Array.isArray(data[0][0][0]) && typeof data[0][0][0][0] === "number") {
            for (const frameData of data) {
              parsedFrames.push(parseFrame(frameData));
            }
          }
        }
      } catch (err) {
        console.error(`Failed to parse JSON file: ${file.name}`, err);
        alert(`Failed to parse JSON file: ${file.name}`);
      }
    }

    if (parsedFrames.length > 0) {
      if (append) {
        setFrames(prev => [...prev, ...parsedFrames]);
      } else {
        setFrames(parsedFrames);
        setCurrentFrameIdx(0);
      }
    } else {
      alert("Unrecognized JSON format or no valid frames found.");
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processJsonFiles(e.target.files, false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAppendJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processJsonFiles(e.target.files, true);
    if (appendFileInputRef.current) appendFileInputRef.current.value = "";
  };

  const handleExportJson = () => {
    // Subsample frames to a maximum of 59 frames evenly
    let exportFrames = frames;
    const MAX_FRAMES = 59;
    
    if (frames.length > MAX_FRAMES) {
      exportFrames = [];
      const step = frames.length / MAX_FRAMES;
      for (let i = 0; i < MAX_FRAMES; i++) {
        // Find the closest index for even distribution
        const index = Math.floor(i * step);
        exportFrames.push(frames[index]);
      }
    }

    const exportData = exportFrames.map((frame) => {
      const grid = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        const row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
          const hex = frame[y * GRID_SIZE + x];
          const rgb = hexToRgb(hex);
          row.push([rgb.r, rgb.g, rgb.b]);
        }
        grid.push(row);
      }
      return grid;
    });

    const finalData = exportFrames.length === 1 ? exportData[0] : exportData;
    const blob = new Blob([JSON.stringify(finalData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "idotmatrix_animation.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold tracking-tight">iDotMatrix Animator</h1>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".json" 
            multiple
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImportJson} 
          />
          <input 
            type="file" 
            accept=".json" 
            multiple
            ref={appendFileInputRef} 
            className="hidden" 
            onChange={handleAppendJson} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md transition-colors font-medium text-sm border border-zinc-700"
            title="Import JSON (Replaces Current)"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          
          <button
            onClick={() => appendFileInputRef.current?.click()}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md transition-colors font-medium text-sm border border-zinc-700"
            title="Append JSON"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Append</span>
          </button>
          
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md transition-colors font-medium text-sm border border-zinc-700"
            title="Export JSON"
          >
            <FileJson className="w-4 h-4" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={handleExportGif}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md transition-colors font-medium text-sm"
            title="Export GIF"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">GIF</span>
          </button>

          <button
            onClick={() => setIsMegaModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md transition-colors font-medium text-sm"
            title="Upload to MEGA"
          >
            <CloudUpload className="w-4 h-4" />
            <span className="hidden sm:inline">MEGA</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="shrink-0 w-full md:w-16 flex md:flex-col items-center justify-center md:justify-start py-4 md:py-6 px-4 md:px-0 border-b md:border-b-0 md:border-r border-zinc-800 gap-4 bg-zinc-900/50 flex-row overflow-y-auto">
          <button
            onClick={() => setCurrentTool("pen")}
            className={`p-3 rounded-xl transition-colors ${
              currentTool === "pen" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            }`}
            title="Pen Tool"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentTool("eraser")}
            className={`p-3 rounded-xl transition-colors ${
              currentTool === "eraser" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentTool("fill")}
            className={`p-3 rounded-xl transition-colors ${
              currentTool === "fill" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            }`}
            title="Fill Tool"
          >
            <PaintBucket className="w-5 h-5" />
          </button>

          <div className="w-px h-full md:w-full md:h-px bg-zinc-800 mx-2 md:my-2 md:mx-0" />

          <div className="relative group">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              title="Select Color"
            />
          </div>
        </aside>

        {/* Center - Canvas */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950 overflow-auto min-h-[50vh]">
          <div className="bg-zinc-900 p-2 md:p-4 rounded-2xl shadow-2xl border border-zinc-800/50 w-full max-w-[512px] flex items-center justify-center aspect-square">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE}
              height={GRID_SIZE}
              className="w-full h-full cursor-crosshair touch-none"
              style={{
                imageRendering: "pixelated",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </section>

        {/* Right Sidebar - Preview & Settings */}
        <aside className="shrink-0 md:shrink w-full md:w-72 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/50 flex flex-col flex-1 md:flex-none overflow-hidden">
          {/* Top Fixed Section - Preview */}
          <div className="p-6 border-b border-zinc-800 flex flex-col items-center gap-4 shrink-0">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider self-start">Preview</h2>
            
            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <canvas
                ref={previewCanvasRef}
                width={GRID_SIZE}
                height={GRID_SIZE}
                className="w-48 h-48 rounded"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            <div className="flex items-center gap-2 w-full justify-center mt-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>

            <div className="w-full mt-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-2">
                <span>Speed (FPS)</span>
                <span>{fps} fps</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Middle Scrollable Section - Frames List */}
          <div className="p-6 pb-2 flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Frames</h2>
              <span className="text-xs text-zinc-500">{currentFrameIdx + 1} / {frames.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {frames.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentFrameIdx(idx)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                    currentFrameIdx === idx 
                      ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-sm font-medium">Frame {idx + 1}</span>
                  {currentFrameIdx === idx && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Fixed Section - Frame Controls */}
          <div className="p-6 pt-2 shrink-0 border-t border-zinc-800">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleAddFrame}
                className="flex flex-col items-center justify-center p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title="Add Blank Frame"
              >
                <Plus className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Add</span>
              </button>
              <button
                onClick={handleDuplicateFrame}
                className="flex flex-col items-center justify-center p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title="Duplicate Current Frame"
              >
                <Copy className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Dup</span>
              </button>
              <button
                onClick={handleDeleteFrame}
                className="flex flex-col items-center justify-center p-2 rounded bg-red-950/30 hover:bg-red-950/50 text-red-400 transition-colors"
                title="Delete Current Frame"
              >
                <Trash2 className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Del</span>
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* MEGA Upload Modal */}
      {isMegaModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsMegaModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-red-500" /> Upload to MEGA
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Upload your animation as a GIF to MEGA. 
              This uses the securely configured MEGA credentials on the server.
            </p>

            <div className="space-y-4">
              {megaError && (
                <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm rounded">
                  {megaError}
                </div>
              )}

              {megaLink && (
                <div className="p-3 bg-green-950/50 border border-green-900/50 text-green-400 text-sm rounded space-y-2">
                  <p className="font-semibold">Upload Successful!</p>
                  <a href={megaLink} target="_blank" rel="noopener noreferrer" className="break-all underline hover:text-green-300">
                    {megaLink}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsMegaModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors"
                disabled={isUploadingMega}
              >
                Close
              </button>
              {!megaLink && (
                <button
                  onClick={submitMegaUpload}
                  disabled={isUploadingMega}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingMega ? "Uploading..." : "Upload File"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
