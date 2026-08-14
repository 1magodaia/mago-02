import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  
  const text1Opacity = interpolate(frame, [0, 30, 120, 150], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  const text2Opacity = interpolate(frame, [150, 180, 270, 300], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  const text3Opacity = interpolate(frame, [300, 330, 420, 450], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#0A0B1F] px-20 text-center">
      <div style={{ opacity: text1Opacity }} className="text-5xl font-semibold mb-8">
        Finding quality local leads takes <span className="text-[#E4A94A]">hours</span>.
      </div>
      <div style={{ opacity: text2Opacity }} className="text-5xl font-semibold mb-8">
        SMBs <span className="text-[#6B46E0]">hide</span> their contact info.
      </div>
      <div style={{ opacity: text3Opacity }} className="text-5xl font-semibold">
        You waste time on cold outreach that <span className="text-red-500 underline">doesn't work</span>.
      </div>
      
      {/* Clock icon placeholder/metaphor */}
      <div 
        className="absolute bottom-20 w-32 h-32 border-4 border-[#E4A94A]/30 rounded-full"
        style={{ transform: `rotate(${frame * 2}deg)` }}
      >
        <div className="absolute top-1/2 left-1/2 w-1 h-12 bg-[#E4A94A] origin-bottom -translate-x-1/2 -translate-y-full" />
      </div>
    </AbsoluteFill>
  );
};
