import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["700"] });

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12 }
  });

  const opacity = interpolate(frame, [0, 20], [0, 1]);
  const y = interpolate(titleSpring, [0, 1], [50, 0]);

  return (
    <AbsoluteFill className="flex items-center justify-center bg-[#0A0B1F]">
      <div 
        style={{ 
          fontFamily,
          opacity,
          transform: `translateY(${y}px)`
        }}
        className="text-7xl font-bold text-center px-20 leading-tight"
      >
        <span className="text-[#E4A94A]">Tired</span> of manual prospecting?
      </div>
      
      {/* Background accents */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6B46E0]/20 rounded-full blur-[120px]"
        style={{ opacity: interpolate(frame, [0, 60], [0, 1]) }}
      />
    </AbsoluteFill>
  );
};
