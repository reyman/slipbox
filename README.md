slipbox
=======

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/lggruspe/slipbox/Python%20application)
![PyPI](https://img.shields.io/pypi/v/slipbox)
![PyPI - Python Version](https://img.shields.io/pypi/pyversions/slipbox)
![GitHub](https://img.shields.io/github/license/lggruspe/slipbox)

`slipbox` is a static site generator for Zettelkasten notes.

Features
--------

-   Interactive graph of notes and links
-   Static text search
-   Extensible CLI
-   Supports notes in markdown, RST, LaTeX, dokuwiki, Org-mode, txt2tags,
    Textile and MediaWiki formats

Requirements
------------

- `pandoc` (should be compiled with `pandoc-types` 1.22)
- `graphviz`
- `python3` (3.6+)

Installation and usage
----------------------

```bash
pip install slipbox
slipbox init my-slipbox
cd my-slipbox
# ...add notes
slipbox build
```

See [docs-src/index.md](https://github.com/lggruspe/slipbox/blob/master/docs-src/index.md)
and <https://lggruspe.github.io/slipbox>.

Plugins
-------

- <https://github.com/lggruspe/slipbox-cli-genanki>

License
-------

[MIT](./LICENSE).
