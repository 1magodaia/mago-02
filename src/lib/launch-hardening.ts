import { supabase } from "@/integrations/supabase/client";

/**
 * Validates the high-resolution icons in the PWA manifest.
 */
async function checkPWAManifest() {
  try {
    const resp = await fetch('/manifest.webmanifest');
    if (!resp.ok) return;
    const manifest = await resp.json();
    const icons = manifest.icons || [];
    const hasHighRes = icons.some((i: any) => i.sizes === "512x512");
    if (!hasHighRes) {
      console.warn("PWA Manifest is missing 512x512 icon.");
    }
  } catch (e) {
    // Silent
  }
}

if (typeof window !== "undefined") {
  checkPWAManifest();
}
