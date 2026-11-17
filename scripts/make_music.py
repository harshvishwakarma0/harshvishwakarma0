"""Render the generative lofi from harshdev0.com into a real audio file.

Faithful port of the portfolio's Web Audio engine:
  72 BPM, 4-bar chord loop, triangle pads with +/-6 cent detune, sine bass,
  sine arps, 808 kick, noise snare/hats, filtered noise bed, convolution reverb.
"""
import math
import os
import numpy as np

SR = 44100
BPM = 72
BEAT = 60.0 / BPM
BAR = BEAT * 4
BARS = 9
DURATION = BAR * BARS + 2.0
N = int(DURATION * SR)

CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]

dry = np.zeros(N, dtype=np.float64)
send = np.zeros(N, dtype=np.float64)

rng = np.random.default_rng(20261117)
noise = rng.uniform(-1.0, 1.0, int(3.0 * SR))


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def add(sig, start, gain=1.0, reverb=0.0):
    s = int(start * SR)
    if s >= N or s < 0:
        return
    e = min(N, s + len(sig))
    seg = sig[: e - s] * gain
    dry[s:e] += seg
    if reverb:
        send[s:e] += seg * reverb


def one_pole(x, cutoff):
    a = 1.0 - math.exp(-2.0 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - one_pole(x, cutoff)


def lin(t, points):
    return np.interp(t, [p[0] for p in points], [p[1] for p in points])


def exp_env(t, t0, v0, t1, v1):
    out = np.full_like(t, v1)
    if t1 <= t0:
        return out
    m = (t >= t0) & (t <= t1)
    out[m] = v0 * np.exp(np.log(v1 / v0) * (t[m] - t0) / (t1 - t0))
    out[t > t1] = v1
    return out


def tone(freq, dur, kind="sine", detune_cents=0):
    t = np.arange(int(dur * SR)) / SR
    f = freq * 2.0 ** (detune_cents / 1200.0)
    if kind == "triangle":
        return 2.0 / math.pi * np.arcsin(np.sin(2 * math.pi * f * t))
    if kind == "saw":
        return 2.0 * (f * t % 1.0) - 1.0
    return np.sin(2 * math.pi * f * t)


def pad(note, start, dur, level=0.07):
    s = BAR * 0.92
    for det in (-6, 6):
        f = mtof(note)
        t = np.arange(int((s + 0.5) * SR)) / SR
        sig = tone(f, s + 0.5, "triangle", det)
        sig = one_pole(sig, 1800)
        env = lin(t, [(0, 1e-4), (0.45, level), (s * 0.6, level * 0.8), (s + 0.4, 1e-4)])
        add(sig * env, start, 1.0, 0.25)


def bass(note, start, dur):
    f = mtof(note)
    t = np.arange(int(dur * SR)) / SR
    sig = one_pole(tone(f, dur), 400)
    env = exp_env(t, 0.02, 0.28, dur, 1e-4)
    add(sig * env, start)


def arp(note, start, level=0.1, dur=0.9):
    f = mtof(note)
    t = np.arange(int(dur * SR)) / SR
    sig = one_pole(tone(f, dur), 2600)
    env = exp_env(t, 0.01, level, dur, 1e-4)
    add(sig * env, start, 1.0, 0.35)


def kick(start):
    dur = 0.3
    t = np.arange(int(dur * SR)) / SR
    f = 140.0 * np.exp(np.log(45.0 / 140.0) * np.clip(t / 0.18, 0, 1))
    sig = np.sin(2 * math.pi * np.cumsum(f) / SR)
    env = exp_env(t, 0, 0.6, 0.28, 1e-4)
    add(sig * env, start)


def noise_hit(start, dur, cutoff_hp, cutoff_lp, level, reverb=0.0, bandpass=False):
    s = int(start * SR)
    length = int(dur * SR)
    seg = noise[s % (len(noise) - length) :][:length].copy()
    if bandpass:
        seg = highpass(seg, cutoff_hp)
        seg = one_pole(seg, cutoff_lp)
    else:
        seg = highpass(seg, cutoff_hp)
    t = np.arange(length) / SR
    env = exp_env(t, 0, level, dur, 1e-4)
    add(seg * env, start, 1.0, reverb)


# filtered noise bed
bed_source = np.tile(noise, int(math.ceil(N / len(noise))))[:N]
bed = one_pole(highpass(bed_source, 900), 4200) * 0.02
dry += bed

for bar_i in range(BARS):
    t0 = bar_i * BAR
    chord = CHORDS[bar_i % len(CHORDS)]
    for note in chord:
        pad(note, t0 + (CHORDS.index(chord) % 4) * 0.01, BAR * 0.92)
    root = chord[0] - 12
    bass(root, t0, BEAT * 1.6)
    bass(root + (7 if bar_i % 2 == 0 else 0), t0 + BEAT * 2, BEAT * 1.6)
    for g, note in enumerate([chord[1], chord[3], chord[2], chord[3]]):
        arp(note + 12, t0 + g * BEAT * 0.75 + 0.02)
    arp(chord[(bar_i * 3) % len(chord)] + 14, t0 + BEAT * 2.5, 0.07)
    for off in (0, BEAT * 2, BEAT * 3.5):
        kick(t0 + off)
    for off in (BEAT, BEAT * 3):
        noise_hit(t0 + off, 0.2, 1800, 3000, 0.2, 0.3, True)
    for m in range(8):
        off = m * BEAT * 0.5 + (0.02 if m % 2 else 0)
        noise_hit(t0 + off, 0.06, 7000, 20000, 0.065 if m % 2 else 0.045)

# convolution reverb (1.6s noise IR, decay exponent 2.6)
ir_len = int(1.6 * SR)
t = np.arange(ir_len) / SR
ir = rng.uniform(-1, 1, ir_len) * (1 - t / 1.6) ** 2.6
wet = np.fft.irfft(np.fft.rfft(send, N + ir_len) * np.fft.rfft(ir, N + ir_len), N + ir_len)[:N] * 0.32

mix = one_pole(dry + wet, 7200)
mix *= 0.8
mix = np.tanh(mix * 1.2) * 0.85
peak = np.max(np.abs(mix))
if peak > 0.95:
    mix *= 0.95 / peak

out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(out_dir, exist_ok=True)
wav_path = os.path.join(out_dir, "lofi-music.wav")
mp3_path = os.path.join(out_dir, "lofi-music.mp3")

pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with open(wav_path, "wb") as f:
    f.write(b"RIFF" + (36 + len(pcm) * 2).to_bytes(4, "little") + b"WAVEfmt "
            + (16).to_bytes(4, "little") + (1).to_bytes(2, "little")
            + (1).to_bytes(2, "little") + SR.to_bytes(4, "little")
            + (SR * 2).to_bytes(4, "little") + (2).to_bytes(2, "little")
            + (16).to_bytes(2, "little") + b"data" + (len(pcm) * 2).to_bytes(4, "little")
            + pcm.tobytes())

try:
    import subprocess
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                    "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path], check=True)
    os.remove(wav_path)
    final = mp3_path
except Exception:
    final = wav_path

print("Wrote", os.path.basename(final), os.path.getsize(final), "bytes", round(DURATION, 1), "seconds")
