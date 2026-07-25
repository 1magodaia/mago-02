import type { Preview } from "@storybook/react";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0A0B1F" }],
    },
    viewport: {
      viewports: {
        mobilePortrait: {
          name: "Mobile · portrait (iPhone 11)",
          styles: { width: "414px", height: "896px" },
        },
        mobileLandscape: {
          name: "Mobile · landscape",
          styles: { width: "896px", height: "414px" },
        },
        tabletPortrait: {
          name: "Tablet · portrait (iPad)",
          styles: { width: "820px", height: "1180px" },
        },
        tabletLandscape: {
          name: "Tablet · landscape",
          styles: { width: "1180px", height: "820px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1440px", height: "900px" },
        },
      },
    },
  },
};

export default preview;
