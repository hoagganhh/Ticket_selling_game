"""Build a shareable game ZIP without a player's saved progress."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


project = Path(__file__).resolve().parents[1]
destination = project.parent / f"{project.name}.zip"
temporary = destination.with_suffix(".zip.tmp")

with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
    for source in sorted(project.rglob("*")):
        if not source.is_file():
            continue
        relative = source.relative_to(project)
        if relative.parts[:2] == ("backend", "data"):
            continue
        if any(part in {"node_modules", "__pycache__", ".git"} for part in relative.parts):
            continue
        archive.write(source, Path(project.name) / relative)

temporary.replace(destination)
print(destination)
