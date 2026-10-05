import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";


const TextEditor = ({
  value = "",
  onChange,
  placeholder = "Write here...",
  minHeight = 280,
  disabled = false,
}) => {

  const editorRef =
    useRef(null);

  const [
    blockType,
    setBlockType,
  ] = useState("p");


  useEffect(() => {

    const editor =
      editorRef.current;

    if (!editor) {
      return;
    }

    const currentHtml =
      editor.innerHTML;

    if (currentHtml !== value) {
      editor.innerHTML =
        value || "";
    }

  }, [value]);


  const getPlainText = () => {

    const editor =
      editorRef.current;

    if (!editor) {
      return "";
    }

    return (
      editor.innerText ||
      editor.textContent ||
      ""
    ).trim();
  };


  const emitChange = () => {

    const editor =
      editorRef.current;

    if (!editor) {
      return;
    }

    const html =
      editor.innerHTML;

    const text =
      getPlainText();

    onChange?.(
      html,
      text
    );
  };


  const focusEditor = () => {
    editorRef.current?.focus();
  };


  const executeCommand = (
    command,
    commandValue = null
  ) => {

    if (disabled) {
      return;
    }

    focusEditor();

    document.execCommand(
      command,
      false,
      commandValue
    );

    emitChange();
  };


  const handleBlockTypeChange = (
    event
  ) => {

    const nextType =
      event.target.value;

    setBlockType(
      nextType
    );

    executeCommand(
      "formatBlock",
      nextType
    );
  };


  const handleCreateLink = () => {

    if (disabled) {
      return;
    }

    const selectedText =
      window
        .getSelection()
        ?.toString()
        ?.trim();

    if (!selectedText) {
      return;
    }

    const url =
      window.prompt(
        "Enter the link URL:"
      );

    if (!url) {
      return;
    }

    const normalizedUrl =
      /^(https?:\/\/|mailto:|tel:)/i.test(
        url
      )
        ? url
        : `https://${url}`;

    executeCommand(
      "createLink",
      normalizedUrl
    );
  };


  const handlePaste = (
    event
  ) => {

    if (disabled) {
      event.preventDefault();
      return;
    }

    const text =
      event.clipboardData.getData(
        "text/plain"
      );

    event.preventDefault();

    document.execCommand(
      "insertText",
      false,
      text
    );

    emitChange();
  };


  const handleKeyDown = (
    event
  ) => {

    if (disabled) {
      return;
    }

    if (
      event.key === "Tab"
    ) {
      event.preventDefault();

      document.execCommand(
        "insertText",
        false,
        "    "
      );

      emitChange();
    }
  };


  const toolbarButtonClass = `
    flex
    h-9
    w-9
    items-center
    justify-center
    rounded-md
    text-gray-600
    transition
    hover:bg-gray-100
    hover:text-gray-900
    disabled:cursor-not-allowed
    disabled:opacity-40
  `;


  return (
    <div
      className={`
        overflow-hidden
        rounded-lg
        border
        border-gray-300
        bg-white
        transition
        focus-within:border-[#08511f]
        focus-within:ring-1
        focus-within:ring-[#08511f]

        ${
          disabled
            ? "bg-gray-50"
            : ""
        }
      `}
    >

      {/* TOOLBAR */}

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-1
          border-b
          border-gray-200
          bg-gray-50
          px-2
          py-2
        "
      >

        {/* PARAGRAPH / HEADING */}

        <select
          value={blockType}
          onChange={
            handleBlockTypeChange
          }
          disabled={disabled}
          aria-label="Text style"
          className="
            h-9
            rounded-md
            border
            border-transparent
            bg-transparent
            px-2
            text-sm
            text-gray-700
            outline-none
            transition
            hover:bg-gray-100
            focus:border-gray-300
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <option value="p">
            Paragraph
          </option>

          <option value="h1">
            Heading 1
          </option>

          <option value="h2">
            Heading 2
          </option>

          <option value="h3">
            Heading 3
          </option>
        </select>


        <div
          className="
            mx-1
            h-6
            w-px
            bg-gray-200
          "
        />


        {/* BASIC FORMATTING */}

        <button
          type="button"
          onClick={() =>
            executeCommand(
              "bold"
            )
          }
          disabled={disabled}
          title="Bold"
          aria-label="Bold"
          className={
            toolbarButtonClass
          }
        >
          <Bold size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "italic"
            )
          }
          disabled={disabled}
          title="Italic"
          aria-label="Italic"
          className={
            toolbarButtonClass
          }
        >
          <Italic size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "underline"
            )
          }
          disabled={disabled}
          title="Underline"
          aria-label="Underline"
          className={
            toolbarButtonClass
          }
        >
          <Underline size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "strikeThrough"
            )
          }
          disabled={disabled}
          title="Strikethrough"
          aria-label="Strikethrough"
          className={
            toolbarButtonClass
          }
        >
          <Strikethrough
            size={17}
          />
        </button>


        <div
          className="
            mx-1
            h-6
            w-px
            bg-gray-200
          "
        />


        {/* ALIGNMENT */}

        <button
          type="button"
          onClick={() =>
            executeCommand(
              "justifyLeft"
            )
          }
          disabled={disabled}
          title="Align left"
          aria-label="Align left"
          className={
            toolbarButtonClass
          }
        >
          <AlignLeft size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "justifyCenter"
            )
          }
          disabled={disabled}
          title="Align center"
          aria-label="Align center"
          className={
            toolbarButtonClass
          }
        >
          <AlignCenter
            size={17}
          />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "justifyRight"
            )
          }
          disabled={disabled}
          title="Align right"
          aria-label="Align right"
          className={
            toolbarButtonClass
          }
        >
          <AlignRight
            size={17}
          />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "justifyFull"
            )
          }
          disabled={disabled}
          title="Justify"
          aria-label="Justify"
          className={
            toolbarButtonClass
          }
        >
          <AlignJustify
            size={17}
          />
        </button>


        <div
          className="
            mx-1
            h-6
            w-px
            bg-gray-200
          "
        />


        {/* LISTS */}

        <button
          type="button"
          onClick={() =>
            executeCommand(
              "insertUnorderedList"
            )
          }
          disabled={disabled}
          title="Bulleted list"
          aria-label="Bulleted list"
          className={
            toolbarButtonClass
          }
        >
          <List size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "insertOrderedList"
            )
          }
          disabled={disabled}
          title="Numbered list"
          aria-label="Numbered list"
          className={
            toolbarButtonClass
          }
        >
          <ListOrdered
            size={17}
          />
        </button>


        <div
          className="
            mx-1
            h-6
            w-px
            bg-gray-200
          "
        />


        {/* LINKS */}

        <button
          type="button"
          onClick={
            handleCreateLink
          }
          disabled={disabled}
          title="Insert link"
          aria-label="Insert link"
          className={
            toolbarButtonClass
          }
        >
          <LinkIcon size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "unlink"
            )
          }
          disabled={disabled}
          title="Remove link"
          aria-label="Remove link"
          className={
            toolbarButtonClass
          }
        >
          <Unlink size={17} />
        </button>


        <div
          className="
            mx-1
            h-6
            w-px
            bg-gray-200
          "
        />


        {/* UNDO / REDO */}

        <button
          type="button"
          onClick={() =>
            executeCommand(
              "undo"
            )
          }
          disabled={disabled}
          title="Undo"
          aria-label="Undo"
          className={
            toolbarButtonClass
          }
        >
          <Undo2 size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "redo"
            )
          }
          disabled={disabled}
          title="Redo"
          aria-label="Redo"
          className={
            toolbarButtonClass
          }
        >
          <Redo2 size={17} />
        </button>


        <button
          type="button"
          onClick={() =>
            executeCommand(
              "removeFormat"
            )
          }
          disabled={disabled}
          title="Clear formatting"
          aria-label="Clear formatting"
          className={
            toolbarButtonClass
          }
        >
          <RemoveFormatting
            size={17}
          />
        </button>
      </div>


      {/* EDITOR */}

      <div
        className="
          relative
          bg-white
        "
      >

        {!value &&
          !getPlainText() && (
            <div
              className="
                pointer-events-none
                absolute
                left-4
                top-4
                text-sm
                text-gray-400
              "
            >
              {placeholder}
            </div>
          )}


        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={
            emitChange
          }
          onBlur={
            emitChange
          }
          onPaste={
            handlePaste
          }
          onKeyDown={
            handleKeyDown
          }
          style={{
            minHeight,
          }}
          className={`
            prose
            prose-sm
            max-w-none
            overflow-y-auto
            px-4
            py-4
            text-sm
            leading-6
            text-gray-800
            outline-none

            [&_a]:text-blue-600
            [&_a]:underline

            [&_h1]:mb-3
            [&_h1]:mt-4
            [&_h1]:text-2xl
            [&_h1]:font-bold

            [&_h2]:mb-3
            [&_h2]:mt-4
            [&_h2]:text-xl
            [&_h2]:font-bold

            [&_h3]:mb-2
            [&_h3]:mt-3
            [&_h3]:text-lg
            [&_h3]:font-semibold

            [&_ol]:list-decimal
            [&_ol]:pl-6

            [&_ul]:list-disc
            [&_ul]:pl-6

            ${
              disabled
                ? "cursor-not-allowed bg-gray-50"
                : ""
            }
          `}
        />
      </div>
    </div>
  );
};


export default TextEditor;