# Notes Component — Implementation & Fixes

Quick plain-language guide to how the Notes page works now and what I changed.

This file summarizes the end-to-end flow, what was broken, how it was fixed, and what to do next.


## Problem (in simple words)

- The editor sends HTML (for example when you make text bold, paste lists, or press Enter).
- The view screen (`NotesSaveComponent`) was showing that HTML as plain text (you could see tags or everything squashed on one line), so line breaks, lists, emojis and formatting were lost.

Users expect what they typed or pasted (new lines, lists, emojis, italics) to appear the same when they open the saved note.


## Goals (short)

- Show notes exactly as users expect (line breaks, lists, emojis, basic formatting).
- Keep plain-text notes working (convert bullets/newlines to readable HTML).
- Avoid obvious security problems (don’t run scripts that get pasted into notes).

## Files Changed

- `src/app/core/components/notes/notes-save/notes-save.component.ts`
  - Detects whether incoming `content` looks like HTML or plaintext.
  - If HTML: perform lightweight sanitization and convert `\n` → `<br>` before trusting with `DomSanitizer`.
  - If plaintext: convert bullets, ordered lists, and newlines into HTML (`<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`), preserving emojis and special characters.
  - Kept old behavior for plain-text to HTML conversion, but enhanced rendering for lists and newlines.

- `src/app/core/components/notes/notes-save/notes-save.component.html`
  - The template now uses `[innerHTML]="contentHtml"` so rendered HTML (or converted HTML) is injected into the DOM.
  - A temporary debug `<pre>` was added during investigation to show the raw `content` payload (remove before production).

- `src/app/core/components/notes/notes-save/notes-save.component.scss`
  - `.note-content` now uses `white-space: pre-wrap` so newline characters are preserved and text wraps correctly.

(Other notes files were inspected but not modified: `notes.component.ts`, `notes-new.component.ts`, `notes.service.ts` — these are described below where relevant.)

## How the payload flows now (end-to-end)

1. Editor → `NotesNewComponent.onEditorHtml(html)` stores the editor's HTML into `this.text`.
2. Save action in `NotesNewComponent.save()` creates payload `{ title, content: this.text, tags }` and calls the service (`addOptimistic` / `updateOptimistic` / `addNote`).
3. `NotesService` sends payload to backend via `NotesApi` and maps backend responses using `created.content || created.text || payload.text` into the local `NoteModel.text` field.
4. When a note is opened, `NotesComponent.openNote()` passes `note.text` as the `content` `componentProp` to `NotesSaveComponent`.
5. `NotesSaveComponent` now:
   - Detects whether `content` includes HTML tags.
   - If yes: runs `sanitizeHtmlForRendering()` (quick sanitization), converts `\n` to `<br>`, then uses `DomSanitizer.bypassSecurityTrustHtml()` to render the HTML safely.
   - If no: runs `renderContentAsHtml()` (plain-text renderer) that converts bullets, ordered lists, and newlines to HTML.

Flow in one sentence: editor HTML → saved as `content` → service stores/returns `content` → view sanitizes/converts and renders it as HTML.

## Implementation details (key behaviors)

- Detection of HTML: a basic regex `/<[a-z][\s\S]*>/i` — this is intentionally simple and conservative.
- Lightweight sanitizer (`sanitizeHtmlForRendering`):
  - Removes entire `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` tags and their contents.
  - Removes attributes starting with `on` (e.g., `onclick`, `onerror`).
  - Neutralizes `javascript:` URIs in `href` and `src`.
  - Converts CR/LF (`\r\n`, `\r`, `\n`) into `<br>` so line breaks appear in rendered HTML.
- Plain-text renderer (`renderContentAsHtml`):
  - Normalizes line endings and splits by `\n`.
  - Recognizes bullets (•, -, *, ▪, ▸) and groups them into `<ul class="note-list">`.
  - Recognizes numbered list items (e.g., `1.`, `2.`, `a.`, `b)`) and groups them into `<ol class="note-list">`.
  - Escapes text to preserve HTML characters when rendering plain-text content.
  - Uses `<p>` for regular lines and `<br>` for empty lines.

Simple explanation of what that means for users:

- If the editor produced HTML (bold, italics, pasted lists), the view will try to render it after removing dangerous tags/attributes and converting newlines to `<br>` so the layout looks right.
- If the note was plain text, the view will convert line breaks and common list patterns into readable HTML lists and paragraphs.

## Why this approach

- Minimal, non-breaking change: keeps existing plain-text behavior and adds support for editor HTML.
- Avoids immediately trusting editor output without any filtering.
- Allows users to paste rich content (lists, emojis, italics/bold) from the editor and see it rendered in the save/view modal.

## Testing / How to verify

1. Start the app and go to the Notes flow.
2. Create a new note using the editor:
   - Press Enter between lines and save — open the saved note and confirm line breaks are visible.
   - Type or paste a bullet list (leading `- ` or `•`) and save — confirm the list renders as bullets.
   - Paste or type an ordered list (`1. item`) — confirm it shows as an ordered list.
   - Use editor's italic/bold features (if supported by the RTE) or paste HTML markup like `<em>italic</em>`; save and confirm markup renders (sanitized) in the view.
   - Paste emojis — they should display correctly.
3. Try malicious inputs (for verification only): paste `<script>alert('x')</script>` — the script should be removed and not executed.

Notes: run a manual smoke test on both mobile (Capacitor) and browser builds, since sanitization and `DomSanitizer` behavior are environment-agnostic but platform differences in fonts/emoji rendering may appear.

## Limitations & Recommendations

- The built-in sanitizer is intentionally lightweight and not a replacement for a mature library.
  - Recommended: integrate DOMPurify for robust sanitization. DOMPurify will remove/neutralize risky attributes, handle complex edge-cases, and can be configured to allow or disallow specific tags and attributes.
  - To integrate DOMPurify: install (`npm i dompurify`) and call `DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] /* example */ })` before `bypassSecurityTrustHtml`.
- Detection of "HTML vs plain text" is heuristic-based. If your RTE sometimes emits HTML-like sequences for plaintext, consider sending an explicit `contentType` field (e.g., `contentType: 'html'|'text'`) in the payload from the editor.

Important notes for maintainers:

- Remove the debug `<pre>` and `console.debug` entries before shipping to production.
- Consider adding `contentType` to the payload if the editor can explicitly tell the app whether the value is HTML or plain text — this removes the need for heuristic detection.
- Strongly consider adding DOMPurify and running `DOMPurify.sanitize()` before trusting/editor HTML.

## Files of interest (quick links)
- `src/app/core/components/notes/notes-new/notes-new.component.ts` — editor handler and payload creation (`onEditorHtml`, `save()`)
- `src/app/core/components/notes/notes.service.ts` — how payload fields `content`/`text` are mapped into `NoteModel.text`
- `src/app/core/components/notes/notes-save/notes-save.component.ts` — view rendering logic and the sanitization/renderer implemented here
- `src/app/core/components/notes/notes.component.ts` — list and modal opening logic
## Next steps (pick one)

- Integrate DOMPurify now and replace the lightweight sanitizer (recommended for production).
- Add `contentType` to the save payload so rendering is deterministic.
- Remove debug helpers and add unit tests for the renderer/sanitizer.

If you want me to implement any of those, tell me which one and I'll do it next.