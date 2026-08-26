import { useRef, useState, useCallback, useEffect } from "react";

/* ─── toolbar button icons (inline SVG via lucide paths) ─── */
const Icon = ({ d, size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  bold:          "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z",
  italic:        "M19 4h-9M14 20H5M15 4 9 20",
  underline:     ["M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3", "M4 21h16"],
  strikethrough: ["M17.3 12H6.7", "M10 6.5C10 5.1 11.1 4 12.5 4s2.5 1.1 2.5 2.5c0 4-5 4-5 8 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5"],
  alignLeft:     ["M3 6h18", "M3 12h12", "M3 18h15"],
  alignCenter:   ["M3 6h18", "M6 12h12", "M4 18h16"],
  alignRight:    ["M3 6h18", "M9 12h12", "M6 18h15"],
  alignJustify:  ["M3 6h18", "M3 12h18", "M3 18h18"],
  ul:            ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h1", "M4 12h1", "M4 18h1"],
  ol:            ["M10 6h11", "M10 12h11", "M10 18h11", "M4 6h.01", "M4 12 3 8h2l-.5 4", "M3 18h2l-.5-2h1"],
  undo:          "M3 7v6h6 M3.51 15A9 9 0 1 0 5.5 5.5",
  redo:          "M21 7v6h-6 M20.49 15A9 9 0 1 1 18.5 5.5",
  clearFormat:   ["M4 7V4h16v3", "M5 20h6", "M13 4 7 20", "M17 12l4 4m0-4-4 4"],
  link:          ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  hr:            "M3 12h18",
};

const ToolBtn = ({ title, active, onClick, children, className = "" }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`inline-flex items-center justify-center rounded px-1.5 py-1 text-xs transition-colors
      ${active
        ? "bg-emerald-100 text-emerald-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}
      ${className}`}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-0.5 h-5 w-px bg-slate-200 inline-block self-center" />;

/* ─── heading dropdown ─── */
const HEADINGS = [
  { label: "Paragraph", value: "div" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Heading 4", value: "h4" },
];

export default function RichTextEditor({
  onChange,
  placeholder = "Write your message here...",
  minHeight = 220,
  maxLength = 1000,
}) {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [headingOpen, setHeadingOpen] = useState(false);
  const [charCount, setCharCount] = useState(0);

  /* track active formats on selection change */
  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold:          document.queryCommandState("bold"),
      italic:        document.queryCommandState("italic"),
      underline:     document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList:   document.queryCommandState("insertOrderedList"),
      justifyLeft:   document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight:  document.queryCommandState("justifyRight"),
      justifyFull:   document.queryCommandState("justifyFull"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  const exec = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
    syncChange();
  };

  const syncChange = () => {
    const el = editorRef.current;
    const html = el?.innerHTML || "";
    // textContent is layout-independent and always up-to-date;
    // replace non-breaking spaces and trim trailing newlines browsers insert.
    const text = (el?.textContent || "")
      .replace(/\u00A0/g, " ")
      .replace(/\n+$/, "");
    setCharCount(text.length);
    onChange?.(html, text);
  };

  const applyHeading = (tag) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    setHeadingOpen(false);
    updateActiveFormats();
    syncChange();
  };

  const insertHR = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, "<hr/><br/>");
    syncChange();
  };

  const insertLink = () => {
    const url = window.prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  };

  /* placeholder via CSS */
  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML === "<br>" || el.innerHTML === "") {
      el.innerHTML = "";
    }
    syncChange();
  };

  const handleKeyDown = (e) => {
    // allow backspace, delete, arrow keys, copy/paste/select shortcuts
    const isControlKey = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End", "PageUp", "PageDown", "Tab"
    ].includes(e.key) || e.ctrlKey || e.metaKey;

    if (!isControlKey && maxLength) {
      const text = (editorRef.current?.textContent || "").replace(/\u00A0/g, " ");
      if (text.length >= maxLength) {
        e.preventDefault();
      }
    }
  };

  const handlePaste = (e) => {
    if (maxLength) {
      e.preventDefault();
      const text = (editorRef.current?.textContent || "").replace(/\u00A0/g, " ");
      const pasteText = e.clipboardData.getData("text/plain");
      const allowedLength = maxLength - text.length;
      if (allowedLength > 0) {
        const truncated = pasteText.slice(0, allowedLength);
        document.execCommand("insertText", false, truncated);
      }
    }
  };

  const currentBlock = () => {
    try {
      const val = document.queryCommandValue("formatBlock");
      return HEADINGS.find((h) => h.value === val)?.label || "Paragraph";
    } catch {
      return "Paragraph";
    }
  };

  return (
    <div className="mt-2 w-full rounded-md border border-gray-200 overflow-hidden bg-white focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-[#F8F9FB]">

        {/* Heading select */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setHeadingOpen((o) => !o); }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
          >
            <span className="font-medium w-20 text-left">{currentBlock()}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {headingOpen && (
            <div className="absolute top-full left-0 z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white shadow-lg py-1">
              {HEADINGS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyHeading(h.value); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-700 text-slate-700"
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Text style */}
        <ToolBtn title="Bold (Ctrl+B)" active={activeFormats.bold} onClick={() => exec("bold")}>
          <Icon d={ICONS.bold} />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" active={activeFormats.italic} onClick={() => exec("italic")}>
          <Icon d={ICONS.italic} />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={activeFormats.underline} onClick={() => exec("underline")}>
          <Icon d={ICONS.underline} />
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={activeFormats.strikeThrough} onClick={() => exec("strikeThrough")}>
          <Icon d={ICONS.strikethrough} />
        </ToolBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align Left" active={activeFormats.justifyLeft} onClick={() => exec("justifyLeft")}>
          <Icon d={ICONS.alignLeft} />
        </ToolBtn>
        <ToolBtn title="Align Center" active={activeFormats.justifyCenter} onClick={() => exec("justifyCenter")}>
          <Icon d={ICONS.alignCenter} />
        </ToolBtn>
        <ToolBtn title="Align Right" active={activeFormats.justifyRight} onClick={() => exec("justifyRight")}>
          <Icon d={ICONS.alignRight} />
        </ToolBtn>
        <ToolBtn title="Justify" active={activeFormats.justifyFull} onClick={() => exec("justifyFull")}>
          <Icon d={ICONS.alignJustify} />
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet List" active={activeFormats.insertUnorderedList} onClick={() => exec("insertUnorderedList")}>
          <Icon d={ICONS.ul} />
        </ToolBtn>
        <ToolBtn title="Numbered List" active={activeFormats.insertOrderedList} onClick={() => exec("insertOrderedList")}>
          <Icon d={ICONS.ol} />
        </ToolBtn>

        <Divider />

        {/* Extras */}
        <ToolBtn title="Insert Link" onClick={insertLink}>
          <Icon d={ICONS.link} />
        </ToolBtn>
        <ToolBtn title="Insert Horizontal Rule" onClick={insertHR}>
          <Icon d={ICONS.hr} />
        </ToolBtn>

        <Divider />

        {/* Undo / Redo */}
        <ToolBtn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}>
          <Icon d={ICONS.undo} />
        </ToolBtn>
        <ToolBtn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}>
          <Icon d={ICONS.redo} />
        </ToolBtn>

        <Divider />

        {/* Clear formatting */}
        <ToolBtn title="Clear Formatting" onClick={() => exec("removeFormat")}>
          <Icon d={ICONS.clearFormat} />
        </ToolBtn>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        data-placeholder={placeholder}
        className="rte-editor px-4 py-3 text-sm text-slate-800 outline-none overflow-y-auto"
        style={{ minHeight }}
      />

      {/* ── Character count footer ── */}
      {maxLength && (
        <div className="text-[10px] text-slate-400 text-right px-4 py-1 bg-slate-50/50 border-t border-slate-100 select-none">
          {charCount} / {maxLength}
        </div>
      )}

      {/* Scoped styles for placeholder + content */}
      <style>{`
        .rte-editor:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        .rte-editor ul { list-style: disc; padding-left: 1.4em; margin: 0.25em 0; }
        .rte-editor ol { list-style: decimal; padding-left: 1.4em; margin: 0.25em 0; }
        .rte-editor h1 { font-size: 1.5em; font-weight: 700; margin: 0.4em 0; }
        .rte-editor h2 { font-size: 1.25em; font-weight: 700; margin: 0.35em 0; }
        .rte-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0.3em 0; }
        .rte-editor h4 { font-size: 1em; font-weight: 600; margin: 0.25em 0; }
        .rte-editor hr { border: none; border-top: 1px solid #e2e8f0; margin: 0.5em 0; }
        .rte-editor a { color: #059669; text-decoration: underline; }
        .rte-editor p { margin: 0.25em 0; }
      `}</style>
    </div>
  );
}
