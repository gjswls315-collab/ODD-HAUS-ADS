"""Cue sheet for "The Early Shift": sections on a tempo grid, every gag beat a named hit.
Writes ../timeline.json, read by the picture (src/film.js) and the score (score/score.py)."""
import json, pathlib

def grid(t0, bpm):
    beat = 60.0 / bpm
    return lambda n: round(t0 + n * beat, 4)

B = grid(8.0, 144)    # Hurry
C = grid(23.6, 112)   # Agitato
D = grid(28.8, 120)   # Foxtrot (the record)

T = {
    "dur": 47.6,
    "fps": 24,
    "sections": [
        {"id": "A", "name": "Misterioso", "t0": 0.0, "t1": 8.0, "bpm": 72},
        {"id": "B", "name": "Hurry", "t0": 8.0, "t1": 21.0, "bpm": 144},
        {"id": "W", "name": "Wait", "t0": 21.0, "t1": 23.6},
        {"id": "C", "name": "Agitato", "t0": 23.6, "t1": C(7), "bpm": 112},
        {"id": "S", "name": "Silence", "t0": C(7), "t1": 28.8},
        {"id": "D", "name": "Foxtrot", "t0": 28.8, "t1": 40.8, "bpm": 120},
        {"id": "E", "name": "Finale", "t0": 40.8, "t1": 44.85, "bpm": 120},
    ],
    "shots": [
        {"id": "C0", "t0": 0.0, "t1": 4.2, "card": "question"},
        {"id": "S1", "t0": 4.2, "t1": 8.0, "crank": 16, "sepia": 0.12, "str": 0.55},
        {"id": "S2", "t0": 8.0, "t1": 14.5, "crank": 20, "sepia": 0.1, "str": 0.75, "speed": 1.25},
        {"id": "S3", "t0": 14.5, "t1": 21.0, "crank": 20, "sepia": 0.1, "str": 0.8, "speed": 1.3},
        {"id": "C2", "t0": 21.0, "t1": 23.6, "card": "needle"},
        {"id": "S4", "t0": 23.6, "t1": 31.0, "crank": 16, "sepia": 0.12, "str": 0.6},
        {"id": "S5", "t0": 31.0, "t1": 35.6, "crank": 16, "sepia": 0.34, "str": 0.3},
        {"id": "S6", "t0": 35.6, "t1": 40.8, "crank": 16, "sepia": 0.36, "str": 0.26},
        {"id": "C3", "t0": 40.8, "t1": 47.6, "card": "end"},
    ],
    "cards": {
        "question": {"ko": ["첫 곡은", "누가 틀까?"], "en": "Who plays the first record?", "level": 1},
        "needle": {"ko": ["이제, 바늘."], "en": "Now, the needle.", "level": 1, "heavy": True},
        "end": {"ko": ["오늘도 판은 돌아갑니다."], "en": "The record is already playing.", "level": 2, "logo": True},
    },
    "hits": {
        "lampClick": 0.15, "motorUp": 0.2, "curtainOpen": [0.1, 1.4], "musicIn": 1.0,
        "s1Look": 4.4, "s1Turn": 5.8, "s1Shrug": [6.4, 7.2], "s1Face": 7.5, "hurryPickup": B(-1),
        "flips": [B(n) for n in range(2, 10)], "reveal": B(10), "doubleTake": B(12), "backToSleeve": B(13),
        "irisSleeve": [13.5, 14.5],
        "push": B(16), "getaway": B(23), "plinthHop": B(26), "settle": B(30), "knees": B(30) + 0.15,
        "crouch": C(1), "hop": C(2), "land": C(3), "grab": C(5), "pushEnd": C(7),
        "nudge": 28.5, "needleDrop": 28.8, "themeIn": 28.8,
        "lamps": [D(5), D(6), D(7), D(8), D(10), D(12)],
        "danceBeats": [D(n) for n in range(14, 18)], "turnToUs": D(18), "irisHalf": [D(18), D(19)],
        "capTip": [D(19), D(21)], "irisShut": [D(23), D(24)],
        "burn": 44.8, "pianistStops": 44.85, "flap": [45.0, 46.6], "lampOff": 46.6, "curtainClose": [46.7, 47.5],
    },
}
pathlib.Path(__file__).resolve().parents[1].joinpath("timeline.json").write_text(json.dumps(T, indent=1, ensure_ascii=False))
print("timeline.json written; dur", T["dur"])
