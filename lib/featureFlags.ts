/**
 * Simple, build-time feature flags. Flip these constants to toggle features
 * without ripping out the underlying code (which stays compiled and tested).
 *
 * If a flag turns out to be permanent, inline it; if it needs runtime
 * configuration, promote it to an env var. For now everything here is
 * decided at build time, so tree-shaking removes the dead branches.
 */

/**
 * Photo gallery (multi-photo upload + grid + lightbox). Temporarily hidden
 * from both the family edit page and the public memorial page while we
 * focus on the banner + portrait flow. The DB tables, server actions and
 * components remain functional — flip back to `true` to re-enable.
 */
export const FEATURE_PHOTO_GALLERY = false;
