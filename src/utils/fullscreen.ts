/**
 * Thin wrapper over the Fullscreen API that also covers the WebKit-prefixed
 * variant still used by older Safari/iPad. Kept isolated so the rest of the
 * codebase never touches vendor prefixes.
 */

interface WebkitFullscreenDocument {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function isFullscreenSupported(): boolean {
  const el = document.documentElement as HTMLElement & WebkitFullscreenElement;
  return Boolean(document.fullscreenEnabled || el.webkitRequestFullscreen);
}

export function getFullscreenElement(): Element | null {
  const doc = document as Document & WebkitFullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreen(): boolean {
  return getFullscreenElement() !== null;
}

export async function requestFullscreen(element: HTMLElement): Promise<void> {
  const el = element as HTMLElement & WebkitFullscreenElement;
  if (element.requestFullscreen) {
    await element.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen();
  }
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as Document & WebkitFullscreenDocument;
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
  }
}

export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await requestFullscreen(element);
  }
}

/** Subscribe to fullscreen changes; returns an unsubscribe function. */
export function onFullscreenChange(handler: () => void): () => void {
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
