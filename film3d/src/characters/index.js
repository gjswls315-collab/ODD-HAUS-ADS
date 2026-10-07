// Character registry: definition + procedural builder + animation controller.
import { loadCharacter, TinyController } from "./base.js";
import { TinyRigController } from "./tinyrig.js";
import { loadTinyKit, hasKit } from "./tinykit.js";
import { BUDDY, buildBuddy, DogController } from "./buddy.js";
import { BULLY, buildBully, bullyGLBExtra } from "./bully.js";
import { MRODD, buildMrOdd, mroddGLBExtra } from "./mrodd.js";
import { DogRigController } from "./dogrig.js";
import { HumanController } from "./human.js";
import { HumanRigController } from "./humanrig.js";
import { VIN, buildVin, PICKER, buildPicker, AA, buildAA, LOCKE, buildLocke, REX, buildRex } from "./tiny.js";

// Motion tuning for the sculpted GLB rigs (procedural fallbacks keep their own meta).
BULLY.glbMeta = { seed: 9, lid: 0.45, lowerLid: -0.55, strideK: 1.3, lift: 0.1, sway: 0.03, eye: { scale: 0.86, push: 0.005 } };
MRODD.glbMeta = { seed: 13, lid: 0.3, lowerLid: -0.6, eye: { scale: 0.95, push: 0.003 }, heavy: 1, strideK: 1.02, lift: 0.07, sway: 0.055, hipYaw: 0.09, hipRoll: 0.06, toeOff: 0.4 };
BUDDY.glbMeta = { walkStride: 0.36, trotStride: 0.56 };

export const REGISTRY = [
  { def: PICKER, build: buildPicker, Controller: TinyController },
  { def: VIN, build: buildVin, Controller: TinyController },
  { def: AA, build: buildAA, Controller: TinyController },
  { def: LOCKE, build: buildLocke, Controller: TinyController },
  { def: REX, build: buildRex, Controller: TinyController },
  { def: BUDDY, build: buildBuddy, Controller: DogController, GLBController: DogRigController },
  { def: BULLY, build: buildBully, Controller: HumanController, GLBController: HumanRigController, glbExtra: bullyGLBExtra },
  { def: MRODD, build: buildMrOdd, Controller: HumanController, GLBController: HumanRigController, glbExtra: mroddGLBExtra },
];

export function registerCharacter(entry) { REGISTRY.push(entry); }

/** Loads every character (GLB if present in assets/, else procedural). */
export async function loadCast(opts) {
  const cast = {};
  if (opts?.tryGLB !== false) await loadTinyKit(opts?.assetBase);
  for (const e of REGISTRY) cast[e.def.id] = await loadCharacter(e.def, e.build, e.def.kind === "tiny" && hasKit() ? TinyRigController : e.Controller, { ...opts, GLBController: e.GLBController, glbExtra: e.glbExtra });
  return cast;
}
