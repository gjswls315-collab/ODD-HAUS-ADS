import { G, Scene } from '../core/app';
import { ART } from '../gfx/sprites';

/** Dev-only sprite sheet (?artsheet) used to review generated art. */
export class ArtSheetScene implements Scene {
  update() {}
  render() {
    const r = G.r;
    const g = r.wctx;
    g.fillStyle = '#20202a';
    g.fillRect(0, 0, 640, 360);
    let x = 2;
    for (const id of ['seraphine', 'noctis', 'morgana'] as const) {
      ART.hero[id].forEach((c, i) => g.drawImage(c, x + i * 43, 2));
      x += 132;
    }
    x = 400;
    for (const k of ['bat', 'candle', 'skeleton', 'cleric']) {
      ART.enemy[k].forEach((c, i) => g.drawImage(c, x + i * (c.width + 2), k === 'bat' || k === 'candle' ? 2 : 40));
      if (k === 'candle') x = 400;
      else if (k === 'bat') x += 110;
      else x += 92;
    }
    ART.enemy.sentinel.forEach((c, i) => g.drawImage(c, 2 + i * 76, 40));
    ART.enemy.graven.forEach((c, i) => g.drawImage(c, 2 + i * 130, 124));
    // boss composite
    const bx = 400, by = 110;
    g.drawImage(ART.boss.armBack, bx + 60, by + 40);
    g.drawImage(ART.boss.bell[1], bx + 90, by - 6);
    g.drawImage(ART.boss.body, bx + 20, by + 20);
    g.drawImage(ART.boss.faces[1], bx + 118, by + 90);
    g.drawImage(ART.boss.arm.down, bx - 10, by + 70);
    let ix = 2;
    for (const k of ['P', 'H', 'B', 'S']) ART.item[k].forEach((c) => { g.drawImage(c, ix, 245); ix += 15; });
    ix += 6;
    for (const k of Object.keys(ART.bullet)) { g.drawImage(ART.bullet[k], ix, 245); ix += ART.bullet[k].width + 4; }
    for (const k of Object.keys(ART.shot)) { g.drawImage(ART.shot[k], ix, 245); ix += ART.shot[k].width + 4; }
    g.drawImage(ART.heroBig.seraphine, 2, 262, 80, 68);
    r.presentWorld();
  }
}
