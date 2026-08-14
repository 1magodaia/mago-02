import React from 'react';
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

// Colors: Magic Purple (#6B46E0), Brand Gold (#E4A94A), Deep Night (#0A0B1F)
export const COLORS = {
  purple: "#6B46E0",
  gold: "#E4A94A",
  night: "#0A0B1F",
  white: "#FFFFFF",
  gray: "#94A3B8"
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill className="bg-[#0A0B1F] text-white overflow-hidden">
      <TransitionSeries>
        {/* [0-10s] HOOK */}
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene1 />
        </TransitionSeries.Sequence>
        
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />

        {/* [10-25s] PROBLEM */}
        <TransitionSeries.Sequence durationInFrames={450}>
          <Scene2 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />

        {/* [25-60s] SOLUTION */}
        <TransitionSeries.Sequence durationInFrames={1050}>
          <Scene3 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />

        {/* [60-75s] SOCIAL PROOF */}
        <TransitionSeries.Sequence durationInFrames={450}>
          <Scene4 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />

        {/* [75-90s] CTA */}
        <TransitionSeries.Sequence durationInFrames={450}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
