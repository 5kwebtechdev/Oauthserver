import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnChanges, OnDestroy, Output, Renderer2, SimpleChanges, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

// Capacitor Keyboard (optional in web builds)
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';

@Component({
  selector: 'rte-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rte-editor.component.html',
  styleUrls: ['./rte-editor.component.scss']
})
export class RteEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  // initial HTML value (optional) set by host
  @Input() value: string = '';
  // when true, render a plain textarea for simple typing (default true to avoid complex behavior)
  @Input() simple = true;
  @ViewChild('plain', { static: false }) plainTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild('toolbar', { static: true }) toolbar!: ElementRef<HTMLElement>;

  @Output() htmlChange = new EventEmitter<string>();
  @Output() attach = new EventEmitter<void>();

  @Input() placeholder = 'Notes here....';

  private savedRange: Range | null = null;
  private selectionListener = () => this.saveSelection();
  private keyboardShowListener: any = null;
  private keyboardHideListener: any = null;

  // track keyboard height (px) to position toolbar above keyboard
  public keyboardHeight = 0;
  // control toolbar visibility: only show when editor focused or keyboard open
  public toolbarVisible = false;

  constructor(private renderer: Renderer2, private ngZone: NgZone, private hostRef: ElementRef, private sanitizer: DomSanitizer) {}

  ngAfterViewInit(): void {
    // initialize editor content from input value
    try {
      if (this.simple) {
        // nothing to set on contenteditable; textarea will be rendered and initialized in ngOnChanges
      } else {
        if (this.value && this.editor && this.editor.nativeElement) {
          this.editor.nativeElement.innerHTML = this.value;
        }
        // Keep track of selection so toolbar actions work even after the editor loses focus
        document.addEventListener('selectionchange', this.selectionListener);
      }
    } catch (e) { /* ignore */ }

    // Emit initial content
    this.emitHtmlChange();

    // enforce LTR on the element and disable spellcheck programmatically as well
    try {
      if (this.editor && this.editor.nativeElement) {
        this.editor.nativeElement.dir = 'ltr';
        this.editor.nativeElement.spellcheck = false;
      }
    } catch (e) { /* ignore */ }

    // Wire Capacitor Keyboard listeners if available
    try {
      // keyboardDidShow gives reliable height on mobile
      this.keyboardShowListener = Keyboard.addListener('keyboardDidShow', (info: KeyboardInfo) => {
        this.ngZone.run(() => {
          this.keyboardHeight = (info && (info.keyboardHeight as any)) ? (info.keyboardHeight as number) : 0;
          this.setCssKeyboardHeight(this.keyboardHeight);
          // show toolbar when keyboard opens
          this.toolbarVisible = true;
        });
      });
      this.keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
        this.ngZone.run(() => {
          this.keyboardHeight = 0;
          this.setCssKeyboardHeight(0);
          // hide toolbar when keyboard closes
          this.toolbarVisible = false;
        });
      });
    } catch (e) {
      // Capacitor Keyboard may not be available in desktop browser; ignore
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].isFirstChange()) {
      try {
        if (this.simple) {
          // initialize plain textarea if present - convert HTML -> plain text if needed
          try {
            if (this.plainTextarea && this.plainTextarea.nativeElement) {
              const incoming = this.value || '';
              const looksLikeHtml = /<[^>]+>/.test(incoming);
              this.plainTextarea.nativeElement.value = looksLikeHtml ? this.htmlToPlainText(incoming) : incoming;
            }
          } catch (e) {}
          this.emitHtmlChange();
        } else {
          if (this.editor && this.editor.nativeElement) {
            this.editor.nativeElement.innerHTML = this.value || '';
            this.emitHtmlChange();
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  // Convert simple HTML (paragraphs, brs) back to plain text suitable for textarea display
  private htmlToPlainText(html: string): string {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // turn <br> into newline
      doc.querySelectorAll('br').forEach(b => {
        b.replaceWith(document.createTextNode('\n'));
      });
      // turn </p> into double newline by inserting newline text nodes after p
      doc.querySelectorAll('p').forEach(p => {
        // ensure inner text preserved, then add newline after
        p.appendChild(document.createTextNode(''));
        const after = document.createTextNode('\n\n');
        if (p.parentNode) p.parentNode.insertBefore(after, p.nextSibling);
      });
      const text = doc.body.textContent || '';
      // collapse multiple trailing newlines and normalize
      return text.replace(/\n{3,}/g, '\n\n').trim();
    } catch (e) {
      return html.replace(/<[^>]+>/g, '');
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('selectionchange', this.selectionListener);
    if (this.keyboardShowListener && this.keyboardShowListener.remove) this.keyboardShowListener.remove();
    if (this.keyboardHideListener && this.keyboardHideListener.remove) this.keyboardHideListener.remove();
  }

  // Save selection range for later restore
  saveSelection() {
    if (this.simple) return; // no-op in simple mode
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // ensure the range lies within our editor
      if (this.editor && this.editor.nativeElement.contains(range.commonAncestorContainer)) {
        try { this.savedRange = range.cloneRange(); } catch (e) { this.savedRange = null; }
      }
    }
  }

  // Restore previously saved selection
  restoreSelection() {
    if (this.simple) return; // no-op in simple mode
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    if (this.savedRange) {
      try { sel.addRange(this.savedRange); } catch (e) { /* ignore */ }
    }
  }

  // Execute formatting command. Use mousedown on toolbar buttons to prevent blur.
  exec(command: string, value?: string) {
    if (this.simple) return; // no exec in simple mode
    // restore selection first (in case toolbar grabbed focus)
    this.restoreSelection();
    // ensure editor has focus
    this.editor.nativeElement.focus();
    // use execCommand for broad support on mobile WebView
    try {
      document.execCommand(command, false, value ?? undefined);
    } catch (e) {
      // fail silently if command unsupported
      console.warn('execCommand failed', command, e);
    }
    // emit updated html
    this.emitHtmlChange();
    // after formatting, save selection again
    this.saveSelection();
  }

  // Called on input to emit sanitized HTML
  onInput() {
    if (this.simple) {
      // textarea input handled separately
      this.emitHtmlChange();
      return;
    }
    this.saveSelection();
    this.emitHtmlChange();
  }

  // textarea input handler for simple mode
  onPlainInput() {
    try {
      const txt = (this.plainTextarea && this.plainTextarea.nativeElement) ? this.plainTextarea.nativeElement.value : '';
      // convert plain text newlines to simple paragraphs
      const html = txt.split(/\n{2,}/).map(p => `<p>${this.sanitizeHtml(p.replace(/\n/g, '<br/>'))}</p>`).join('');
      this.htmlChange.emit(html);
    } catch (e) { this.htmlChange.emit(''); }
  }

  // show toolbar when user focuses the editor
  onFocus() {
    this.toolbarVisible = true;
  }

  // hide toolbar on blur unless keyboard still open (some platforms keep keyboard open)
  onBlur() {
    // small delay allows toolbar button mousedown/preventDefault to run without immediately hiding
    setTimeout(() => {
      if (this.keyboardHeight === 0) this.toolbarVisible = false;
    }, 120);
  }

  // Determine whether the current selection is inside a list
  // returns: 0 = none, 1 = unordered (ul), 2 = ordered (ol)
  private getListState(): number {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return 0;
      let node: Node | null = sel.anchorNode as Node | null;
      if (!node) return 0;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      while (node && node !== this.editor.nativeElement) {
        if (node.nodeName && node.nodeName.toLowerCase() === 'ul') return 1;
        if (node.nodeName && node.nodeName.toLowerCase() === 'ol') return 2;
        node = node.parentNode;
      }
    } catch (e) { /* ignore */ }
    return 0;
  }

  // Cycle list state: none -> unordered -> ordered -> none
  toggleListCycle() {
    this.saveSelection();
    const state = this.getListState();
    if (state === 0) {
      // no list -> create unordered list using execCommand
      this.exec('insertUnorderedList');
    } else if (state === 1) {
      // currently inside UL -> convert UL to OL by DOM transformation
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          let node: Node | null = range.commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          while (node && node !== this.editor.nativeElement) {
            if (node.nodeName && node.nodeName.toLowerCase() === 'ul') {
              const ul = node as HTMLUListElement;
              const ol = document.createElement('ol');
              // copy children
              while (ul.firstChild) {
                ol.appendChild(ul.firstChild);
              }
              ul.parentNode?.replaceChild(ol, ul);
              break;
            }
            node = node.parentNode;
          }
        }
      } catch (e) { /* ignore DOM transform errors */ }
    } else if (state === 2) {
      // currently inside OL -> remove list (unwrap li into paragraphs)
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          let node: Node | null = range.commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          while (node && node !== this.editor.nativeElement) {
            if (node.nodeName && node.nodeName.toLowerCase() === 'ol') {
              const ol = node as HTMLOListElement;
              const frag = document.createDocumentFragment();
              Array.from(ol.children).forEach(li => {
                const p = document.createElement('p');
                // move li children into p
                while (li.firstChild) p.appendChild(li.firstChild);
                frag.appendChild(p);
              });
              ol.parentNode?.replaceChild(frag, ol);
              break;
            }
            node = node.parentNode;
          }
        }
      } catch (e) { /* ignore DOM transform errors */ }
    }

    // restore selection and emit updated html
    this.restoreSelection();
    this.emitHtmlChange();
  }

  // Attachment UI only — emit event for host to handle
  onAttach() {
    this.attach.emit();
  }

  // Helper: emit sanitized HTML string
  private emitHtmlChange() {
    const raw = this.editor.nativeElement.innerHTML || '';
    const clean = this.sanitizeHtml(raw);
    this.htmlChange.emit(clean);
  }

  // Basic sanitizer: remove script/style and inline event handlers and javascript: uris.
  // This is intentionally small and fast; for full security consider a dedicated sanitizer.
  private sanitizeHtml(raw: string): string {
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      // remove script/style
      doc.querySelectorAll('script,style').forEach(n => n.remove());
      // remove attributes that start with on* and javascript: URIs
      doc.querySelectorAll('*').forEach((el: Element) => {
        // copy attributes array to avoid live mutation issues
        const attrs = Array.from(el.attributes || []);
        attrs.forEach(a => {
          const name = a.name.toLowerCase();
          const val = a.value || '';
          if (name.startsWith('on') || /javascript:\s*/i.test(val)) {
            el.removeAttribute(a.name);
          }
        });
      });
      return doc.body.innerHTML || '';
    } catch (e) {
      return '';
    }
  }

  // Set CSS variable on host so stylesheet can use it for placement/padding
  private setCssKeyboardHeight(h: number) {
    try { this.renderer.setStyle(this.hostRef.nativeElement, '--rte-keyboard-height', `${h}px`); } catch (e) { /* ignore */ }
  }

  // Public helper: set focus to editor
  focus() { this.editor.nativeElement.focus(); }
}
