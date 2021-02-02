"""slipbox CLI commands."""

from pathlib import Path
import sys
from typing import Optional

from . import check
from .initializer import DotSlipbox, default_config
from .slipbox import Slipbox

def require_dot_slipbox() -> DotSlipbox:
    """Return .slipbox object in current directory.

    Exit if it does not exist.
    """
    dot = DotSlipbox.locate(Path().resolve())
    if dot is None:
        sys.exit("could not find '.slipbox' in any parent directory.")
    return dot

def show_info(dot: DotSlipbox, note_id: int) -> None:
    """Print metadata associated with note ID."""
    sql = "SELECT title, filename FROM Notes WHERE id = ?"
    with Slipbox(dot) as slipbox:
        cur = slipbox.conn.cursor()
        cur.execute(sql, (note_id,))
        note = cur.fetchone()
        if note is not None:
            print(note_id)
            print(note[0])
            print(note[1])

def show_info_wrapper(note_id: str, /) -> None:
    """Show information about note."""
    dot = require_dot_slipbox()
    return show_info(dot, int(note_id))

def main() -> None:
    """Compile notes into static page."""
    dot = require_dot_slipbox()
    with Slipbox(dot) as slipbox:
        slipbox.run()

def check_notes() -> None:
    """Check notes in slipbox for invalid links and isolated notes."""
    dot = require_dot_slipbox()
    with Slipbox(dot) as slipbox:
        if not check.check_notes(slipbox):
            sys.exit(65)

def generate_flashcards(output: str, /) -> None:
    """Generate anki flash cards from notes."""
    try:
        import genanki #type: ignore
    except ImportError:
        sys.exit("could not import genanki")
    model = genanki.Model(
        1635490798, # model ID
        "Note",
        fields=[
            {"name": "Question"},
            {"name": "Answer"},
        ],
        templates=[
            {
                "name": "Card",
                "qfmt": "<h1>{{Question}}</h1>",
                "afmt": "{{Answer}}",
            },
        ],
    )
    deck = genanki.Deck(1843743983, # deck ID
                        "Slipbox")
    dot = require_dot_slipbox()
    with Slipbox(dot) as slipbox:
        sql = "SELECT title, html FROM Notes"
        for title, html in slipbox.conn.execute(sql):
            note = genanki.Note(model=model,
                                fields=[
                                    title,
                                    html.replace(' style="display:none"', "")
                                ])
            deck.add_note(note)
    genanki.Package(deck).write_to_file(Path(output))

def initialize(directory: Optional[str] = None,
               /,
               content_options: Optional[str] = None,
               document_options: Optional[str] = None) -> None:
    """Initialize notes directory."""
    parent = Path(directory) if directory else Path()
    parent.mkdir(parents=True, exist_ok=True)

    defaults = default_config()
    if not content_options:
        content_options = defaults.get("slipbox", "content_options")
    if not document_options:
        document_options = defaults.get("slipbox", "document_options")

    DotSlipbox(parent, dict(content_options=content_options, document_options=document_options))
    print(f"Initialized .slipbox in {parent.resolve()!s}.")
