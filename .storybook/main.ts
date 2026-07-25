import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: { disableTelemetry: true },
  viteFinal: async (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "../src"),
    };
    // Storybook não precisa dos plugins de rota do TanStack Start.
    cfg.plugins = (cfg.plugins ?? []).filter((p: any) => {
      const name = p?.name ?? "";
      return !name.startsWith("tanstack") && !name.startsWith("vite-plugin-solid");
    });
    return cfg;
  },
};

export default config;
