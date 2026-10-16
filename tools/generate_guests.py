"""Original expressive chibi customers, separate from the 34 artist collectibles."""
from html import escape
from pathlib import Path
from generate_chibi import hair_front

root = Path(__file__).resolve().parents[1] / 'frontend' / 'assets' / 'guests'
# name, hair, hair shape, jacket, shirt, accent, skin, extra
looks = [
    ('Mẹ', '#6d3e35', 'wavy', '#e88675', '#ffe7d8', '#ffca78', '#f8d1b7', 'flower'),
    ('Bố', '#30303b', 'side', '#458d9a', '#fff4e1', '#e4ad69', '#e8b898', 'glasses'),
    ('Em gái', '#664852', 'fringe', '#90b9a7', '#fff6e7', '#ec96b3', '#f6d1b8', 'bow'),
    ('Anh trai', '#262733', 'spiky', '#313947', '#f5eadc', '#efbd70', '#edc0a0', 'hood'),
    ('Chị gái', '#654264', 'wavy', '#9e88c4', '#fff3e4', '#f1b989', '#f6ceb5', 'plush'),
    ('Ông', '#b6b5b4', 'side', '#817764', '#f8ecd7', '#dfb178', '#e9bfa4', 'glasses'),
    ('Bà', '#b8adb2', 'wavy', '#aa8ba9', '#fff2df', '#efbc78', '#f0c4ac', 'glasses'),
    ('Bạn thân', '#785345', 'curly', '#e6905e', '#fff0d8', '#d35b76', '#f2c6a7', 'cap'),
    ('Đồng nghiệp', '#293342', 'slick', '#718d83', '#f9f1e2', '#dfa96f', '#edc0a0', 'tie'),
    ('Bạn học', '#4c3a3f', 'fringe', '#74b7a8', '#fff5df', '#f6c05d', '#f7d0af', 'backpack'),
    ('Nhóm bạn', '#77525d', 'mullet', '#c67b76', '#fff1df', '#f5c36f', '#efc2a1', 'lightstick'),
    ('Gia đình', '#313043', 'beret', '#aaa1cb', '#fff1e4', '#eda578', '#e9bd9f', 'heart'),
]

def extra_art(kind, accent):
    if kind == 'glasses':
        return '<g fill="none" stroke="#594951" stroke-width="3.7"><rect x="70" y="111" width="49" height="35" rx="16"/><rect x="137" y="111" width="49" height="35" rx="16"/><path d="M119 123q9-6 18 0"/></g>'
    if kind == 'bow':
        return f'<path d="M68 69q-30-29-28 8 8 22 29 7 19 20 24-4-8-27-25-11z" fill="{accent}" stroke="#6d4750" stroke-width="3"/><circle cx="69" cy="79" r="8" fill="#ffe5b3"/>'
    if kind == 'flower':
        return f'<g transform="translate(173 210)"><circle r="13" fill="{accent}"/><path d="M-12 0h24M0-12v24" stroke="#fff2d7" stroke-width="5"/><circle r="4" fill="#e4756b"/></g>'
    if kind == 'hood':
        return '<path d="M78 193q18-24 32-18m68 18q-18-24-32-18" fill="none" stroke="#667589" stroke-width="9" stroke-linecap="round"/><path d="M110 214v28m36-28v28" stroke="#fff0c9" stroke-width="3"/>'
    if kind == 'plush':
        return '<g transform="translate(176 227)"><path d="M-18-12l-3-16 13 9M18-12l3-16-13 9" fill="#f7f0eb" stroke="#6a5874" stroke-width="2"/><circle r="22" fill="#f7f0eb" stroke="#6a5874" stroke-width="3"/><circle cx="-8" cy="-2" r="2.8" fill="#4c4151"/><circle cx="8" cy="-2" r="2.8" fill="#4c4151"/><path d="M-4 8q4 5 8 0" fill="none" stroke="#8b647a" stroke-width="2"/></g>'
    if kind == 'cap':
        return f'<path d="M59 60Q120 2 190 60l7 16q-65-22-145 5z" fill="{accent}" stroke="#68445a" stroke-width="3"/><path d="M93 79q79-31 113 3" fill="none" stroke="#8c5061" stroke-width="10" stroke-linecap="round"/>'
    if kind == 'tie':
        return f'<path d="M120 204l16 0 5 12-13 29-13-29z" fill="{accent}" stroke="#765063" stroke-width="2"/>'
    if kind == 'backpack':
        return f'<path d="M67 198q-14 21-13 47m136-47q14 21 13 47" fill="none" stroke="{accent}" stroke-width="10" stroke-linecap="round"/>'
    if kind == 'lightstick':
        return '<path d="M194 227l24-49" stroke="#e0b05f" stroke-width="8" stroke-linecap="round"/><path d="M219 176q-13-22 0-33 17 15 0 33z" fill="#ffb85c" stroke="#ffedbd" stroke-width="3"/>'
    if kind == 'heart':
        return f'<path d="M181 213q-16-21-24-5-3 12 24 30 27-18 24-30-8-16-24 5z" fill="{accent}" stroke="#7e5366" stroke-width="3"/>'
    return ''

def svg_for(number, look, full):
    name, hair, shape, jacket, shirt, accent, skin, extra = look
    mouth = '<path d="M113 159q15 19 31 0-15 7-31 0z" fill="#ee8192" stroke="#9c5969" stroke-width="2"/><path d="M119 161q9 5 18 0" fill="none" stroke="#fff2df" stroke-width="3"/>' if number % 3 else '<path d="M115 158q13 12 27 0" fill="none" stroke="#a8646c" stroke-width="3.5" stroke-linecap="round"/>'
    body = f'''<ellipse cx="128" cy="323" rx="67" ry="8" fill="#543e4f" opacity=".18"/>
<path d="M80 236h43l-8 65q-13 9-28-1zM132 236h43l-5 64q-17 10-30 1z" fill="{jacket}" stroke="#644b57" stroke-width="3"/>
<path d="M85 298q15-5 32 2l4 15q-22 9-43 2zM139 300q16-7 30-2l10 19q-20 9-43-2z" fill="#333844" stroke="#524653" stroke-width="3"/>
<path d="M72 201q-24 20-27 49l18 10 23-42zM184 201q23 19 27 49l-18 10-23-42z" fill="{jacket}" stroke="#644b57" stroke-width="3"/>
<ellipse cx="55" cy="256" rx="13" ry="12" fill="{skin}" stroke="#a87171" stroke-width="2"/><ellipse cx="202" cy="256" rx="13" ry="12" fill="{skin}" stroke="#a87171" stroke-width="2"/>'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 {340 if full else 256}" role="img" aria-label="Chibi {escape(name)}">
<title>Chibi {escape(name)}</title>
<defs><radialGradient id="halo"><stop stop-color="#fff4e8"/><stop offset="1" stop-color="{accent}"/></radialGradient><linearGradient id="coat" x2="0" y2="1"><stop stop-color="{jacket}"/><stop offset="1" stop-color="{accent}"/></linearGradient></defs>
<ellipse cx="128" cy="{174 if full else 128}" rx="116" ry="{160 if full else 125}" fill="url(#halo)" opacity=".76"/>
{body if full else '<ellipse cx="128" cy="250" rx="78" ry="7" fill="#72566b" opacity=".17"/>'}
<path d="M62 213q20-35 44-32h45q34 0 45 32l17 44H43z" fill="url(#coat)" stroke="#674d5a" stroke-width="4"/>
<path d="M104 184l24 28 24-28 4 73h-56z" fill="{shirt}" stroke="#ad7a7c" stroke-width="2"/>
<path d="M104 187l24 26-18 14m42-40-24 26 17 14" fill="none" stroke="{accent}" stroke-width="3"/>
<path d="M55 111q-18-50 6-69 25-29 70-23 61-2 78 43 13 38-12 104-17 24-48 28H103q-35-5-48-31z" fill="{hair}" stroke="#4a3542" stroke-width="4"/>
<ellipse cx="57" cy="130" rx="13" ry="18" fill="{skin}" stroke="#a87171" stroke-width="2"/><ellipse cx="199" cy="130" rx="13" ry="18" fill="{skin}" stroke="#a87171" stroke-width="2"/>
<path d="M128 49c-46-2-72 27-72 72 0 46 23 72 72 74 49-2 72-28 72-74 0-45-26-74-72-72z" fill="{skin}" stroke="#855969" stroke-width="3"/>
<ellipse cx="82" cy="148" rx="15" ry="8" fill="#fa899d" opacity=".38"/><ellipse cx="174" cy="148" rx="15" ry="8" fill="#fa899d" opacity=".38"/>
<path d="M73 106q17-10 34-2m42 0q17-8 34 2" fill="none" stroke="#6b4650" stroke-width="3.5" stroke-linecap="round"/>
<ellipse cx="94" cy="128" rx="17" ry="23" fill="#fff9f4" stroke="#654854" stroke-width="2.8"/><ellipse cx="162" cy="128" rx="17" ry="23" fill="#fff9f4" stroke="#654854" stroke-width="2.8"/>
<ellipse cx="96" cy="131" rx="12.5" ry="18" fill="#443745"/><ellipse cx="160" cy="131" rx="12.5" ry="18" fill="#443745"/>
<ellipse cx="92" cy="123" rx="5" ry="6.5" fill="#fff"/><ellipse cx="156" cy="123" rx="5" ry="6.5" fill="#fff"/><circle cx="101" cy="139" r="2.3" fill="#fff"/><circle cx="165" cy="139" r="2.3" fill="#fff"/>
<path d="M126 144q2 3 4 0" fill="none" stroke="#c88382" stroke-width="2" stroke-linecap="round"/>{mouth}
{hair_front(shape, hair)}
{extra_art(extra, accent)}
<path d="M30 92l3-7 3 7 7 3-7 3-3 7-3-7-7-3zM215 71l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="#fff3d0"/>
</svg>'''

root.mkdir(parents=True, exist_ok=True)
for number, look in enumerate(looks, 1):
    for full in (False, True):
        (root / f'{number:02d}{"-full" if full else ""}.svg').write_text(svg_for(number, look, full), encoding='utf-8')
print(f'Created {len(looks)} new guest avatars and full-body chibis.')
