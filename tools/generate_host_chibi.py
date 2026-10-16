"""Draw the separate host card using the game's established SVG character art."""
from pathlib import Path
from generate_chibi import svg_for

output = Path(__file__).resolve().parents[1] / 'frontend' / 'assets' / 'hosts'
output.mkdir(parents=True, exist_ok=True)
host = ('MC Trần Ngọc', '#171923', 'spiky', '#222430', '#fffaf2', '#8c9ab2', '#efc4a6', 'suit', 'tie mic')
for full in (False, True):
    art = svg_for(32, host, full)
    # The reference has a grey checked tie and a black suit.
    art = art.replace('</svg>', '<path d="M124 183 L135 183 L130 193 L141 224 L130 238 L118 223 L127 193 Z" fill="#8795a9" stroke="#384153" stroke-width="2"/><path d="M123 202 L135 210 M120 217 L137 225 M126 191 L133 195" stroke="#e7eaf0" stroke-width="2"/><path d="M124 199 L133 230 M130 197 L139 224" stroke="#424e64" stroke-width="1.4"/></svg>')
    (output / ('mc-tran-ngoc-full.svg' if full else 'mc-tran-ngoc.svg')).write_text(art, encoding='utf-8')
print('Created MC Tran Ngoc avatar and full-body host; 34 artist assets unchanged.')
