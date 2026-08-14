import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="main"
        component={MainVideo}
        durationInFrames={90 * 30} // 90 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
