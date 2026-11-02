#!/usr/bin/env python3
"""Keep the production site's SEO files out of the dev-host build output."""

from pathlib import Path
import sys


browser = Path(sys.argv[1])
index = browser / "index.html"
html = index.read_text(encoding="utf-8")
if "</head>" not in html:
    raise SystemExit(f"No closing </head> found in {index}")
if 'name="robots"' not in html:
    html = html.replace(
        "</head>",
        '  <meta name="robots" content="noindex, nofollow">\n</head>',
        1,
    )
index.write_text(html, encoding="utf-8")

(browser / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
(browser / "sitemap.xml").unlink(missing_ok=True)
