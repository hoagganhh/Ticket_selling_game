"""Generate the game's original short UI sounds using only synthesized waves."""

from pathlib import Path
import math
import random
import struct
import wave


RATE = 22050
DEST = Path(__file__).resolve().parents[1] / "frontend" / "assets" / "sfx"
DEST.mkdir(parents=True, exist_ok=True)


def note(t, start, length, pitch, amplitude, decay=3.2):
    age = t - start
    if age < 0 or age >= length:
        return 0.0
    attack = min(1.0, age / 0.012)
    envelope = attack * (1 - age / length) ** decay
    shimmer = math.sin(2 * math.pi * pitch * age) + 0.18 * math.sin(2 * math.pi * pitch * 2 * age)
    return amplitude * envelope * shimmer


def make(name, duration, notes, snap=0.0):
    rng = random.Random(41973)
    frames = []
    for index in range(int(duration * RATE)):
        t = index / RATE
        sample = sum(note(t, *part) for part in notes)
        if snap:
            sample += snap * math.exp(-t * 75) * (rng.random() * 2 - 1)
        sample = math.tanh(sample) * 0.68
        frames.append(struct.pack("<h", int(sample * 32767)))
    with wave.open(str(DEST / f"{name}.wav"), "wb") as sound:
        sound.setnchannels(1)
        sound.setsampwidth(2)
        sound.setframerate(RATE)
        sound.writeframes(b"".join(frames))


make("click", 0.12, [(0, 0.11, 740, 0.65, 5), (0.018, 0.07, 1046, 0.22, 4)], 0.16)
make("handoff", 0.62, [(0, 0.33, 660, 0.56, 2.1), (0.14, 0.35, 990, 0.55, 2), (0.27, 0.31, 1320, 0.42, 1.7)])
make("success", 0.30, [(0, 0.20, 523, 0.46, 2.1), (0.095, 0.19, 784, 0.47, 2)])
make("bad", 0.27, [(0, 0.25, 210, 0.51, 1.7), (0.08, 0.18, 165, 0.34, 2.2)], 0.06)
