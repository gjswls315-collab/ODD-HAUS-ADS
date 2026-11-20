"""Photoplay score + projector for "The Early Shift".

Everything is synthesised (numpy only): a period upright piano (inharmonic partials, two slightly
detuned strings, felt hammer, two-stage decay, dampers) plays a cue sheet built from ../timeline.json,
so every gag hit lands on its frame. The projector in the booth is the only other sound.

    python3 score/score.py            -> out/mix.wav (48 kHz stereo) and out/cues.txt
"""
import json, pathlib, wave
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
# A · Misterioso (question card, the figure by the silent turntable), 72 bpm, D minor
bA = 60 / 72
for k in range(int(2.9 / 0.125)):                                    # low tremolo under the card
    tt = H["musicIn"] + k * 0.125
    v = 0.18 + 0.14 * np.sin(np.pi * k / 23)
    add(tt, n("D2") if k % 2 == 0 else n("A2"), v, 0.14, 0.05)
for tt, s_, d in [(1.6, "A4", 0.4), (2.0, "F4", 0.4), (2.4, "E4", 0.4), (2.8, "D4", 0.7), (3.5, "F4", 0.5)]:
    add(tt, n(s_), 0.42, d)                                          # the theme, minor and hushed
chord(3.92, [n("E2"), n("B2"), n("D3"), n("G#3")], 0.4, 0.9, roll=0.05)   # the question hangs
cue("A in", H["musicIn"])
for k, s_ in enumerate(["D2", "Eb2", "E2", "F2"]):                    # sneaking bass, chromatic creep
    add(4.25 + k * bA, n(s_), 0.5, 0.18, 0.04)
    add(4.25 + k * bA + bA / 2, n(s_) + 12, 0.28, 0.12, 0.04)
grace(H["s1Look"], n("A5"), n("Bb5"), 0.45, 0.25); cue("look", H["s1Look"])
add(H["s1Turn"], n("D5"), 0.45, 0.1); add(H["s1Turn"] + 0.09, n("F5"), 0.5, 0.18); cue("turn", H["s1Turn"])
add(H["s1Shrug"][0] + 0.05, n("C6"), 0.45, 0.15); add(H["s1Shrug"][0] + 0.55, n("C3"), 0.5, 0.35); cue("shrug: plink … plonk", H["s1Shrug"][0])
for k, s_ in enumerate(["E4", "F4", "G#4"]):                           # pickup into the Hurry (J-cut over the shot change)
    add(H["hurryPickup"] + k * (60 / 144 / 3), n(s_), 0.55, 0.12)

# ---------------------------------------------------------------------------
# B · Hurry (digging, the disc gets away), 144 bpm stride, A minor
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
stride(8.0, H["reveal"], bB, prog_hurry, 0.5)
flip_notes = ["E5", "G5", "A5", "B5", "C6", "D6", "E6", "G6"]
for f, s_ in zip(H["flips"], flip_notes):
    add(f, n(s_), 0.6, 0.09, 0.04)                                   # a plink on every flip
    cue("flip", f)
chord(H["reveal"], [n("A2"), n("E3"), n("A3"), n("C#4"), n("E4"), n("A4")], 0.85, 1.0, roll=0.025)   # the reveal: rolled A major
cue("reveal (rolled chord)", H["reveal"])
add(H["doubleTake"] - 0.06, n("D5"), 0.5, 0.05)
chord(H["doubleTake"], [n("C#2"), n("C#4"), n("E4"), n("G4"), n("Bb4")], 0.95, 0.28, damp=0.05)   # diminished sforzando
cue("double take (sforzando)", H["doubleTake"])
grace(H["backToSleeve"], n("B4"), n("C5"), 0.4, 0.3); cue("back to the sleeve (grace)", H["backToSleeve"])
for k, s_ in enumerate(["E5", "D#5", "D5", "C#5", "C5", "B4", "A#4", "A4"]):   # the iris closes: a soft chromatic slide
    add(H["irisSleeve"][0] + k * 0.12, n(s_), 0.32 - k * 0.02, 0.14)
# S3: the push (stride resumes), the getaway, the hop, the wobble, the settle
stride(H["push"], H["plinthHop"], bB, prog_hurry, 0.55)
k = 0
t = H["push"]
while t < H["getaway"] - 0.01:                                       # strained rising three-note push, each beat
    for j, s_ in enumerate(["C5", "D5", "E5"]):
        add(t + j * bB / 3, n(s_) + (k % 2) * 2, 0.4 + 0.02 * k, bB / 3 * 0.8, 0.04)
    k += 1
    t += bB
for j in range(14):                                                  # upward glissando: it gets away
    add(H["getaway"] + j * 0.022, n("A4") + [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 24][j], 0.5 + j * 0.02, 0.06, 0.03)
cue("getaway (glissando)", H["getaway"])
run = ["E6", "D6", "C6", "B5", "A5", "B5", "C6", "D6", "E6", "F6", "E6", "D6", "C6", "B5", "A5", "G#5"]
for j, s_ in enumerate(run):                                         # Hurry run while he chases
    tt = H["getaway"] + 0.36 + j * bB / 2
    if tt < H["plinthHop"] - 0.02:
        add(tt, n(s_), 0.55, bB / 2 * 0.8, 0.04)
add(H["plinthHop"], n("A1"), 0.75, 0.2); add(H["plinthHop"] + 0.08, n("A2"), 0.65, 0.3)   # low boing
cue("onto the plinth (boing)", H["plinthHop"])
t = H["plinthHop"] + 0.1
k = 0
while t < H["settle"] - 0.05:                                        # nervous trill, speeding up, fading
    u = (t - H["plinthHop"]) / (H["settle"] - H["plinthHop"])
    add(t, n("E5") if k % 2 == 0 else n("F5"), 0.42 * (1 - 0.6 * u), 0.07, 0.03)
    t += 0.085 * (1 - 0.55 * u)
    k += 1
add(H["settle"], n("E6"), 0.5, 0.25); add(H["settle"] + bB, n("A1"), 0.6, 0.6)   # plink … plonk
cue("settle (plink … plonk)", H["settle"])

# ---------------------------------------------------------------------------
# the wait under "Now, the needle." — a swelling diminished tremolo
w0, w1 = 21.05, 23.55
k = 0
t = w0
while t < w1:
    u = (t - w0) / (w1 - w0)
    ms = [n("B2"), n("F3")] if k % 2 == 0 else [n("D3"), n("Ab3")]
    chord(t, ms, 0.12 + 0.4 * u * u, 0.1, damp=0.05)
    t += 0.09
    k += 1

# ---------------------------------------------------------------------------
# C · Agitato (onto the plinth, dragging the arm), 112 bpm
bC = 60 / 112
c0, c1 = 23.6, H["pushEnd"]
k = 0
t = c0
while t < c1 - 0.01:                                                 # low octave tremolo, rising
    u = (t - c0) / (c1 - c0)
    add(t, n("D2") if k % 2 == 0 else n("D3"), 0.25 + 0.35 * u, 0.07, 0.03)
    t += 0.0667
    k += 1
chord(H["crouch"], [n("C2"), n("Db2"), n("D2")], 0.35, 0.3, damp=0.05); cue("crouch", H["crouch"])
for j in range(8):
    add(H["hop"] + j * 0.03, n("D4") + [0, 2, 3, 5, 7, 9, 10, 12][j], 0.45 + j * 0.03, 0.06, 0.03)
cue("hop (glissando)", H["hop"])
add(H["land"], n("D2"), 0.7, 0.18); add(H["land"] + 0.08, n("D3"), 0.6, 0.25); cue("land (boing)", H["land"])
for j, s_ in enumerate(["D4", "Eb4", "E4", "F4", "F#4", "G4", "G#4", "A4"]):
    tt = H["land"] + 0.12 + j * bC / 2 * 0.95
    if tt < H["grab"] - 0.05:
        add(tt, n(s_), 0.5, 0.1, 0.04)
chord(H["grab"], [n("D3"), n("F3"), n("A3"), n("C4"), n("F4")], 0.7, 0.5, roll=0.03); cue("grab (rolled chord)", H["grab"])
for j, s_ in enumerate(["A4", "Bb4", "B4", "C5", "C#5", "D5", "D#5", "E5"]):
    tt = H["grab"] + 0.12 + j * bC / 2 * 0.9
    if tt < c1 - 0.06:
        add(tt, n(s_), 0.5 + j * 0.04, 0.12, 0.04)
cue("SILENCE: the pianist stops", c1)

# ---------------------------------------------------------------------------
# D · Foxtrot (the record plays, the shop wakes), 120 bpm, F major; E · Finale
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
def fox_bar(bar_t, bi, vel=0.5, melody=None, mel_vel=0.6, octave=False):
    b1, b3, ch = prog_fox[bi % len(prog_fox)]
    for k in range(4):
        tt = bar_t + k * bD
        if k % 2 == 0:
            m = n(b1 if k == 0 else b3)
            add(tt, m, vel, bD * 0.85, 0.06); add(tt, m + 12, vel * 0.6, bD * 0.85, 0.06)
        else:
            chord(tt, [n(x) for x in ch], vel * 0.62, bD * 0.5, damp=0.05)
    if melody:
        for off, s_, d in melody:
            add(bar_t + off * bD, n(s_), mel_vel, d * bD * 0.95)
            if octave:
                add(bar_t + off * bD, n(s_) - 12, mel_vel * 0.7, d * bD * 0.95)

d0 = H["themeIn"]
add(d0, n("C5"), 0.32, 0.6)                                          # the needle finds the groove: the first sound after the silence
cue("needle drop: the theme", d0)
for bi in range(6):
    bt = d0 + bi * 2.0
    mel = theme[bi] if bi < 6 else None
    ramp = min(1.0, 0.72 + bi * 0.1)
    if bi == 4:                                                      # the cap tip bar: leave a hole for the turn
        mel = [x for x in theme[4] if bt + x[0] * bD < H["turnToUs"] - 0.05]
    fox_bar(bt, bi, 0.42 * ramp + 0.12, mel, 0.55 * ramp + 0.12)
for i, tl in enumerate(H["lamps"]):                                  # each lamp catches with a high ting
    add(tl, n(["C7", "E7", "G7", "C8", "E7", "G7"][i]), 0.35, 0.3)
    add(tl + 0.03, n(["G6", "C7", "E7", "G7", "C7", "E7"][i]), 0.25, 0.3)
    cue("lamp", tl)
grace(H["turnToUs"], n("E6"), n("F6"), 0.55, 0.2); cue("turn to us (grace)", H["turnToUs"])
chord(H["capTip"][0] + 0.5, [n("F5"), n("A5"), n("C6"), n("F6")], 0.55, 0.7, roll=0.04); cue("cap tip (rolled)", H["capTip"][0] + 0.5)
# Finale under the end card: the theme in octaves, louder; breaks off when the print burns
fox_bar(40.8, 0, 0.62, theme[0], 0.8, octave=True)
fox_bar(42.8, 1, 0.66, [x for x in theme[1] if 42.8 + x[0] * bD < H["pianistStops"] - 0.1], 0.84, octave=True)
chord(H["pianistStops"], [n("C3"), n("C#4"), n("D4"), n("G4")], 0.6, 0.12, damp=0.04)   # the pianist stops dead
cue("the print burns: piano breaks off", H["pianistStops"])
# cut anything still sounding at the break
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
level += 0.4 * ((t > H["pushEnd"]) & (t < H["themeIn"] + 0.3))
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
