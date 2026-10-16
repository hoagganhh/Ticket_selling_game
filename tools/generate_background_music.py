"""Compose the game's original instrumental loop from synthesized tones.

No recordings, samples, MIDI files, or third-party melodies are used.
"""

from array import array
from math import cos, exp, pi, sin
from pathlib import Path
from random import Random
import wave

SAMPLE_RATE = 22050
BPM = 110
BEAT = 60 / BPM
BAR = BEAT * 4
LENGTH = BAR * 8
COUNT = round(LENGTH * SAMPLE_RATE)
samples = array("f", [0.0]) * COUNT
rng = Random(2026)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def tone(note, start_beat, duration_beats, volume, kind="bell"):
    start = round(start_beat * BEAT * SAMPLE_RATE)
    count = round(duration_beats * BEAT * SAMPLE_RATE)
    hz = frequency(note)
    for step in range(min(count, COUNT - start)):
        age = step / SAMPLE_RATE
        progress = step / count
        attack = min(1.0, age / 0.018)
        release = min(1.0, (1 - progress) / 0.16)
        if kind == "pad":
            envelope = attack * release * (0.65 + 0.35 * sin(pi * progress))
            timbre = sin(2 * pi * hz * age) + 0.18 * sin(2 * pi * hz * 2 * age)
        elif kind == "bass":
            envelope = attack * release * exp(-1.4 * progress)
            timbre = sin(2 * pi * hz * age) + 0.12 * sin(2 * pi * hz * 2 * age)
        else:
            envelope = attack * release * exp(-3.2 * progress)
            timbre = (sin(2 * pi * hz * age) + 0.3 * sin(2 * pi * hz * 2 * age)
                      + 0.12 * sin(2 * pi * hz * 3 * age))
        samples[start + step] += volume * envelope * timbre


def drum(start_beat, duration=0.13, volume=0.05, kind="hat"):
    start = round(start_beat * BEAT * SAMPLE_RATE)
    count = round(duration * SAMPLE_RATE)
    for step in range(min(count, COUNT - start)):
        age = step / SAMPLE_RATE
        envelope = exp(-38 * age)
        if kind == "kick":
            sound = sin(2 * pi * (67 - 27 * age / duration) * age)
            envelope = exp(-28 * age)
        elif kind == "snare":
            sound = rng.uniform(-1, 1) * 0.75 + sin(2 * pi * 180 * age) * 0.25
        else:
            sound = rng.uniform(-1, 1)
        samples[start + step] += volume * envelope * sound


# Eight bars, written for this game. The quiet texture leaves room for effects.
chords = [
    (45, [57, 60, 64, 69]),  # A minor
    (41, [57, 60, 64, 67]),  # F major 7
    (48, [55, 60, 64, 67]),  # C major
    (43, [55, 59, 62, 67]),  # G major
]
melody = [
    [72, None, 69, 67, 64, None, 67, 69],
    [72, 69, None, 67, 64, 67, 69, None],
    [67, None, 72, 74, 72, 69, None, 67],
    [69, 67, 64, None, 62, 64, 67, None],
    [72, None, 76, 72, 69, None, 67, 69],
    [72, 69, 67, None, 64, 67, 69, 72],
    [74, None, 72, 69, 67, None, 69, 72],
    [69, 67, 64, None, 62, 64, 67, None],
]

for bar in range(8):
    root, chord = chords[bar % 4]
    offset = bar * 4
    for note in chord:
        tone(note, offset, 3.9, 0.016, "pad")
    for beat in range(4):
        tone(root if beat % 2 == 0 else root + 7, offset + beat, 0.85, 0.045, "bass")
        drum(offset + beat, volume=0.075 if beat in (0, 2) else 0.04, kind="kick")
        if beat in (1, 3):
            drum(offset + beat, volume=0.022, kind="snare")
        drum(offset + beat + 0.5, volume=0.012)
    for half_beat, note in enumerate(melody[bar]):
        if note is not None:
            tone(note, offset + half_beat / 2, 0.55, 0.034)

# A short edge fade keeps looping quiet at the exact file boundary.
edge = round(0.12 * SAMPLE_RATE)
for index in range(edge):
    samples[index] *= index / edge
    samples[-index - 1] *= index / edge

peak = max(abs(sample) for sample in samples)
scale = 0.73 / peak
pcm = array("h", (int(max(-1, min(1, sample * scale)) * 32767) for sample in samples))
destination = Path(__file__).resolve().parents[1] / "frontend" / "assets" / "hoa-tam-background.wav"
with wave.open(str(destination), "wb") as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(SAMPLE_RATE)
    output.writeframes(pcm.tobytes())
print(f"Created {destination} ({LENGTH:.1f} seconds)")
