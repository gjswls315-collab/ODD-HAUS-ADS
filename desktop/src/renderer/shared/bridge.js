// window.odd comes from the preload script inside the app. Opened in a plain browser
// (tools/preview.mjs), the pages get a stand-in so they can be previewed and screenshotted.

export async function connect(role) {
  if (window.odd) return window.odd;
  const { createMock } = await import('./mock-bridge.js');
  return createMock(role);
}

export async function loadFonts() {
  try {
    await document.fonts.load('14px Jua');
  } catch {
    // the system font is fine too
  }
}
