// Global film constants. Everything in the film is a pure function of time `t` (seconds).
export const DURATION = 40;
export const BPM = 90; // 60 beats = 15 bars of 4/4 = exactly 40.000 s
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

export const PAL = {
  cream: '#E8DFC8',
  navy: '#182333',
  black: '#171717',
  tobacco: '#79543D',
  amber: '#D79A57',
  snow: '#A7B8C6',
};

const base = import.meta.env.BASE_URL;

// The ORIGINAL ODD HAUS character drawing. It is only ever used as a flat, static texture
// (poster, garment print, record sleeve, window card, end card). Nothing in it is animated.
export const CHARACTER = {
  // first file that loads wins
  candidates: ['oddhaus-character.webp', 'oddhaus-character.png', 'oddhaus-character.jpg', 'oddhaus-character.jpeg']
    .map((f) => `${base}assets/${f}`),
  // Position of the cigarette tip inside the image (0..1, origin top-left). The smoke layer
  // starts here. Open the film with ?pick to click the tip and get the numbers.
  cigTip: { u: 0.214, v: 0.327 },
  // 'auto'  : keep the image alpha if it has one, otherwise key the white paper out (ink stays)
  // 'alpha' : trust the file's alpha channel      'luma' : always key by brightness
  key: 'auto',
};

export const QUALITY = [
  { name: 'high', scale: 1.0, dofTaps: 22, snow: 1.0 },
  { name: 'medium', scale: 0.8, dofTaps: 14, snow: 0.75 },
  { name: 'low', scale: 0.62, dofTaps: 8, snow: 0.5 },
];
