// Character registry: definition + procedural builder + animation controller.
import { loadCharacter, TinyController } from "./base.js";
import { BUDDY, buildBuddy, DogController } from "./buddy.js";
import { BULLY, buildBully } from "./bully.js";
import { MRODD, buildMrOdd } from "./mrodd.js";
import { HumanController } from "./human.js";
import { VIN, buildVin, PICKER, buildPicker, AA, buildAA, LOCKE, buildLocke, REX, buildRex } from "./tiny.js";

export const REGISTRY = [
  { def: PICKER, build: buildPicker, Controller: TinyController },
  { def: VIN, build: buildVin, Controller: TinyController },
  { def: AA, build: buildAA, Controller: TinyController },
  { def: LOCKE, build: buildLocke, Controller: TinyController },
  { def: REX, build: buildRex, Controller: TinyController },
  { def: BUDDY, build: buildBuddy, Controller: DogController },
  { def: BULLY, build: buildBully, Controller: HumanController },
  { def: MRODD, build: buildMrOdd, Controller: HumanController },
];

export function registerCharacter(entry) { REGISTRY.push(entry); }

/** Loads every character (GLB if present in assets/, else procedural). */
export async function loadCast(opts) {
  const cast = {};
  for (const e of REGISTRY) cast[e.def.id] = await loadCharacter(e.def, e.build, e.Controller, opts);
  return cast;
}
