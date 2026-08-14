import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 12 }
  });

  const count = Math.floor(interpolate(statSpring, [0, 1], [0, 3000]));
  const opacity = interpolate(frame, [0, 30], [0, 1]);

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#0A0B1F] text-center">
      <div style={{ opacity }} className="text-4xl font-semibold text-gray-400 mb-6 uppercase tracking-widest">
        Results Delivered
      </div>
      
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-9xl font-black text-[#E4A94A]">
          {count}+
        </span>
        <span className="text-4xl font-bold text-white">Leads Found</span>
      </div>

      <div 
        style={{ 
          opacity: interpolate(frame, [150, 180], [0, 1]),
          transform: `scale(${interpolate(spring({ frame: frame - 150, fps }), [0, 1], [0.8, 1])})`
        }}
        className="text-6xl font-black text-[#6B46E0] px-12 py-6 border-4 border-[#6B46E0] rounded-full"
      >
        10X FASTER
      </div>

      <div className="mt-12 text-2xl text-gray-400">
        than manual search
      </div>
    </AbsoluteFill>
  );
};
