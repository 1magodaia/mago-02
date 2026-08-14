import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#0A0B1F] text-center">
      <div 
        style={{ 
          opacity: interpolate(frame, [0, 30], [0, 1]),
          transform: `translateY(${interpolate(spring({ frame, fps }), [0, 1], [50, 0])}px)`
        }}
        className="mb-16"
      >
        <div className="text-7xl font-black mb-4">Busca Mágica</div>
        <div className="text-2xl text-[#E4A94A] uppercase tracking-widest font-bold">
          Smart prospecting for digital sellers
        </div>
      </div>

      <div className="space-y-8 mb-20">
        <div 
          style={{ 
            opacity: interpolate(frame, [60, 90], [0, 1]),
            transform: `translateX(${interpolate(spring({ frame: frame - 60, fps }), [0, 1], [-30, 0])}px)`
          }}
          className="text-4xl font-semibold"
        >
          Start <span className="text-[#6B46E0]">free</span> with 1 search.
        </div>
        <div 
          style={{ 
            opacity: interpolate(frame, [90, 120], [0, 1]),
            transform: `translateX(${interpolate(spring({ frame: frame - 90, fps }), [0, 1], [30, 0])}px)`
          }}
          className="text-4xl font-semibold"
        >
          Go <span className="text-[#E4A94A]">Pro</span> for unlimited.
        </div>
      </div>

      {/* CTA Button Meta-Icon */}
      <div 
        style={{ 
          transform: `scale(${interpolate(spring({ frame: frame - 150, fps, config: { damping: 10 } }), [0, 1], [0, 1])})`
        }}
        className="w-24 h-24 bg-[#E4A94A] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(228,169,74,0.4)]"
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0A0B1F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      
      <div className="mt-12 text-gray-500 font-medium">
        buscamagica.lovable.app
      </div>
    </AbsoluteFill>
  );
};
