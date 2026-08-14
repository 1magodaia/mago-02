import React from 'react';
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    "Meet Busca Mágica",
    "Search by category and region",
    "Instant Google Places results",
    "Automatic digital audit",
    "See the opportunity score",
    "Save top leads & Export CSV",
    "Scale with AI-powered citations"
  ];

  return (
    <AbsoluteFill className="bg-[#0A0B1F] p-20">
      <div className="text-4xl font-bold text-[#E4A94A] mb-12">Solution</div>
      
      <div className="space-y-6">
        {features.map((feature, i) => {
          const start = i * 120;
          const s = spring({
            frame: frame - start,
            fps,
            config: { damping: 20 }
          });
          
          const opacity = interpolate(frame - start, [0, 20], [0, 1], { extrapolateLeft: 'clamp' });
          const x = interpolate(s, [0, 1], [-50, 0]);

          return (
            <div 
              key={i}
              style={{ opacity, transform: `translateX(${x}px)` }}
              className="flex items-center gap-4 text-3xl font-medium"
            >
              <div className="w-4 h-4 rounded-full bg-[#6B46E0]" />
              {feature}
            </div>
          );
        })}
      </div>

      {/* App UI Visual Placeholder */}
      <div 
        className="absolute right-20 top-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-slate-800 rounded-3xl border border-[#6B46E0]/40 overflow-hidden shadow-2xl"
        style={{ transform: `scale(${interpolate(frame, [0, 100], [0.8, 1], { extrapolateRight: 'clamp' })})` }}
      >
        <div className="h-12 bg-slate-900 flex items-center px-6 gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="p-10">
          <div className="w-full h-8 bg-slate-700 rounded-lg mb-8" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-40 bg-slate-700/50 rounded-2xl border border-white/10" />
            <div className="h-40 bg-slate-700/50 rounded-2xl border border-white/10" />
            <div className="h-40 bg-slate-700/50 rounded-2xl border border-[#E4A94A]/30 flex items-center justify-center">
              <span className="text-5xl font-black text-[#E4A94A]">85%</span>
            </div>
            <div className="h-40 bg-slate-700/50 rounded-2xl border border-white/10" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
