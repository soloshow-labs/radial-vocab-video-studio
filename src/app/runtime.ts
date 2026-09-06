export const GITHUB_REPOSITORY_URL = "https://github.com/soloshow-labs/radial-vocab-video-studio";

export function isPublicDemoMode(mode: string, explicitFlag?: string): boolean {
  return mode === "demo" || explicitFlag === "true";
}

export const PUBLIC_DEMO = isPublicDemoMode(import.meta.env.MODE, import.meta.env.VITE_PUBLIC_DEMO);
