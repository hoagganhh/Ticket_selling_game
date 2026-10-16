"""Draw 34 compact SVG chibi avatars from the supplied stage looks.

The portraits in frontend/assets/artists remain the visual references. Run this
script after editing a character's colours, hair, outfit or accessories below.
"""

from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "assets" / "chibi"
FULL_OUT = ROOT / "frontend" / "assets" / "chibi-full"

# name, hair colour, hair shape, coat, shirt, accent, skin, outfit, accessories
CHARACTERS = [
    ("Đại Nghĩa", "#161a29", "side", "#eee6dc", "#fff9eb", "#c23d48", "#f4c6a3", "robe", "earring"),
    ("Dũng DT", "#1e202a", "side", "#e54845", "#d9e1e8", "#f8cf62", "#dcaa89", "vest", "glasses moustache"),
    ("Nguyễn Văn Chung", "#171820", "slick", "#f7f1e5", "#a52f3a", "#e1b047", "#efc4a2", "robe", "dragon"),
    ("Thái VG", "#161a26", "slick", "#a7b6d1", "#dce7f4", "#e7a8bc", "#c89070", "pajama", "tie"),
    ("Tùng Mint", "#141a2e", "beret", "#141b35", "#28334c", "#e22b8d", "#edbe98", "ethnic", "instrument"),
    ("Thanh Duy", "#171923", "fringe", "#ead9bd", "#fffaf0", "#644d79", "#f0c4a5", "trench", "glasses"),
    ("Thỏ (Da LAB)", "#151922", "fringe", "#dfc6a5", "#f9f2e9", "#9e7074", "#e8b797", "trench", "mic"),
    ("Trịnh Thăng Bình", "#171926", "spiky", "#252433", "#171923", "#ba354d", "#efc3a8", "leather", "brow"),
    ("Hoàng Tôn", "#181822", "spiky", "#28242e", "#17151f", "#c93441", "#edbfa4", "leather", "earring"),
    ("Thơm (Da LAB)", "#171923", "fringe", "#f4f1ed", "#a9c8dd", "#d8be85", "#f3c8aa", "suit", "glasses"),
    ("Jun Phạm", "#1b1c25", "slick", "#cbd5f3", "#f0f2ff", "#96aee6", "#ecc0a2", "pajama", "cat"),
    ("Đinh Mạnh Ninh", "#171923", "side", "#23232f", "#11131e", "#b83242", "#f2c6a7", "leather", "mic"),
    ("Vương Anh Tú", "#d9c39e", "slick", "#661b27", "#251820", "#d64151", "#eac0a3", "sparkle", "scar"),
    ("Will", "#171923", "fringe", "#e8d8bd", "#f9f5ec", "#6b5663", "#f0c4aa", "trench", "tie"),
    ("Mew Amazing", "#181a22", "spiky", "#24242b", "#191821", "#a92739", "#f1c5a6", "suit", "scarf"),
    ("Neko Lê", "#171923", "slick", "#2b2731", "#f2eee9", "#8d243f", "#ecc0a4", "sparkle", "gloves"),
    ("BB Trần", "#efdb9d", "wavy", "#24222c", "#271d27", "#a22742", "#f0c4a9", "leather", "earring"),
    ("Hoàng Rob", "#161923", "side", "#fff0c6", "#f39036", "#b85b42", "#edbb99", "striped", "scarf"),
    ("Thuận Nguyễn", "#8a503e", "side", "#eee0b7", "#eeb13d", "#ca7a3b", "#f0c1a1", "mesh", "necklace"),
    ("Huỳnh Lập", "#1b1d29", "short", "#e8ecf5", "#f6f8ff", "#94abd0", "#e9b79a", "pajama", "plush"),
    ("Đông Hùng", "#181a24", "side", "#f1ead2", "#fdfbf0", "#c06b45", "#edbe9d", "shirt", "mic"),
    ("Toki Thành Thỏ", "#171923", "fringe", "#e6d8c0", "#f7f0e4", "#ae8973", "#edc2a4", "robe", "band"),
    ("It’s Charles.", "#24222b", "mullet", "#e5eaf6", "#f8f9fc", "#94acd7", "#efc3a3", "pajama", "necklace"),
    ("Duy Khánh", "#754b48", "side", "#8dc38a", "#f5d4d7", "#d1ad67", "#efc2a4", "brocade", "mic"),
    ("Cheng", "#171923", "spiky", "#816955", "#f4efe9", "#b79a78", "#ecc0a3", "trench", "mic"),
    ("K.O", "#5e4b41", "side", "#f4ead6", "#ffffff", "#9d7a80", "#eabf9f", "trench", "glasses tie"),
    ("Hoàng Dũng", "#24202a", "curly", "#f7f3ec", "#f9f3e8", "#ef966f", "#efc2a0", "shirt", "flower"),
    ("Lê Xuân Tiền", "#191821", "slick", "#28242d", "#f8f3ed", "#a82c42", "#eec2a2", "suit", "flower mic"),
    ("OSAD", "#e3d8cc", "spiky", "#dceccc", "#bf3c32", "#b1d3a7", "#efc6aa", "shirt", "necklace"),
    ("14 Casper", "#1a1f24", "side", "#a7ad91", "#f8f4ef", "#c1aa86", "#dcb092", "suit", "earring"),
    ("Hồ Đông Quan", "#ddba91", "wavy", "#c8d7ee", "#e9f2fc", "#84a0d3", "#efc4a5", "pajama", "plush"),
    ("Thái Lê Minh Hiếu", "#1a1b25", "spiky", "#1e1b27", "#25212e", "#b4a4a0", "#edbea0", "suit", "mic"),
    ("Hà An Huy", "#171923", "slick", "#bd7d52", "#f8f2e8", "#744d46", "#e7b493", "jacket", "sunglasses"),
    ("Phùng Minh Cương", "#171923", "fringe", "#e4aa35", "#1b1d27", "#c75038", "#e9b895", "jacket", "headband gloves"),
]


def hair_front(shape: str, colour: str) -> str:
    shapes = {
        "side": "M56 97 C50 53 68 35 119 32 C166 28 200 57 198 99 C173 78 153 75 136 78 C108 85 88 83 56 97 Z M63 80 C92 94 127 86 153 51 C117 67 96 63 63 80 Z",
        "slick": "M55 98 C46 50 74 29 129 31 C185 31 205 63 199 105 C189 74 169 58 144 62 C108 65 88 78 55 98 Z M79 54 C112 38 158 41 184 65 C143 59 105 66 79 54 Z",
        "spiky": "M54 104 L43 63 L69 70 L63 37 L89 55 L99 23 L116 47 L137 25 L146 48 L174 32 L172 56 L201 49 L190 80 L203 105 C168 76 153 81 135 73 C107 84 83 81 54 104 Z",
        "wavy": "M52 100 C42 86 48 65 63 61 C54 45 73 35 87 42 C96 25 116 30 125 39 C140 25 160 33 168 46 C187 43 196 58 189 73 C207 83 199 98 192 106 C170 75 158 81 142 87 C116 75 91 91 52 100 Z",
        "fringe": "M53 102 C45 56 72 35 123 32 C173 30 204 61 198 103 C178 76 156 70 141 75 L132 96 L118 77 L99 96 L91 78 C77 91 64 91 53 102 Z",
        "short": "M55 97 C53 58 77 36 125 37 C171 36 196 59 198 97 C170 76 148 73 126 75 C101 77 83 88 55 97 Z",
        "mullet": "M52 104 C43 53 73 32 125 32 C174 30 205 56 202 105 L185 86 L169 80 L150 87 L138 72 L120 95 L104 74 L89 91 C73 78 63 92 52 104 Z",
        "curly": "M51 99 C42 86 49 73 57 68 C47 54 57 44 71 45 C76 27 90 27 100 35 C115 23 128 27 134 35 C149 24 161 33 166 43 C185 39 196 49 191 65 C206 76 202 92 195 104 C171 76 148 78 128 83 C100 76 78 88 51 99 Z",
        "beret": "M57 95 C57 58 79 40 129 43 C177 42 196 63 194 100 C170 78 145 78 125 80 C95 78 75 87 57 95 Z",
    }
    extra = ""
    if shape == "curly":
        extra = "".join(f'<circle cx="{x}" cy="{y}" r="14" fill="{colour}" stroke="#392934" stroke-width="2"/>' for x, y in [(64,67),(85,47),(109,41),(137,39),(160,47),(184,65)])
    if shape == "wavy":
        extra = f'<path d="M58 81 Q65 52 80 72 Q92 44 104 68 Q117 45 128 67 Q145 42 156 69 Q174 53 189 80" fill="none" stroke="{colour}" stroke-width="17" stroke-linecap="round"/>'
    if shape == "beret":
        extra = '<path d="M49 57 Q88 11 158 32 Q200 42 202 68 Q188 78 167 69 Q114 57 51 76 Z" fill="#131722" stroke="#392934" stroke-width="3"/><path d="M55 72 Q124 52 194 73" fill="none" stroke="#343a4d" stroke-width="5"/>'
    return f'<path d="{shapes[shape]}" fill="{colour}" stroke="#342734" stroke-width="2.5" stroke-linejoin="round"/>{extra}'


def outfit_art(outfit: str, coat: str, shirt: str, accent: str) -> str:
    pieces = [f'<path d="M61 201 Q80 178 101 176 L155 176 Q179 180 195 202 L211 255 H45 Z" fill="{coat}" stroke="#42303c" stroke-width="3"/>',
              f'<path d="M100 178 L128 210 L156 178 L157 255 H99 Z" fill="{shirt}"/>']
    if outfit in {"suit", "trench", "leather", "sparkle", "jacket", "vest"}:
        pieces += [f'<path d="M99 178 L127 211 L98 255 L72 199 Z" fill="{coat}" stroke="{accent}" stroke-width="2"/>',
                   f'<path d="M157 178 L129 211 L158 255 L185 199 Z" fill="{coat}" stroke="{accent}" stroke-width="2"/>',
                   f'<path d="M101 180 L112 204 L96 213 L119 236" fill="none" stroke="{accent}" stroke-width="2.4"/>',
                   f'<path d="M155 180 L144 204 L160 213 L137 236" fill="none" stroke="{accent}" stroke-width="2.4"/>']
    if outfit in {"pajama", "striped"}:
        pieces += [f'<path d="M72 196 L184 196 M77 211 L190 211 M68 228 L199 228 M60 244 L205 244" stroke="{accent}" stroke-width="2" opacity=".53"/>']
    if outfit in {"ethnic", "brocade", "robe"}:
        pieces += [f'<path d="M96 177 L111 225 L104 255 M160 177 L145 225 L152 255" fill="none" stroke="{accent}" stroke-width="8"/>',
                   f'<path d="M94 204 L106 212 L94 220 L106 228 L94 236 M162 204 L150 212 L162 220 L150 228 L162 236" fill="none" stroke="#f4d077" stroke-width="2"/>']
    if outfit == "mesh":
        pieces += [f'<path d="M66 197 L191 251 M65 211 L172 255 M93 185 L207 236 M191 198 L65 250 M169 187 L54 236" stroke="{accent}" stroke-width="2" opacity=".53"/>']
    if outfit == "sparkle":
        pieces += ['<path d="M78 211 l5 -4 l-1 6 l6 2 l-6 1 l-2 6 l-2 -6 l-6 -1 Z M178 227 l5 -4 l-1 6 l6 2 l-6 1 l-2 6 l-2 -6 l-6 -1 Z" fill="#ffe2a3"/>']
    if outfit in {"shirt", "pajama", "striped"}:
        pieces += [f'<path d="M101 179 L127 211 L114 221 M155 179 L129 211 L143 221" fill="none" stroke="{accent}" stroke-width="2"/>']
    pieces += ['<circle cx="128" cy="231" r="2.3" fill="#f7deb1"/>']
    return "".join(pieces)


def accessories_art(tags: str, accent: str) -> str:
    bits = []
    if "headband" in tags:
        bits.append(f'<path d="M56 80 Q126 45 195 82" fill="none" stroke="{accent}" stroke-width="11"/><path d="M80 70 L91 77 L102 68 M143 67 L154 77 L166 70" fill="none" stroke="#f5ce72" stroke-width="3"/>')
    if "glasses" in tags:
        bits.append('<g fill="none" stroke="#483b42" stroke-width="4"><rect x="75" y="113" width="41" height="28" rx="12"/><rect x="140" y="113" width="41" height="28" rx="12"/><path d="M116 119 Q128 113 140 119"/></g>')
    if "sunglasses" in tags:
        bits.append('<g fill="#322b36" stroke="#a87957" stroke-width="3"><path d="M75 113 Q94 108 116 114 L112 138 Q94 148 79 134 Z"/><path d="M140 114 Q161 108 181 113 L177 134 Q158 148 144 138 Z"/><path d="M116 119 Q128 113 140 119" fill="none"/></g>')
    if "moustache" in tags:
        bits.append('<path d="M111 154 Q118 146 128 151 Q137 145 145 154 Q139 161 128 155 Q119 161 111 154" fill="#3b2d31"/>')
    if "brow" in tags:
        bits.append('<path d="M163 101 l3 -7 m-3 7 l6 -1" stroke="#b8a5b2" stroke-width="2"/>')
    if "scar" in tags:
        bits.append('<path d="M163 146 l10 -3" stroke="#be5f64" stroke-width="3" stroke-linecap="round"/>')
    if "earring" in tags:
        bits.append('<circle cx="193" cy="139" r="4" fill="#f8d584"/><path d="M193 143 v8" stroke="#f8d584" stroke-width="2"/>')
    if "tie" in tags:
        bits.append(f'<path d="M123 208 L133 208 L138 216 L128 242 L118 216 Z" fill="{accent}"/>')
    if "scarf" in tags:
        bits.append(f'<path d="M100 182 Q127 198 156 182 L148 211 L121 213 L118 248 L99 236 L108 209 Z" fill="{accent}" stroke="#513544" stroke-width="2"/>')
    if "band" in tags and "headband" not in tags:
        bits.append(f'<path d="M93 188 Q130 179 164 189" fill="none" stroke="{accent}" stroke-width="6"/>')
    if "necklace" in tags:
        bits.append(f'<path d="M108 184 Q128 207 148 184" fill="none" stroke="{accent}" stroke-width="3"/><circle cx="128" cy="202" r="4" fill="#f8e5c1"/>')
    if "flower" in tags:
        bits.append(f'<circle cx="169" cy="207" r="9" fill="{accent}"/><circle cx="169" cy="207" r="3" fill="#ffe8ad"/><path d="M169 194 v26 M156 207 h26" stroke="{accent}" stroke-width="5"/>')
    if "dragon" in tags:
        bits.append(f'<path d="M81 216 Q111 196 99 238 Q81 228 78 249" fill="none" stroke="{accent}" stroke-width="5"/>')
    if "cat" in tags:
        bits.append('<path d="M174 221 l5 -10 l6 10 l6 -10 l5 10 v17 q-12 9 -22 0 Z" fill="#fff9f4" stroke="#8c9cbd" stroke-width="2"/><circle cx="180" cy="229" r="2"/><circle cx="190" cy="229" r="2"/>')
    if "plush" in tags:
        bits.append('<circle cx="182" cy="223" r="19" fill="#ddd8dc" stroke="#9f9aa9" stroke-width="2"/><circle cx="173" cy="207" r="7" fill="#ddd8dc"/><circle cx="191" cy="207" r="7" fill="#ddd8dc"/><circle cx="176" cy="221" r="2" fill="#574956"/><circle cx="188" cy="221" r="2" fill="#574956"/><path d="M179 231 q4 4 8 0" fill="none" stroke="#574956" stroke-width="2"/>')
    if "instrument" in tags:
        bits.append('<path d="M178 198 L205 167" stroke="#e5b54b" stroke-width="7" stroke-linecap="round"/><ellipse cx="171" cy="212" rx="17" ry="13" fill="#e9ba52" stroke="#9b6a3f" stroke-width="3"/><circle cx="171" cy="211" r="4" fill="#8d6439"/>')
    if "mic" in tags:
        bits.append('<path d="M188 214 L205 242" stroke="#343544" stroke-width="6" stroke-linecap="round"/><ellipse cx="184" cy="207" rx="9" ry="11" transform="rotate(-30 184 207)" fill="#b8b9c4" stroke="#6c7080" stroke-width="2"/>')
    if "gloves" in tags:
        bits.append(f'<circle cx="58" cy="228" r="11" fill="{accent}"/><circle cx="198" cy="228" r="11" fill="{accent}"/>')
    return "".join(bits)


def svg_for(number: int, entry: tuple[str, ...], full_body: bool = False) -> str:
    name, hair, shape, coat, shirt, accent, skin, outfit, tags = entry
    # Keep the large chibi head, but vary face shape and expression by artist.
    # The hair, clothes and props above are matched to their supplied portraits.
    face_width = [68, 71, 72, 76, 70, 73, 69, 67, 70, 71, 69, 71, 68, 70, 65, 66, 69, 70, 68, 72, 74, 69, 67, 69, 70, 68, 71, 70, 68, 67, 69, 70, 73, 67][number - 1]
    eye_shift = [0, -2, 0, 2, -1, 0, 0, -2, -1, 1, 0, 1, -1, 0, -2, -1, 0, 0, -1, 2, 1, 0, -2, -1, 0, -1, 1, 0, -1, -1, 0, 0, 2, -1][number - 1]
    smiling = number in {1, 3, 5, 11, 18, 19, 21, 22, 28, 29, 31, 34}
    singing = number in {8, 15, 24}
    if singing:
        mouth = '<ellipse cx="128" cy="156" rx="10" ry="6" fill="#8b3845"/><path d="M121 156 Q128 151 135 156" fill="none" stroke="#f0a4a4" stroke-width="1.4"/>'
    elif smiling:
        mouth = '<path d="M114 153 Q128 169 143 153 Q128 160 114 153 Z" fill="#fffaf0" stroke="#9d5360" stroke-width="2"/>'
    else:
        mouth = '<path d="M117 155 Q128 161 139 155" fill="none" stroke="#994e56" stroke-width="3" stroke-linecap="round"/>'
    face = f'''<ellipse cx="54" cy="130" rx="11" ry="17" fill="{skin}" stroke="#9d6d65" stroke-width="2"/>
<ellipse cx="202" cy="130" rx="11" ry="17" fill="{skin}" stroke="#9d6d65" stroke-width="2"/>
<ellipse cx="128" cy="116" rx="{face_width}" ry="75" fill="{skin}" stroke="#614451" stroke-width="3"/>
<ellipse cx="89" cy="145" rx="12" ry="5" fill="#ef8d91" opacity=".23"/>
<ellipse cx="167" cy="145" rx="12" ry="5" fill="#ef8d91" opacity=".23"/>
<path d="M82 107 Q94 {99 + number % 4} 108 107 M148 107 Q161 {99 + number % 4} 174 107" fill="none" stroke="#583841" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="{96 + eye_shift}" cy="124" rx="{7 + number % 2}" ry="{9 + number % 3}" fill="#282536"/><ellipse cx="{160 - eye_shift}" cy="124" rx="{7 + number % 2}" ry="{9 + number % 3}" fill="#282536"/>
<circle cx="{93 + eye_shift}" cy="120" r="2.6" fill="white"/><circle cx="{157 - eye_shift}" cy="120" r="2.6" fill="white"/>
<path d="M128 128 q-4 11 1 13" fill="none" stroke="#b47869" stroke-width="1.6" opacity=".65"/>
{mouth}'''
    lower_body = f'''<ellipse cx="128" cy="324" rx="67" ry="9" fill="#441b1b" opacity=".25"/>
<path d="M80 235 L126 235 L119 302 Q117 310 104 310 L87 307 Z M130 235 L176 235 L169 307 L151 310 Q139 308 138 302 Z" fill="{coat}" stroke="#42303c" stroke-width="3"/>
<path d="M84 302 Q101 299 119 304 L122 316 Q103 325 79 318 Z M139 304 Q157 300 172 302 L179 318 Q154 325 136 316 Z" fill="{hair}" stroke="#42303c" stroke-width="3"/>
<path d="M64 194 Q46 201 41 242 L44 264 L63 265 L77 222 Z M191 194 Q211 202 214 241 L211 264 L192 265 L179 222 Z" fill="{coat}" stroke="#42303c" stroke-width="3"/>
<ellipse cx="54" cy="268" rx="12" ry="15" fill="{skin}" stroke="#9d6d65" stroke-width="2"/>
<ellipse cx="201" cy="268" rx="12" ry="15" fill="{skin}" stroke="#9d6d65" stroke-width="2"/>'''
    backdrop = (f'<circle cx="128" cy="128" r="125" fill="url(#halo)" stroke="#f8d092" stroke-width="3"/>\n'
                '<circle cx="128" cy="128" r="113" fill="none" stroke="#fff1c5" stroke-opacity=".23" stroke-width="2"/>') if not full_body else '<ellipse cx="128" cy="160" rx="111" ry="150" fill="#fff2d4" opacity=".13"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 {340 if full_body else 256}" role="img" aria-label="Chibi {escape(name)}">
<title>Chibi {escape(name)}</title>
<defs><radialGradient id="halo" cx=".32" cy=".25" r=".85"><stop stop-color="{accent}"/><stop offset="1" stop-color="#2b1b34"/></radialGradient></defs>
{backdrop}
<path d="M30 73 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 Z M213 58 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" fill="#ffe8b0" opacity=".9"/>
{lower_body if full_body else '<ellipse cx="128" cy="253" rx="88" ry="10" fill="#1a1224" opacity=".3"/>'}
<path d="M57 112 Q42 74 62 49 Q73 22 126 25 Q186 20 198 59 Q216 85 199 128 L185 163 Q173 172 156 174 L102 174 Q78 169 68 159 Z" fill="{hair}" stroke="#342734" stroke-width="3"/>
<path d="M113 164 L143 164 L145 190 L111 190 Z" fill="{skin}" stroke="#9d6d65" stroke-width="2"/>
{outfit_art(outfit, coat, shirt, accent)}
{face}
{hair_front(shape, hair)}
{accessories_art(tags, accent)}
</svg>'''


def main() -> None:
    assert len(CHARACTERS) == 34
    OUT.mkdir(parents=True, exist_ok=True)
    FULL_OUT.mkdir(parents=True, exist_ok=True)
    for number, character in enumerate(CHARACTERS, start=1):
        (OUT / f"{number:02d}.svg").write_text(svg_for(number, character), encoding="utf-8")
        (FULL_OUT / f"{number:02d}.svg").write_text(svg_for(number, character, True), encoding="utf-8")
    print(f"Wrote {len(CHARACTERS)} avatar and full-body chibis")


if __name__ == "__main__":
    main()
