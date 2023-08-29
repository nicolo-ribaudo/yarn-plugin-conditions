export const DEPENDENCY_TYPES = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
] as const;

// We must update this every time that the generated proxy dependency changes.
export const CACHE_VERSION = 10.1;
