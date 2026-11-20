"""Cue sheet for "The Early Shift" (v2): sections on a tempo grid, every gag beat a named hit.
Writes ../timeline.json, read by the picture (src/film.js) and the score (score/score.py)."""
import json, pathlib

def grid(t0, bpm):
    beat = 60.0 / bpm
    return lambda n: round(t0 + n * beat, 4)

K = grid(3.8, 132)    # Skate rag
L = grid(16.0, 84)    # Coffee blues
B = grid(26.6, 144)   # Hurry (crate digging)
D = grid(38.6, 120)   # Foxtrot (the record)

T = {
    "dur": 65.6,
    "fps": 24,
    "sections": [
        {"id": "A", "name": "Maestoso", "t0": 0.0, "t1": 3.8},
        {"id": "K", "name": "Skate rag", "t0": 3.8, "t1": 16.0, "bpm": 132},
        {"id": "L", "name": "Coffee blues", "t0": 16.0, "t1": 24.4, "bpm": 84},
        {"id": "P", "name": "Logo tag", "t0": 24.4, "t1": 26.6},
        {"id": "B", "name": "Hurry", "t0": 26.6, "t1": 33.6, "bpm": 144},
        {"id": "M", "name": "Misterioso", "t0": 33.6, "t1": 36.8, "bpm": 72},
        {"id": "S", "name": "Silence", "t0": 36.8, "t1": 38.6},
        {"id": "D", "name": "Foxtrot", "t0": 38.6, "t1": 58.6, "bpm": 120},
        {"id": "E", "name": "Finale", "t0": 58.6, "t1": 62.65, "bpm": 120},
    ],
    "shots": [
        {"id": "C0", "t0": 0.0, "t1": 3.8, "card": "oval"},
        {"id": "S1", "t0": 3.8, "t1": 11.0, "crank": 20, "sepia": 0.14, "str": 0.7, "speed": 1.25},
        {"id": "S2", "t0": 11.0, "t1": 16.0, "crank": 16, "sepia": 0.14, "str": 0.55},
        {"id": "S3", "t0": 16.0, "t1": 24.4, "crank": 16, "sepia": 0.18, "str": 0.45},
        {"id": "C1", "t0": 24.4, "t1": 26.6, "card": "peek"},
        {"id": "S4", "t0": 26.6, "t1": 33.6, "crank": 20, "sepia": 0.12, "str": 0.72, "speed": 1.25},
        {"id": "S5", "t0": 33.6, "t1": 41.0, "crank": 16, "sepia": 0.12, "str": 0.6},
        {"id": "S6", "t0": 41.0, "t1": 44.6, "crank": 16, "sepia": 0.34, "str": 0.3},
        {"id": "S7", "t0": 44.6, "t1": 52.6, "crank": 16, "sepia": 0.34, "str": 0.28},
        {"id": "S8", "t0": 52.6, "t1": 58.6, "crank": 16, "sepia": 0.36, "str": 0.25},
        {"id": "C3", "t0": 58.6, "t1": 65.6, "card": "sign"},
    ],
    "cards": {"oval": {"level": 1}, "peek": {"level": 2}, "sign": {"level": 2}},
    "hits": {
        "lampClick": 0.15, "motorUp": 0.2, "curtainOpen": [0.1, 1.4], "musicIn": 0.35,
        # S1 terrace
        "pushes": [K(1), K(4), K(7)], "ollie": K(10), "land": K(11), "carve": K(13), "doorsOpen": [9.4, 10.4], "inDoors": K(15),
        # S2 entrance
        "skid": K(19), "kickTail": K(21), "catch": K(21) + 0.1, "puff": K(23), "walkOff": [K(24), 16.0], "doorsClose": [13.6, 14.6],
        # S3 coffee
        "reach": L(1), "steam": [L(2), L(4)], "mugUp": L(4), "turnFront": L(5), "sip": [L(6), L(7)], "exhale": L(7),
        "peekPose": [L(8), L(10)], "irisPeek": [L(10), 24.4],
        # S4 crates
        "flips": [B(n) for n in range(2, 10)], "reveal": B(10), "doubleTake": B(12), "backToSleeve": B(13), "pull": [B(14), B(16)],
        # S5 turntable
        "placeDisc": [34.2, 34.9], "grabArm": 35.4, "armAcross": [35.6, 36.6], "release": 36.8, "nudge": 38.4, "needleDrop": 38.6, "themeIn": 38.6,
        # S6 the shop wakes
        "lamps": [D(5), D(6), D(7), D(8), D(10), D(11)],
        # S7 the toy only dances when he isn't looking
        "toyStart": D(12), "looks": [[D(15), D(17)], [D(19), D(20)], [D(21), D(24)]], "shrug": D(24), "bothNod": [D(25), 52.6],
        # S8 smoke ring
        "drag": D(29), "ring": [D(31), D(34)], "salute": [D(35), D(36.6)], "irisShut": [D(37), D(40)],
        # end
        "burn": D(48), "pianistStops": D(48) + 0.05, "flap": [62.8, 64.4], "lampOff": 64.4, "curtainClose": [64.5, 65.3],
    },
}
pathlib.Path(__file__).resolve().parents[1].joinpath("timeline.json").write_text(json.dumps(T, indent=1))
print("timeline.json written; dur", T["dur"], "burn", T["hits"]["burn"], "stop-time looks", T["hits"]["looks"])
