"""Set individual square viewports for the supplied photographs without changing them."""
import json
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'frontend/assets/portrait-frames.json'
frames = json.loads(p.read_text(encoding='utf-8'))
# Face centre in image coordinates, followed by square size / shorter image edge.
focus = [
    (.46,.245,.48),(.38,.19,.28),(.39,.265,.23),(.48,.22,.46),
    (.44,.23,.56),(.58,.15,.42),(.46,.245,.43),(.51,.36,.43),
    (.60,.20,.48),(.44,.23,.56),(.52,.25,.48),(.57,.25,.40),
    (.475,.215,.49),(.50,.23,.47),(.455,.14,.37),(.56,.185,.52),
    (.49,.20,.42),(.51,.16,.40),(.35,.28,.50),(.51,.23,.58),
    (.45,.25,.36),(.56,.20,.52),(.46,.205,.59),(.44,.21,.45),
    (.52,.25,.40),(.44,.22,.62),(.54,.20,.32),(.48,.20,.48),
    (.50,.34,.37),(.43,.24,.53),(.49,.26,.54),(.58,.25,.30),
    (.475,.17,.40),(.49,.40,.50),
]
assert len(frames) == len(focus) == 34
for (key, frame), (cx, cy, scale) in zip(frames.items(), focus):
    w, h = frame['width'], frame['height']
    size = round(min(w,h) * scale)
    frame.update(x=round(max(0,min(w-size,w*cx-size/2))),
                 y=round(max(0,min(h-size,h*cy-size/2))), size=size)
p.write_text(json.dumps(frames, ensure_ascii=False, indent=2), encoding='utf-8')
print('Updated 34 individual portrait viewports.')
