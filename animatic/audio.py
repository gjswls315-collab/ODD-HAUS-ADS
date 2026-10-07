#!/usr/bin/env python3
"""ODD HAUS 50s animatic score + sound design, synthesized from scratch.

Reads the `audio` block of spec/timeline.json (beds, music parts, sfx cues) and
writes a 48 kHz stereo WAV. Everything is procedural (Karplus-Strong plucks,
additive e-piano, synthetic drums/foley) so the animatic has temp sound that
already hits every story beat; replace with the composer's track later.

  python3 animatic/audio.py   # -> renders/odd_haus_score.wav
"""
import argparse
import json
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
rng = np.random.default_rng(2026)


def db(x):
    return 10 ** (x / 20)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}
NOTE.update({"Db": 1, "Eb": 3, "Gb": 6, "Ab": 8, "Bb": 10})


def hz(name):
    """'D4' / 'Bb2' -> Hz."""
    pitch, octave = name[:-1], int(name[-1])
    return midi(12 * (octave + 1) + NOTE[pitch])


def tt(n):
    return np.arange(n) / SR


# ------------------------------------------------------------------ filters
def fft_filter(x, lo=None, hi=None, order=2):
    """Zero-phase Butterworth-shaped band filter applied in the frequency domain."""
    n = len(x)
    if n < 8:
        return x
    X = np.fft.rfft(x, 2 * n)
    f = np.fft.rfftfreq(2 * n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g)[:n]


def env_ad(n, attack, decay):
    t = tt(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def tail(x, fade=0.02):
    k = min(len(x), int(fade * SR))
    if k > 0:
        x[-k:] *= np.linspace(1, 0, k)
    return x


# -------------------------------------------------------------- instruments
def pluck(f, dur, damp=0.996, bright=0.5):
    """Karplus-Strong string, block-vectorized."""
    n = int(dur * SR)
    p = max(2, int(SR / f))
    out = np.zeros(n + p + 1)
    burst = rng.uniform(-1, 1, p)
    for _ in range(int((1 - bright) * 6)):
        burst = 0.5 * (burst + np.roll(burst, 1))
    out[:p] = burst
    i = p
    while i < n:
        k = min(p, n - i)
        a = out[i - p:i - p + k]
        b = out[i - p - 1:i - p - 1 + k] if i - p - 1 >= 0 else np.concatenate([[0], out[:k - 1]])
        out[i:i + k] = damp * 0.5 * (a + b)
        i += k
    return tail(out[:n] * 0.6)


def epiano(f, dur, vel=1.0, detune=0.0):
    n = int(dur * SR)
    t = tt(n)
    ff = f * (1 + detune)
    s = (np.sin(2 * np.pi * ff * t) * np.exp(-t / 2.2)
         + 0.28 * np.sin(2 * np.pi * 2 * ff * t) * np.exp(-t / 0.9)
         + 0.07 * np.sin(2 * np.pi * 3 * ff * t) * np.exp(-t / 0.45)
         + 0.10 * np.sin(2 * np.pi * 7.1 * ff * t) * np.exp(-t / 0.06))
    s *= np.clip(t / 0.004, 0, 1) * (1 + 0.10 * np.sin(2 * np.pi * 4.3 * t))
    return tail(s * vel * 0.25, 0.12)


def pad_chord(notes, dur, attack=0.35, vel=1.0):
    """Sustained e-piano chord with slow attack, slightly detuned for width -> (L, R)."""
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for k, nm in enumerate(notes):
        f = hz(nm)
        L += epiano(f, dur, vel, detune=-0.0015 * (k % 2))
        R += epiano(f, dur, vel, detune=0.0015 * ((k + 1) % 2))
    a = np.clip(tt(n) / attack, 0, 1) ** 1.5
    sus = 0.55 + 0.45 * np.exp(-tt(n) / 2.5)
    return L * a / sus.max() * sus, R * a / sus.max() * sus


def bass(f, dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    return tail(s * env_ad(n, 0.008, 0.9) * vel * 0.5, 0.05)


def bell(f, dur=1.6, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
            for r, a, d in ((1, 1, 1.1), (2.0, 0.35, 0.6), (2.76, 0.25, 0.35), (5.4, 0.12, 0.15)))
    return tail(s * np.clip(t / 0.002, 0, 1) * vel * 0.18)


def drone(f, dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = np.zeros(n)
    for h in range(1, 14):
        s += np.sin(2 * np.pi * f * h * (1 + 0.0007 * h) * t + rng.uniform(0, 6)) / h ** 1.35
    s *= 1 + 0.15 * np.sin(2 * np.pi * 0.23 * t)
    return fft_filter(s, hi=900) * vel * 0.2


def kick(vel=1.0):
    n = int(0.45 * SR)
    t = tt(n)
    f = 44 + 80 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    s[:96] += rng.uniform(-0.3, 0.3, 96)
    return s * vel * 0.9


def snare(vel=1.0):
    n = int(0.3 * SR)
    t = tt(n)
    noise = fft_filter(rng.normal(0, 1, n), lo=1200, hi=5500) * np.exp(-t / 0.09)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06)
    return (noise * 0.5 + tone * 0.6) * vel * 0.55


def hat(vel=1.0):
    n = int(0.06 * SR)
    return fft_filter(rng.normal(0, 1, n), lo=7000) * np.exp(-tt(n) / 0.018) * vel * 0.25


def dist_guitar(notes_times, total, gain=6.0):
    """notes_times: [(t_rel, note, dur)] -> overdriven KS lead."""
    out = np.zeros(int(total * SR) + SR)
    for t0, nm, d in notes_times:
        s = 0
        for chord_note in nm.split("+"):
            s = s + pluck(hz(chord_note), d, damp=0.998, bright=0.8)
        i = int(t0 * SR)
        out[i:i + len(s)] += s
    out = np.tanh(out * gain) * 0.35
    return fft_filter(out, lo=90, hi=4200)[:int(total * SR)]


# --------------------------------------------------------------------- foley
def noise_burst(dur, lo=None, hi=None, decay=0.05, attack=0.001):
    n = int(dur * SR)
    return fft_filter(rng.normal(0, 1, n), lo, hi) * env_ad(n, attack, decay)


def layer(*sigs):
    """Sum signals of different lengths (zero-padded)."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[:len(x)] += x
    return out


def thump(f0, f1, dur, decay):
    n = int(dur * SR)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.004, decay)


def creak(dur, f_lo=600, f_hi=1500, rate=(28, 70)):
    n = int(dur * SR)
    t = tt(n)
    rate_t = rate[0] + (rate[1] - rate[0]) * np.sin(np.pi * t / dur) ** 2
    phase = np.cumsum(rate_t) / SR
    pulses = np.zeros(n)
    idx = np.nonzero(np.diff(np.floor(phase)) > 0)[0]
    pulses[idx] = rng.uniform(0.5, 1.0, len(idx))
    s = fft_filter(pulses, lo=f_lo, hi=f_hi, order=3)
    return s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * t / dur) ** 0.5


def sfx_signal(cue):
    kind = cue["sfx"]
    if kind == "tiny_steps":
        d = cue.get("dur", 2.0)
        out = np.zeros(int(d * SR))
        t = 0.0
        while t < d - 0.05:
            b = noise_burst(0.02, lo=2500, hi=7000, decay=0.004) * rng.uniform(0.4, 1.0)
            i = int(t * SR)
            out[i:i + len(b)] += b
            t += rng.uniform(0.07, 0.14)
        return out * 0.35, 0.0, 0.15
    if kind == "footstep":
        s = layer(thump(80, 48, 0.6, 0.16) * 0.8, noise_burst(0.3, lo=70, hi=700, decay=0.06) * 0.8)
        if cue.get("distant"):
            s = fft_filter(s, hi=260)
            return s, 0.0, 0.45
        return s, 0.0, 0.2
    if kind == "blip":
        n = int(0.09 * SR)
        t = tt(n)
        f = np.where(t < 0.045, 1320, 990)
        s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
        return fft_filter(s, hi=3500) * env_ad(n, 0.002, 0.06) * 0.25, -0.15, 0.1
    if kind == "exhale":
        n = int(0.9 * SR)
        s = fft_filter(rng.normal(0, 1, n), lo=400, hi=2200) * np.sin(np.pi * tt(n) / 0.9) ** 2
        return s * 0.12, 0.0, 0.2
    if kind == "jingle":
        out = np.zeros(int(0.5 * SR))
        for k in range(3):
            i = int(rng.uniform(0, 0.12) * SR)
            b = bell(rng.uniform(2300, 3200), 0.35, 0.5)
            out[i:i + len(b)] += b[:len(out) - i]
        return out, 0.2, 0.15
    if kind == "creak":
        return creak(0.75, 380, 1100) * 0.35, 0.3, 0.35
    if kind == "door_creak":
        return creak(1.1, 260, 900, (18, 45)) * 0.3, 0.0, 0.3
    if kind == "thud":
        s = layer(thump(100, 48, 1.0, 0.3) * 1.0, noise_burst(0.4, lo=80, hi=900, decay=0.08) * 1.1)
        return s, 0.0, 0.25
    if kind == "whoosh":
        n = int(0.5 * SR)
        s = fft_filter(rng.normal(0, 1, n), lo=500, hi=4000) * np.sin(np.pi * tt(n) / 0.5) ** 2
        return s * 0.12, -0.2, 0.1
    if kind == "heartbeat":
        d = cue.get("dur", 4.0)
        out = np.zeros(int(d * SR))
        t = 0.0
        while t < d - 0.4:
            for off, v in ((0, 1.0), (0.17, 0.7)):
                b = layer(thump(85, 55, 0.25, 0.07), noise_burst(0.08, lo=120, hi=900, decay=0.02) * 0.5) * v
                i = int((t + off) * SR)
                out[i:i + len(b)] += b
            t += 60 / 72
        ramp = np.linspace(0.5, 1.0, len(out))
        return out * ramp * 0.7, 0.0, 0.05
    if kind == "switch":
        s = noise_burst(0.01, lo=1500, decay=0.0015) * 1.0
        s2 = noise_burst(0.01, lo=2500, decay=0.001) * 0.6
        out = np.zeros(int(0.06 * SR))
        out[:len(s)] += s
        out[int(0.028 * SR):int(0.028 * SR) + len(s2)] += s2
        return out * 0.8, 0.25, 0.25
    if kind == "key":
        out = noise_burst(0.02, lo=2000, decay=0.002) * 0.7
        out = np.concatenate([out, np.zeros(int(0.3 * SR))])
        b = bell(3400, 0.3, 0.35)
        out[int(0.05 * SR):int(0.05 * SR) + len(b)] += b[:len(out) - int(0.05 * SR)]
        return out, 0.0, 0.2
    if kind == "whoosh_warm":
        n = int(1.4 * SR)
        s = fft_filter(rng.normal(0, 1, n), lo=150, hi=1800) * np.sin(np.pi * tt(n) / 1.4) ** 3
        return s * 0.16, 0.0, 0.5
    if kind == "chime":
        out = np.zeros(int(1.6 * SR))
        for k, nm in enumerate(["C6", "E6", "G6", "C7"]):
            b = bell(hz(nm), 1.2, 0.45)
            i = int(k * 0.055 * SR)
            out[i:i + len(b)] += b[:len(out) - i]
        return out, 0.15, 0.5
    if kind == "needle_drop":
        s = thump(80, 50, 0.25, 0.05) * 0.5
        n = int(0.35 * SR)
        t = tt(n)
        scratch = np.sin(2 * np.pi * np.cumsum(900 + 1200 * np.sin(np.pi * t / 0.35)) / SR)
        scratch = fft_filter(scratch * rng.normal(0.6, 0.4, n), lo=600, hi=5000) * np.sin(np.pi * t / 0.35) * 0.18
        out = np.zeros(n)
        out[:len(s)] += s
        out += scratch
        return out, -0.1, 0.15
    if kind == "chess_clack":
        s = layer(noise_burst(0.05, lo=900, hi=3500, decay=0.008) * 0.9, thump(950, 900, 0.05, 0.01) * 0.3)
        return s, 0.1, 0.3
    if kind == "strum":
        out = np.zeros(int(1.8 * SR))
        for k, nm in enumerate(["F2", "C3", "F3", "A3", "C4", "F4"]):
            p = pluck(hz(nm), 1.6, damp=0.997, bright=0.7)
            i = int(k * 0.014 * SR)
            out[i:i + len(p)] += p[:len(out) - i]
        return out * 0.7, 0.2, 0.3
    if kind == "flop":
        s = layer(thump(90, 55, 0.3, 0.06) * 0.5, noise_burst(0.3, lo=200, hi=2500, decay=0.08, attack=0.01) * 0.25)
        return s, -0.1, 0.2
    if kind == "logo_boom":
        s = thump(70, 45, 2.0, 0.7) * 0.6
        return s, 0.0, 0.4
    raise ValueError(f"unknown sfx {kind}")


# --------------------------------------------------------------------- mixer
class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.send = np.zeros(self.n)

    def add(self, sig, t, gain=1.0, pan=0.0, verb=0.15, right=None):
        i = int(round(t * SR))
        if i >= self.n:
            return
        sig = np.asarray(sig)[: self.n - i] * gain
        r = sig if right is None else np.asarray(right)[: self.n - i] * gain
        gl = np.cos((pan + 1) * np.pi / 4)
        gr = np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(sig)] += sig * gl * 1.41
        self.R[i:i + len(r)] += r * gr * 1.41
        self.send[i:i + len(sig)] += 0.5 * (sig + r) * verb

    def reverb(self, seconds=1.8):
        n = int(seconds * SR)
        t = tt(n)
        out = []
        for seed in (1, 2):
            g = np.random.default_rng(seed)
            ir = g.normal(0, 1, n) * np.exp(-t / (seconds / 6.9))
            ir = fft_filter(ir, hi=5000)
            ir[: int(0.018 * SR)] = 0
            ir /= np.sqrt((ir ** 2).sum())
            m = len(self.send) + n
            size = 1 << (m - 1).bit_length()
            y = np.fft.irfft(np.fft.rfft(self.send, size) * np.fft.rfft(ir, size), size)[: self.n]
            out.append(y * 0.9)
        self.L += out[0]
        self.R += out[1]


def window_cut(sig, t0, t1, at):
    """Trim a part generated to start at `at` so it ends at t1 with a short fade."""
    keep = int((t1 - at) * SR)
    sig = sig[:keep].copy()
    return tail(sig, 0.03)


# ------------------------------------------------------------- music parts
def part_low_note(mix, p):
    mix.add(epiano(hz("D2"), 4.0, 1.0), p["t0"], db(-8), 0, 0.5)
    mix.add(epiano(hz("A2"), 3.4, 0.5), p["t0"] + 0.6, db(-14), 0.1, 0.5)


SNEAK_MEL = ["D4", None, "F4", "E4", "D4", None, "A3", None,
             "D4", None, "F4", "G4", "G#4", "A4", None, "F4"]
SNEAK_BASS = ["D2", "D2", "A1", "A1", "Bb1", "Bb1", "A1", "A1"]


def part_sneak(mix, p):
    step = 60 / 104 / 2
    t = p["t0"]
    k = 0
    while t < p["t1"] - 0.05:
        m = SNEAK_MEL[k % 16]
        if m:
            mix.add(pluck(hz(m), 0.5, damp=0.985, bright=0.55), t, db(-11), -0.25, 0.25)
        if k % 2 == 0:
            mix.add(pluck(hz(SNEAK_BASS[(k // 2) % 8]), 0.6, damp=0.99, bright=0.45), t, db(-11), 0.1, 0.1)
        if k % 4 == 2:
            mix.add(hat(0.5), t, db(-14), 0.4, 0.05)
        t += step
        k += 1


def part_hold(mix, p):
    d = p["t1"] - p["t0"]
    s = drone(hz("D2"), d + 0.5) + 0.6 * drone(hz("A2"), d + 0.5)
    s = window_cut(s * np.clip(tt(len(s)) / 0.8, 0, 1), p["t0"], p["t1"], p["t0"])
    mix.add(s, p["t0"], db(-6), 0, 0.3)


def part_sneak_tail(mix, p):
    for dt, m in ((0.0, "A3"), (0.29, "D4"), (0.75, "F4")):
        mix.add(pluck(hz(m), 0.8, damp=0.992, bright=0.5), p["t0"] + dt, db(-11), -0.2, 0.3)


BUDDY_CHORDS = [(15.0, ["F3", "A3", "C4", "E4"]), (17.4, ["D3", "F3", "A3", "C4"]),
                (19.0, ["Bb2", "D3", "F3", "A3"]), (20.6, ["C3", "E3", "G3", "C4"])]


def part_buddy(mix, p):
    rest = p.get("rest", [0, 0])
    step = 0.4
    for (c0, notes), nxt in zip(BUDDY_CHORDS, BUDDY_CHORDS[1:] + [(p["t1"], None)]):
        t = c0
        k = 0
        while t < nxt[0] - 0.01:
            if not (rest[0] <= t < rest[1]):
                mix.add(pluck(hz(notes[k % 4]), 1.6, damp=0.997, bright=0.55), t, db(-12), 0.2 if k % 2 else -0.2, 0.35)
                if k % 4 == 0:
                    mix.add(bass(hz(notes[0]) / 2, 1.5, 0.8), t, db(-14), 0, 0.1)
            t += step
            k += 1


RIFF = [(0.00, "D3", 0.2), (0.11, "F3", 0.2), (0.22, "G3", 0.2), (0.33, "G#3", 0.2), (0.44, "A3", 0.3),
        (0.66, "C4", 0.2), (0.77, "D4", 0.4), (1.10, "D3+A3+D4", 0.7)]


def part_riff(mix, p):
    s = dist_guitar(RIFF, p["t1"] - p["t0"] + 0.4)
    mix.add(s, p["t0"], db(-7), 0.15, 0.2)


def part_groove_hip(mix, p):
    beat = 0.8
    t0 = p["t0"]
    for b in range(7):
        t = t0 + b * beat
        if t >= p["t1"]:
            break
        if b % 4 in (0, 2):
            mix.add(kick(), t, db(-9), 0, 0.05)
        if b % 4 == 1 and t + beat / 2 < p["t1"]:
            mix.add(kick(0.7), t + beat / 2, db(-11), 0, 0.05)
        if b % 2 == 1:
            mix.add(snare(), t, db(-9), 0.05, 0.2)
        for h in range(2):
            th = t + h * beat / 2 + (0.05 if h else 0)
            if th < p["t1"]:
                mix.add(hat(0.8 if h == 0 else 0.5), th, db(-12), 0.35, 0.05)
        root = ["D2", "D2", "F2", "G2", "D2", "D2", "C2"][b]
        mix.add(window_cut(bass(hz(root), 0.75), t, min(t + 0.75, p["t1"]), t), t, db(-9), 0, 0.05)
    lick = dist_guitar([(0.0, "A3", 0.15), (0.12, "C4", 0.15), (0.24, "D4", 0.3), (0.6, "D3+A3+D4", 0.5)], 1.4)
    mix.add(lick, 27.4, db(-9), 0.15, 0.2)
    stab = dist_guitar([(0.0, "F3+C4+F4", 0.6)], 0.9)
    mix.add(stab, 28.6, db(-11), -0.1, 0.25)


def part_drone(mix, p):
    d = p["t1"] - p["t0"]
    s = drone(hz("D2"), d) + 0.7 * drone(hz("A2"), d) + 0.25 * drone(hz("Eb3"), d)
    t = tt(len(s))
    swell = np.clip(t / 1.0, 0, 1) * (0.55 + 0.45 * np.clip((t - 3.0) / 2.8, 0, 1) ** 2)
    s = s * swell
    cut = int((35.9 - p["t0"]) * SR)
    s[cut:] = 0
    s[cut - int(0.03 * SR):cut] *= np.linspace(1, 0, int(0.03 * SR))
    mix.add(s, p["t0"], db(-3), 0, 0.3)
    high = np.sin(2 * np.pi * hz("Eb5") * t) * np.clip((t - 2.5) / 3.0, 0, 1) * 0.04
    high[cut:] = 0
    mix.add(high, p["t0"], 1.0, 0.3, 0.6)


def part_swell(mix, p):
    L, R = pad_chord(["F2", "C3", "E3", "G3", "A3"], p["t1"] - p["t0"] + 1.0, attack=0.5)
    mix.add(window_cut(L, p["t0"], p["t1"], p["t0"]), p["t0"], db(-5), 0, 0.45,
            right=window_cut(R, p["t0"], p["t1"], p["t0"]))


def part_musicbox(mix, p):
    seq = ["A5", "C6", "F6", "E6", "C6", "A5", "G5", "C6", "F6", "A6", "G6", "E6", "F6", "C6", "A5", "F5", "E5", "F5"]
    t = p["t0"]
    for k, nm in enumerate(seq):
        if t >= p["t1"]:
            break
        mix.add(bell(hz(nm), 1.4, 0.9), t, db(-6), 0.3 * np.sin(k), 0.55)
        t += 0.2


LOFI = [(40.2, "Bb1", ["Bb2", "D3", "F3", "A3"]), (42.0, "G1", ["G2", "Bb2", "D3", "F3", "A3"]),
        (43.6, "A1", ["A2", "C3", "E3", "G3"]), (44.4, "Bb1", ["Bb2", "D3", "F3", "A3"]),
        (45.2, "C2", ["C3", "F3", "Bb3", "D4"]), (46.0, "F1", ["F2", "A2", "C3", "E3", "G3"]),
        (47.6, "D2", ["D3", "F3", "A3", "C4", "E4"])]


def part_lofi(mix, p):
    edges = [c[0] for c in LOFI[1:]] + [p["t1"]]
    for (t0, root, notes), t1 in zip(LOFI, edges):
        d = t1 - t0
        L, R = pad_chord(notes, d + 1.2, attack=0.03, vel=0.9)
        L = fft_filter(L, hi=3800)
        R = fft_filter(R, hi=3800)
        mix.add(window_cut(L, t0, t1 + 0.25, t0), t0, db(-6), 0, 0.3, right=window_cut(R, t0, t1 + 0.25, t0))
        mix.add(window_cut(bass(hz(root), d + 0.3), t0, t1, t0), t0, db(-9), 0, 0.05)
    beat = 0.8
    d0 = p["drums_from"]
    for b in range(8):
        t = d0 + b * beat
        if t >= p["t1"] - 0.01:
            break
        soft = 0.75 if t >= 46.0 else 1.0
        if b % 4 in (0, 2):
            mix.add(kick(soft), t, db(-10), 0, 0.05)
        if b % 4 == 1:
            mix.add(kick(0.6 * soft), t + 0.4, db(-12), 0, 0.05)
        if b % 2 == 1:
            mix.add(fft_filter(snare(soft), hi=4500), t, db(-10), 0.05, 0.25)
        for h in range(2):
            th = t + h * 0.4 + (0.06 if h else 0)
            if th < p["t1"]:
                mix.add(fft_filter(hat(0.7 if h == 0 else 0.45), hi=9000), th, db(-14), 0.35, 0.05)


def part_logo_chord(mix, p):
    d = p["t1"] - p["t0"] + 1.5
    L, R = pad_chord(["F1", "F2", "C3", "E3", "G3", "A3", "C4"], d, attack=0.01, vel=1.0)
    fade = np.ones(len(L))
    k0 = int((p["t1"] - p["t0"] - 0.45) * SR)
    fade[k0:] = np.clip(1 - (np.arange(len(L) - k0)) / (0.45 * SR), 0, 1)
    mix.add(L * fade, p["t0"], db(-4), 0, 0.5, right=R * fade)
    for k, nm in enumerate(["C6", "F6", "A6"]):
        mix.add(bell(hz(nm), 1.5, 0.6) * fade[:int(1.5 * SR)], p["t0"] + 0.08 * k, db(-10), 0.2 * (k - 1), 0.6)


# ------------------------------------------------------------------- beds
def bed_signal(b, n):
    kind = b["bed"]
    t = tt(n)
    if kind == "room":
        return fft_filter(np.cumsum(rng.normal(0, 1, n)) * 0.01, lo=60, hi=400) * 3
    if kind == "rain":
        s = fft_filter(rng.normal(0, 1, n), lo=900, hi=7000) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t))
        drops = np.zeros(n)
        idx = rng.integers(0, n, int(n / SR * 25))
        drops[idx] = rng.uniform(0.5, 2.0, len(idx))
        return s + fft_filter(drops, lo=1500, hi=6000) * 3
    if kind == "clock":
        out = np.zeros(n)
        for k in range(int(n / SR)):
            c = layer(noise_burst(0.03, lo=1800, hi=5000, decay=0.004), bell(2200 if k % 2 else 1900, 0.05, 0.3)[: int(0.03 * SR)])
            i = int(k * SR)
            out[i:i + len(c)] += c[: max(0, n - i)]
        return out * 2.5
    if kind == "crackle":
        out = np.zeros(n)
        idx = rng.integers(0, n, int(n / SR * 35))
        out[idx] = rng.pareto(2.5, len(idx)) * rng.choice([-1, 1], len(idx))
        hiss = rng.normal(0, 0.04, n)
        return fft_filter(out + hiss, lo=700, hi=9000) * 2
    raise ValueError(kind)


IMPULSIVE_BEDS = {"clock", "crackle"}


def bed_level(sig, kind, gain_db):
    """Continuous beds: gain_db is the target RMS (dBFS). Impulsive beds: target peak."""
    if kind in IMPULSIVE_BEDS:
        return sig / (np.abs(sig).max() + 1e-9) * db(gain_db)
    return sig / (np.sqrt(np.mean(sig ** 2)) + 1e-9) * db(gain_db)


def limiter(st, ceiling=db(-1.0), release=0.12, blk=64):
    """Look-ahead block peak limiter: instant attack, exponential release."""
    a = np.abs(st).max(1)
    nb = len(a) // blk + 1
    bm = np.pad(a, (0, nb * blk - len(a))).reshape(nb, blk).max(1)
    bm = np.maximum(bm, np.roll(bm, -1))
    target = np.minimum(1.0, ceiling / np.maximum(bm, 1e-9))
    rel = np.exp(-blk / (release * SR))
    g = np.empty(nb)
    cur = 1.0
    for i, v in enumerate(target):
        cur = v if v < cur else cur * rel + v * (1 - rel)
        g[i] = cur
    gain = np.interp(np.arange(len(a)), np.arange(nb) * blk, g)
    return st * gain[:, None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "renders/odd_haus_score.wav"))
    args = ap.parse_args()
    tl = json.loads((ROOT / "spec/timeline.json").read_text())
    au = tl["audio"]
    dur = tl["meta"]["duration"]
    mix = Mix(dur)

    for b in au["beds"]:
        n = int((b["t1"] - b["t0"]) * SR)
        s = bed_level(bed_signal(b, n), b["bed"], b["gain_db"])
        fo = b.get("fade_out", 0.3)
        k = int(fo * SR)
        s[-k:] *= np.linspace(1, 0, k)
        s[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
        mix.add(s, b["t0"], 1.0, 0.0, 0.05, right=np.roll(s, 977))

    for p in au["music"]:
        globals()[f"part_{p['part']}"](mix, p)

    for c in au["sfx"]:
        sig, pan, verb = sfx_signal(c)
        mix.add(sig, c["t"], db(c.get("gain_db", -10)), pan, verb)

    mix.reverb()
    st = np.stack([mix.L, mix.R], 1)
    st = fft_filter(st[:, 0], lo=45, order=3), fft_filter(st[:, 1], lo=45, order=3)
    st = np.stack(st, 1)
    st *= db(au.get("master_rms_db", -19)) / np.sqrt(np.mean(st ** 2))
    st = limiter(st)
    st = np.tanh(st / db(-0.5)) * db(-0.5)
    fade = int(0.08 * SR)
    st[:fade] *= np.linspace(0, 1, fade)[:, None]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())

    print("per-scene RMS (dBFS):")
    for sc in tl["scenes"]:
        seg = st[int(sc["start"] * SR):int(sc["end"] * SR)]
        print(f"  {sc['id']} {sc['start']:5.1f}-{sc['end']:5.1f}s  {20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9):6.1f}")
    print("->", out)


if __name__ == "__main__":
    main()
