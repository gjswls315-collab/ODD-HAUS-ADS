// Small helpers shared by the episode scripts.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const by = (id, map, dflt) => (map[id] !== undefined ? map[id] : dflt);
export const spread = (n, gap = 62) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap);

export async function cheer(s, ms = 1800, pose = 'cheer') {
  s.poseAll(pose);
  await s.wait(ms);
  s.poseAll('stand');
}
