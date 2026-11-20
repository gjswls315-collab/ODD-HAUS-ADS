"""Photoplay score + projector for "The Early Shift" (v2).

Everything is synthesised (numpy only): a period upright piano (inharmonic partials, two slightly
detuned strings, felt hammer, two-stage decay, dampers) plays a cue sheet built from ../timeline.json,
so every gag hit lands on its frame. The projector in the booth is the only other sound.

    python3 score/score.py            -> out/mix.wav (48 kHz stereo) and out/cues.txt
"""
import json, math, pathlib, wave
import numpy as np

HERE = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((HERE / "timeline.json").read_text())
H = TL["hits"]
SR = 48000
DUR = TL["dur"] + 0.6
NS = int(SR * DUR)
rng = np.random.default_rng(1926)

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# ---------------------------------------------------------------------------
# filters (frequency domain; fine for offline work)
def fft_filter(x, gain_fn):
    n = len(x)
    X = np.fft.rfft(x, n * 2)
    f = np.fft.rfftfreq(n * 2, 1 / SR)
    return np.fft.irfft(X * gain_fn(f), n * 2)[:n]

def lowpass(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))

def highpass(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))

def bandpass(fc, q=1.0):
    return lambda f: 1 / np.sqrt(1 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2)

# ---------------------------------------------------------------------------
# the upright piano
def piano_note(m, vel, dur, damp=0.09):
    f0 = mtof(m)
    t_dec = float(np.clip(9.0 * 0.5 ** ((m - 33) / 13), 0.7, 9.0))  # undamped decay of the fundamental
    length = min(dur + damp * 6, dur + 1.2, t_dec * 1.6 + 0.2)
    n = int(SR * max(length, 0.08))
    t = np.arange(n) / SR
    npart = int(min(30, max(6, 7600 // f0)))
    B = float(np.clip(0.00018 * 2 ** ((m - 60) / 20), 0.00005, 0.004))
    strings = [0.0] if m < 34 else [-1.6, 1.9]                      # cents: a slightly honky upright
    sig = np.zeros(n)
    bright = 0.55 + 0.6 * vel
    for k in range(1, npart + 1):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 15000:
            break
        amp = (1 / k) ** (1.55 - 0.6 * vel) * (abs(np.sin(np.pi * k / 7.6)) * 0.85 + 0.15)
        amp *= np.exp(-max(0.0, fk - 4800) / (2600 * bright))
        tau = t_dec / (1 + 0.22 * (k - 1) + 0.0004 * fk)
        env = 0.62 * np.exp(-t / (tau * 0.2)) + 0.38 * np.exp(-t / tau)
        for c in strings:
            ph = rng.uniform(0, 2 * np.pi)
            sig += amp * env * np.sin(2 * np.pi * fk * 2 ** (c / 1200) * t + ph)
    sig /= len(strings)
    # felt hammer: a short thump + a little noise
    hn = int(SR * 0.012)
    hammer = rng.standard_normal(hn) * np.exp(-np.arange(hn) / (SR * 0.0025))
    hammer = fft_filter(hammer, lowpass(900 + 2600 * vel))
    sig[:hn] += hammer * 0.05 * vel
    # attack + dampers
    att = int(SR * 0.0025)
    sig[:att] *= np.linspace(0, 1, att)
    d0 = int(SR * dur)
    if d0 < n:
        sig[d0:] *= np.exp(-(np.arange(n - d0) / SR) / damp)
    return sig * (vel ** 1.4) * (1.0 + 0.25 * np.clip((60 - m) / 24, 0, 1))

L = np.zeros(NS)
R = np.zeros(NS)
CUES = []

def add(t, m, vel, dur, damp=0.09):
    s = piano_note(m, vel, dur, damp)
    i = int(round(t * SR))
    if i >= NS:
        return
    s = s[: NS - i]
    pan = float(np.clip((m - 60) / 50, -0.45, 0.45))
    L[i:i + len(s)] += s * np.sqrt(0.5 - pan / 2) * 1.414 * 0.5
    R[i:i + len(s)] += s * np.sqrt(0.5 + pan / 2) * 1.414 * 0.5

def chord(t, ms, vel, dur, roll=0.0, damp=0.09):
    for i, m in enumerate(sorted(ms)):
        add(t + i * roll, m, vel * (0.9 + 0.1 * rng.random()), dur - i * roll, damp)

def grace(t, mg, m, vel, dur=0.2):
    add(t - 0.055, mg, vel * 0.7, 0.05)
    add(t, m, vel, dur)

def cue(name, t):
    CUES.append((t, name))

# note names
NN = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
def n(s):
    name, octv = s[:-1], int(s[-1])
    return 12 * (octv + 1) + NN[name]

# ---------------------------------------------------------------------------
# the brand's motif: "Jeon de Ve-ro", four syllables, the last one held. It opens the film, tags the
# peek card and crowns the finale.
def jdv_motif(t0, beat, notes, chord_notes, vel=0.6, octave=True, roll=0.03):
    for (off, d), m in zip([(0, 0.5), (0.5, 0.25), (0.75, 0.25), (1.0, 1.75)], notes):
        add(t0 + off * beat, m, vel, d * beat * 0.95)
        if octave:
            add(t0 + off * beat, m - 12, vel * 0.7, d * beat * 0.95)
    chord(t0 + beat, chord_notes, vel * 0.85, 1.75 * beat, roll=roll)

def gliss(t0, t1, m0, m1, vel, white=True):
    """A piano glissando from m0 to m1 (white keys), spread evenly over [t0, t1]."""
    step = 1 if m1 > m0 else -1
    keys = [m for m in range(m0, m1 + step, step) if not white or (m % 12) in (0, 2, 4, 5, 7, 9, 11)]
    for j, m in enumerate(keys):
        add(t0 + (t1 - t0) * j / max(1, len(keys) - 1), m, vel * (0.8 + 0.2 * j / len(keys)), 0.07, 0.03)

def trill(t0, t1, m_a, m_b, vel0, vel1, rate=0.07):
    t, k = t0, 0
    while t < t1:
        u = (t - t0) / max(1e-6, t1 - t0)
        add(t, m_a if k % 2 == 0 else m_b, vel0 + (vel1 - vel0) * u, rate * 0.9, 0.03)
        t += rate; k += 1

# ---------------------------------------------------------------------------
# A · Maestoso under the title card (the oval mark): the motif in F, grandly, then a turn to C
chord(0.4, [n("F1"), n("F2"), n("C3"), n("A3"), n("C4"), n("F4")], 0.55, 1.0, roll=0.035)
cue("A maestoso: title", H["musicIn"])
jdv_motif(0.95, 0.55, [n("C5"), n("F5"), n("G5"), n("A5")], [n("F2"), n("A3"), n("C4"), n("F4")], 0.62)
for k, s_ in enumerate(["Bb4", "A4", "G4"]):
    add(2.55 + k * 0.16, n(s_), 0.5, 0.15)
chord(3.0, [n("G1"), n("G2"), n("B3"), n("D4"), n("F4")], 0.55, 0.4, roll=0.03)
for k, s_ in enumerate(["G4", "B4", "D5", "F5"]):                     # run-up into the rag
    add(3.36 + k * 0.105, n(s_), 0.42 + k * 0.05, 0.1)

# ---------------------------------------------------------------------------
# K · Skate rag (the terrace, the ollie, in through the doors; the skid and the catch), C major, 132 bpm
bK = 60 / 132
prog_rag = [("C2", "G1", ["E3", "G3", "C4"]), ("C2", "G1", ["E3", "G3", "C4"]), ("G1", "D2", ["F3", "B3", "D4"]), ("C2", "G1", ["E3", "G3", "C4"]),
            ("F1", "C2", ["F3", "A3", "C4"]), ("C2", "G1", ["E3", "G3", "C4"]), ("G1", "D2", ["F3", "B3", "D4"]), ("C2", "G1", ["E3", "G3", "C4"])]
def rag_bar(bt, bi, vel=0.5, mel=(), mel_vel=0.58, until=1e9, beats=range(4)):
    b1, b3, ch = prog_rag[bi % len(prog_rag)]
    for k in beats:
        tt = bt + k * bK
        if tt >= until - 0.02:
            break
        if k % 2 == 0:
            m = n(b1 if k == 0 else b3)
            add(tt, m, vel, bK * 0.8, 0.06); add(tt, m + 12, vel * 0.65, bK * 0.8, 0.06)
        else:
            chord(tt, [n(x) for x in ch], vel * 0.62, bK * 0.5, damp=0.05)
    for off, s_, d in mel:
        if bt + off * bK < until - 0.02:
            add(bt + off * bK, n(s_), mel_vel, d * bK * 0.9)
K0 = 3.8
kb = lambda i: K0 + i * 4 * bK
rag_bar(kb(0), 0, 0.48, [(0.5, "E5", .5), (1, "G5", .5), (1.5, "E5", .5), (2, "C6", .75), (2.75, "A5", .25), (3, "G5", .5), (3.5, "E5", .5)])
rag_bar(kb(1), 1, 0.5, [(0, "G5", .5), (0.5, "A5", .5), (1, "G5", .5), (1.5, "E5", .5), (2, "D5", .5), (2.5, "E5", .5), (3, "C5", .75), (3.75, "D#5", .25)])
for pt in H["pushes"]:                                                 # each push of the back foot: a low thump
    add(pt, n("C1"), 0.62, 0.14, 0.05); add(pt, n("C2"), 0.7, 0.14, 0.05); cue("push", pt)
rag_bar(kb(2), 2, 0.5, [(0, "E5", .25), (0.25, "F5", .25), (0.5, "G5", .5), (1, "B5", .5), (1.5, "D6", .5)], until=H["ollie"])
gliss(H["ollie"], H["land"] - 0.05, n("G5"), n("G7"), 0.5); cue("ollie (glissando)", H["ollie"])
chord(H["land"], [n("C2"), n("C3"), n("E4"), n("G4"), n("C5")], 0.82, 0.3, damp=0.05)
add(H["land"] + 0.09, n("G1"), 0.6, 0.35); cue("land (crash + boing)", H["land"])
rag_bar(kb(3), 3, 0.48, [(2, "E5", .5), (2.5, "G5", .5), (3, "C6", .5), (3.5, "G5", .5)], beats=[0, 2, 3])
gliss(H["carve"], H["carve"] + 0.42, n("C7"), n("C5"), 0.42); cue("carve (swoop)", H["carve"])
add(10.0, n("E7"), 0.3, 0.5); add(10.24, n("C7"), 0.28, 0.6); cue("shop door bell", 10.0)
rag_bar(kb(4), 4, 0.5, [(0, "A5", .5), (0.5, "C6", .5), (1, "F6", .75), (1.75, "E6", .25), (2, "D6", .5), (2.5, "C6", .5)], until=H["skid"])
trill(H["skid"], H["skid"] + 0.32, n("F6"), n("F#6"), 0.5, 0.3, 0.035); add(H["skid"], n("B6"), 0.35, 0.3)
add(H["skid"] + 0.34, n("C3"), 0.55, 0.12, 0.04); cue("skid (screech, then stop-time)", H["skid"])
add(H["kickTail"], n("C7"), 0.5, 0.06, 0.03); add(H["kickTail"], n("C2"), 0.55, 0.06, 0.03); cue("kick the tail (pop)", H["kickTail"])
chord(H["catch"], [n("C4"), n("E4"), n("G4"), n("C5"), n("E5")], 0.72, 0.22, damp=0.05); cue("catch (ta!)", H["catch"])
for k, s_ in enumerate(["G5", "E5", "C5"]):                            # the puff: a lazy sigh
    add(H["puff"] + k * 0.15, n(s_), 0.3 - k * 0.05, 0.16)
cue("puff", H["puff"])
rag_bar(kb(6), 6, 0.46, [(0, "G5", .5), (0.5, "E5", .5), (1, "D5", .5), (1.5, "C5", .5), (2, "B4", .5), (2.5, "D5", .5)], until=16.0)
cue("walk off (strut)", H["walkOff"][0])

# ---------------------------------------------------------------------------
# L · Coffee blues (espresso, the sip, the logo pose), F, 84 bpm, swung
bL = 60 / 84
L0 = 16.0
def sw(beat):                                                          # swung eighths: 2/3 + 1/3
    return math.floor(beat) + (2 / 3 if beat % 1 >= 0.5 else 0)
blues = [("F1", "C2", ["A3", "Eb4", "F4"]), ("Bb1", "F2", ["Ab3", "D4", "F4"]), ("F1", "C2", ["A3", "Eb4", "F4"])]
for bi, (b1, b3, ch) in enumerate(blues):
    for k in range(4):
        tt = L0 + (bi * 4 + k) * bL
        if tt >= 24.4 - 0.05:
            break
        if bi == 2 and k >= 2:                                         # last half bar: C7, the turnaround
            b1, b3, ch = "C2", "G1", ["Bb3", "E4", "G4"]
        if k % 2 == 0:
            m = n(b1 if k == 0 else b3); add(tt, m, 0.42, bL * 0.85, 0.08); add(tt, m + 12, 0.25, bL * 0.85, 0.08)
        else:
            chord(tt, [n(x) for x in ch], 0.3, bL * 0.45, damp=0.06)
lb = lambda beat: L0 + sw(beat) * bL
for b_, s_, d in [(1.0, "C5", .3), (1.5, "Eb5", .2), (2.0, "E5", 1.5)]:  # the reach: a blue-note pickup
    add(lb(b_), n(s_), 0.5, d * bL)
cue("reach", H["reach"])
trill(H["steam"][0], H["steam"][1], n("C7"), n("D7"), 0.1, 0.22, 0.06); cue("steam (high trill)", H["steam"][0])
chord(H["mugUp"], [n("Bb3"), n("D4"), n("Ab4"), n("F5")], 0.55, 0.5, roll=0.02); cue("mug up", H["mugUp"])
grace(H["turnFront"], n("E5"), n("F5"), 0.45, 0.4); cue("turn to us (grace)", H["turnFront"])
for k, s_ in enumerate(["C5", "C#5", "D5", "D#5", "E5", "F5"]):        # the sip: a slow slurp upward
    add(H["sip"][0] + k * (H["sip"][1] - H["sip"][0]) / 6, n(s_), 0.24 + 0.05 * k, 0.13)
cue("sip (slide)", H["sip"][0])
for k, s_ in enumerate(["Ab5", "G5", "F5", "Eb5", "C5"]):              # exhale: the blue sigh down
    add(H["exhale"] + k * 0.15, n(s_), 0.45 - 0.05 * k, 0.17)
cue("exhale (sigh)", H["exhale"])
p0, p1 = H["peekPose"]
for k, (a, b) in enumerate([("A4", "C5"), ("G4", "Bb4"), ("F4", "A4"), ("E4", "G4")]):   # sinking behind the bar, on tiptoe
    tt = p0 + k * (p1 - p0) / 4
    chord(tt, [n(a), n(b)], 0.36 - 0.04 * k, 0.12, damp=0.03)
grace(p1, n("E6"), n("F6"), 0.5, 0.25); cue("peek (plink)", p1)
i0, i1 = H["irisPeek"]
trill(i0 + 0.15, i1 - 0.1, n("A3"), n("Eb4"), 0.14, 0.26, 0.09)
for k, s_ in enumerate(["C5", "E5", "G5", "Bb5"]):
    add(i1 - 0.48 + k * 0.1, n(s_), 0.3 + 0.05 * k, 0.1)

# ---------------------------------------------------------------------------
# P · the peek card: the motif as a tag, in F
jdv_motif(24.45, 0.42, [n("C5"), n("F5"), n("G5"), n("A5")], [n("F2"), n("F3"), n("A3"), n("C4"), n("F4")], 0.66)
cue("P peek card: the motif (ta-da)", 24.45)
for k, s_ in enumerate(["E4", "F4", "G#4"]):                           # pickup into the Hurry (J-cut)
    add(26.6 - 0.3 + k * (60 / 144 / 3), n(s_), 0.5, 0.12)

# ---------------------------------------------------------------------------
# B · Hurry (crate digging; the reveal; the double take; the pull), 144 bpm stride, A minor
bB = 60 / 144
prog_hurry = [("A1", ["A3", "C4", "E4"]), ("E1", ["G#3", "B3", "D4"]), ("A1", ["A3", "C4", "E4"]), ("E1", ["G#3", "B3", "D4"]),
              ("D2", ["A3", "D4", "F4"]), ("A1", ["A3", "C4", "E4"]), ("E1", ["G#3", "B3", "D4"]), ("A1", ["A3", "C4", "E4"])]
def stride(t0, t1, beat, prog, vel=0.5, start=0):
    k = start
    t = t0
    while t < t1 - 1e-6:
        bass, ch = prog[(k // 2) % len(prog)]
        if k % 2 == 0:
            add(t, n(bass), vel * 1.05, beat * 0.8, 0.06)
            add(t, n(bass) + 12, vel * 0.7, beat * 0.8, 0.06)
        else:
            chord(t, [n(x) for x in ch], vel * 0.7, beat * 0.55, damp=0.05)
        k += 1
        t += beat
stride(26.6, H["reveal"], bB, prog_hurry, 0.5)
for f, s_ in zip(H["flips"], ["E5", "G5", "A5", "B5", "C6", "D6", "E6", "G6"]):
    add(f, n(s_), 0.6, 0.09, 0.04); cue("flip", f)                     # a plink on every flip
chord(H["reveal"], [n("A2"), n("E3"), n("A3"), n("C#4"), n("E4"), n("A4")], 0.85, 0.8, roll=0.025)
cue("reveal (rolled A major)", H["reveal"])
add(H["doubleTake"] - 0.06, n("D5"), 0.5, 0.05)
chord(H["doubleTake"], [n("C#2"), n("C#4"), n("E4"), n("G4"), n("Bb4")], 0.95, 0.28, damp=0.05)
cue("double take (sforzando)", H["doubleTake"])
grace(H["backToSleeve"], n("B4"), n("C5"), 0.4, 0.3); cue("back to the sleeve (grace)", H["backToSleeve"])
stride(H["backToSleeve"] + bB, 33.6, bB, prog_hurry, 0.5, start=2)
for k, s_ in enumerate(["A3", "C4", "E4", "A4", "C5", "E5", "A5"]):    # the pull: the sleeve rises
    add(H["pull"][0] + k * (H["pull"][1] - H["pull"][0]) / 7, n(s_), 0.45 + 0.04 * k, 0.12)
chord(H["pull"][1], [n("A4"), n("C#5"), n("E5"), n("A5")], 0.62, 0.35, roll=0.02); cue("pull (rising, ta)", H["pull"][1])

# ---------------------------------------------------------------------------
# M · Misterioso (the disc goes on, the arm swings across), D minor, 72 bpm
k = 0
t = 33.62
while t < H["release"] - 0.05:
    u = (t - 33.62) / (H["release"] - 33.62)
    add(t, n("D2") if k % 2 == 0 else n("A2"), 0.16 + 0.2 * u, 0.13, 0.04)
    t += 0.125; k += 1
cue("M misterioso", 33.6)
pd0, pd1 = H["placeDisc"]
for k, s_ in enumerate(["D6", "A5", "F5", "D5", "A4"]):                # lowering the disc
    add(pd0 + k * (pd1 - pd0) / 5, n(s_), 0.38 - 0.03 * k, 0.16)
add(pd1, n("D3"), 0.42, 0.1, 0.03); cue("disc lands", pd1)
grace(H["grabArm"], n("Bb5"), n("A5"), 0.42, 0.25); cue("grab the arm (grace)", H["grabArm"])
a0, a1 = H["armAcross"]
for k, s_ in enumerate(["A4", "Bb4", "B4", "C5", "C#5", "D5", "D#5", "E5"]):   # the arm creeps across
    tt = a0 + k * (H["release"] - a0) / 8
    add(tt, n(s_), 0.34 + 0.04 * k, 0.12, 0.04)
cue("SILENCE: the pianist stops", H["release"])

# ---------------------------------------------------------------------------
# D · Foxtrot (the needle drops; the shop wakes; the toy; the smoke ring), 120 bpm, F major
bD = 0.5
prog_fox = [("F1", "C2", ["A3", "C4", "F4"]), ("D2", "A1", ["F#3", "C4", "D4"]), ("G1", "D2", ["Bb3", "D4", "F4"]), ("C2", "G1", ["Bb3", "E4", "G4"]),
            ("F1", "C2", ["A3", "C4", "F4"]), ("F1", "C2", ["A3", "Eb4", "F4"]), ("Bb1", "F2", ["Bb3", "D4", "F4"]), ("C2", "G1", ["Bb3", "E4", "G4"]),
            ("F1", "C2", ["A3", "C4", "F4"]), ("D2", "A1", ["F#3", "C4", "D4"])]
theme = [
    [(0, "C5", 1.0), (1.5, "A4", 0.5), (2, "G4", 0.5), (2.5, "F4", 1.0), (3.5, "A4", 0.5)],
    [(0, "C5", 0.5), (0.5, "D5", 1.0), (1.5, "C5", 0.5), (2, "F#4", 1.5), (3.5, "A4", 0.5)],
    [(0, "Bb4", 1.0), (1, "G4", 0.5), (1.5, "Bb4", 0.5), (2, "D5", 1.0), (3, "C5", 1.0)],
    [(0, "Bb4", 0.5), (0.5, "A4", 0.5), (1, "G4", 1.0), (2, "E4", 1.0), (3, "C5", 1.0)],
    [(0, "C6", 1.0), (1.5, "A5", 0.5), (2, "G5", 0.5), (2.5, "F5", 1.0), (3.5, "A5", 0.5)],
    [(0, "C6", 0.5), (0.5, "Eb6", 1.0), (1.5, "C6", 0.5), (2, "A5", 1.5), (3.5, "F5", 0.5)],
]
def fox_bar(bar_t, bi, vel=0.5, melody=None, mel_vel=0.6, octave=False, up=0, stacc=1.0, until=1e9):
    b1, b3, ch = prog_fox[bi % len(prog_fox)]
    for k in range(4):
        tt = bar_t + k * bD
        if tt >= until - 0.02:
            break
        if k % 2 == 0:
            m = n(b1 if k == 0 else b3)
            add(tt, m, vel, bD * 0.85 * stacc, 0.06); add(tt, m + 12, vel * 0.6, bD * 0.85 * stacc, 0.06)
        else:
            chord(tt, [n(x) for x in ch], vel * 0.62, bD * 0.5 * stacc, damp=0.05)
    for off, s_, d in melody or []:
        tt = bar_t + off * bD
        if tt >= until - 0.02:
            continue
        add(tt, n(s_) + up, mel_vel, min(d, 0.45 if stacc < 1 else d) * bD * 0.95)
        if octave:
            add(tt, n(s_) + up - 12, mel_vel * 0.7, d * bD * 0.95)
d0 = H["themeIn"]
db = lambda i: d0 + i * 4 * bD
add(d0, n("C5"), 0.32, 0.6); cue("needle drop: the theme", d0)        # the first sound after the silence
fox_bar(db(0), 0, 0.42, theme[0], 0.55)
fox_bar(db(1), 1, 0.48, theme[1], 0.6)
fox_bar(db(2), 2, 0.52, theme[2], 0.64)
for i, tl in enumerate(H["lamps"]):                                    # each lamp catches with a high ting
    add(tl, n(["C7", "E7", "G7", "C8", "E7", "G7"][i]), 0.35, 0.3)
    add(tl + 0.03, n(["G6", "C7", "E7", "G7", "C7", "E7"][i]), 0.25, 0.3)
    cue("lamp", tl)
# the toy dances to a tiptoe version of the theme, up an octave, staccato …
fox_bar(db(3), 3, 0.4, theme[3], 0.55, up=12, stacc=0.5); cue("toy starts dancing", H["toyStart"])
fox_bar(db(4), 4, 0.4, theme[0], 0.55, up=12, stacc=0.5)
fox_bar(db(5), 5, 0.4, theme[1], 0.55, up=12, stacc=0.5)
fox_bar(db(6), 6, 0.5, theme[4], 0.62)                                 # … both nod along (from bothNod: see the gate)
fox_bar(db(7), 7, 0.4, theme[5], 0.5)
fox_bar(db(8), 8, 0.32, None)
fox_bar(db(9), 9, 0.32, None)
# … and stops dead whenever he looks: stop-time (the gate), a clunk on each look
looks = [list(w) for w in H["looks"]]
looks[-1][1] = H["bothNod"][0]                                         # the last look holds through the shrug
tt_ = np.arange(NS) / SR
gate = np.ones(NS)
for a, b in looks:
    gate *= 1 - np.clip((tt_ - a) / 0.012, 0, 1) * np.clip((b - tt_) / 0.012, 0, 1)
L *= gate; R *= gate
for a, b in H["looks"]:
    chord(a, [n("C2"), n("F#5"), n("C6")], 0.6, 0.09, damp=0.03); cue("he looks: clunk, stop-time", a)
add(H["shrug"] + 0.05, n("C6"), 0.45, 0.15); add(H["shrug"] + 0.4, n("C3"), 0.5, 0.35); cue("shrug: plink … plonk", H["shrug"])
cue("both nod: the theme again", H["bothNod"][0])
# S8: the drag, the smoke ring (an arpeggio that grows with it), the salute, the iris
add(H["drag"], n("F2"), 0.35, 0.9); add(H["drag"] + 0.1, n("C3"), 0.25, 0.8); cue("drag", H["drag"])
r0, r1 = H["ring"]
arp = ["F3", "A3", "C4", "E4", "F4", "A4", "C5", "E5", "F5", "A5", "C6", "E6", "F6"]
for k, s_ in enumerate(arp):
    add(r0 + k * (r1 - r0) / len(arp), n(s_), 0.3 + 0.3 * k / len(arp), 0.9 - 0.04 * k)
cue("smoke ring (arpeggio)", r0)
s0, s1 = H["salute"]
grace(s0, n("E6"), n("F6"), 0.55, 0.2)
chord(s0 + 0.3, [n("F4"), n("A4"), n("C5"), n("F5")], 0.55, 0.6, roll=0.04); cue("salute (grace, rolled)", s0)
for k, s_ in enumerate(["E5", "Eb5", "D5", "Db5", "C5", "B4", "Bb4", "A4"]):   # the iris closes
    add(H["irisShut"][0] + k * 0.18, n(s_), 0.32 - 0.02 * k, 0.16)

# ---------------------------------------------------------------------------
# E · Finale under the sign card: the motif, then the theme in octaves; it breaks off when the print burns
jdv_motif(58.62, 0.5, [n("C5"), n("F5"), n("G5"), n("A5")], [n("F2"), n("C3"), n("A3"), n("C4"), n("F4")], 0.72)
fox_bar(58.6, 0, 0.6, None, until=60.6)
cue("E finale: the motif", 58.62)
fox_bar(60.6, 0, 0.62, theme[0], 0.8, octave=True)
fox_bar(62.6, 1, 0.66, theme[1], 0.84, octave=True, until=H["pianistStops"] - 0.0)
chord(H["pianistStops"], [n("C3"), n("C#4"), n("D4"), n("G4")], 0.6, 0.12, damp=0.04)   # the pianist stops dead
cue("the print burns: piano breaks off", H["pianistStops"])
cut = int(H["pianistStops"] * SR) + int(0.14 * SR)
fade = np.exp(-np.arange(NS - cut) / (SR * 0.05))
L[cut:] *= fade; R[cut:] *= fade

# ---------------------------------------------------------------------------
# the projector in the booth
t = np.arange(NS) / SR
proj = np.zeros(NS)
motor = np.clip((t - H["motorUp"]) / 1.0, 0, 1) * (t < H["lampOff"]) + np.clip(1 - (t - H["lampOff"]) / 0.8, 0, 1) * (t >= H["lampOff"])
speed = np.where(t < H["lampOff"], np.clip((t - H["motorUp"]) / 1.0, 0.05, 1), np.clip(1 - (t - H["lampOff"]) / 0.8, 0, 1))
hum_phase = 2 * np.pi * np.cumsum(50 * speed) / SR
proj += motor * (0.25 * np.sin(2 * hum_phase + 0.4) + 0.2 * np.sin(3 * hum_phase + 1.1) + 0.12 * np.sin(5 * hum_phase)) * 0.012
claw_rate = 24 * speed
claw_ph = np.cumsum(claw_rate) / SR
film_running = (t > H["motorUp"]) & (t < H["burn"] + 0.1)
ticks = np.zeros(NS)
idx = np.nonzero(np.diff(np.floor(claw_ph)) > 0)[0]
for i in idx:
    if film_running[i]:
        ticks[i] = 0.6 + 0.4 * rng.random()
click = rng.standard_normal(int(SR * 0.006)) * np.exp(-np.arange(int(SR * 0.006)) / (SR * 0.0012))
claw = np.convolve(ticks, click)[:NS]
claw = fft_filter(claw, bandpass(1700, 0.8))
hiss = fft_filter(rng.standard_normal(NS), bandpass(900, 0.5)) * 0.012
proj += claw * 0.11 + hiss * motor
# louder in the silence, quieter under the music
level = np.full(NS, 0.55)
level += 0.4 * ((t > H["release"]) & (t < H["themeIn"] + 0.3))
for a_, b_ in H["looks"]:
    level += 0.25 * ((t > a_) & (t < b_))
level += 0.6 * (t < H["musicIn"])
level += 0.7 * (t > H["burn"])
level = fft_filter(level, lowpass(3))
proj *= level
# lamp clicks, film flapping on the take-up reel
def burst(at, dur_s, fc, q, gain, decay):
    m = int(SR * dur_s)
    b = rng.standard_normal(m) * np.exp(-np.arange(m) / (SR * decay))
    b = fft_filter(b, bandpass(fc, q))
    i = int(at * SR)
    proj[i:i + m] += b[: max(0, min(m, NS - i))] * gain
burst(H["lampClick"], 0.05, 2600, 2.0, 0.5, 0.006); burst(H["lampClick"] + 0.004, 0.03, 600, 1.0, 0.3, 0.004)
burst(H["lampOff"], 0.05, 2400, 2.0, 0.5, 0.006); burst(H["lampOff"] + 0.004, 0.03, 600, 1.0, 0.3, 0.004)
tf = H["flap"][0]
while tf < H["flap"][1]:
    u = (tf - H["flap"][0]) / (H["flap"][1] - H["flap"][0])
    burst(tf, 0.03, 800, 0.9, 0.22 * (1 - 0.4 * u), 0.006)
    tf += 1 / (11 - 6 * u)

# ---------------------------------------------------------------------------
# room, compression, mix
def room_ir(sec=1.4, decay=3.2):
    m = int(SR * sec)
    e = np.exp(-np.arange(m) / (SR * sec / decay))
    ir = rng.standard_normal(m) * e
    ir = fft_filter(ir, lowpass(4500))
    ir[: int(SR * 0.012)] *= np.linspace(0, 1, int(SR * 0.012))
    return ir / np.sqrt(np.sum(ir ** 2))

def convolve(x, ir):
    nfft = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]

def compress(x, thresh=0.25, ratio=2.5, win=0.01):
    w = int(SR * win)
    p = np.convolve(x ** 2, np.ones(w) / w, mode="same")
    rms = np.sqrt(p) + 1e-9
    gain = np.where(rms > thresh, (thresh + (rms - thresh) / ratio) / rms, 1.0)
    gain = np.convolve(gain, np.ones(w) / w, mode="same")
    return x * gain

irL, irR = room_ir(), room_ir()
mono = (L + R) / 2
pk = np.max(np.abs(mono)) + 1e-9
Lp, Rp = L / pk, R / pk
Lp = compress(Lp, 0.22, 2.2); Rp = compress(Rp, 0.22, 2.2)
wetL, wetR = convolve(Lp, irL) * 0.24, convolve(Rp, irR) * 0.24
piano_L = fft_filter(Lp + wetL, highpass(45)) ; piano_R = fft_filter(Rp + wetR, highpass(45))
proj = fft_filter(proj, highpass(90))
proj_wet = convolve(proj, irL) * 0.08
outL = piano_L * 0.8 + (proj + proj_wet) * 0.55
outR = piano_R * 0.8 + (proj * 0.92 + proj_wet) * 0.55
peak = max(np.max(np.abs(outL)), np.max(np.abs(outR)))
outL, outR = outL / peak * 0.89, outR / peak * 0.89
(HERE / "out").mkdir(exist_ok=True)
pcm = (np.stack([outL, outR], 1) * 32767).astype(np.int16)
with wave.open(str(HERE / "out" / "mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
(HERE / "out" / "cues.txt").write_text("\n".join(f"{t:7.3f}  {name}" for t, name in sorted(CUES)) + "\n")
print(f"mix.wav {DUR:.1f}s, {len(CUES)} cues")
