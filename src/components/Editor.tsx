import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Editor as MonacoEditor, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { styled } from "styled-components";
import { Deck } from "./Deck";
import { CheatSheet } from "./CheatSheet";
import { registerImage } from "@/lib/image-registry";
import {
  parseSlides,
  getSlideStartLines,
  updateSlideNote,
} from "../parser/parse-slides";
import {
  registerCompletion,
  type CompletionRegistration
} from 'monacopilot';
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckIcon, XIcon, SparklesIcon, CommandIcon, ChevronDownIcon } from "lucide-react";


function computeChangedLines(original: string, proposed: string): number[] {
  const origLines = original.split("\n");
  const propLines = proposed.split("\n");
  const changed: number[] = [];
  for (let i = 0; i < propLines.length; i++) {
    if (i >= origLines.length || origLines[i] !== propLines[i]) {
      changed.push(i + 1);
    }
  }
  return changed;
}

function applySearchReplace(original: string, response: string): string {
  // Strip wrapping code fences (with optional language tag like ```diff, ```markdown)
  const cleaned = response.replace(/^```[^\n]*\n?/, "").replace(/\n?```\s*$/, "");

  const blocks: { search: string; replace: string }[] = [];
  const regex =
    /<<<<<<< SEARCH\n([\s\S]*?)\n?=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    blocks.push({ search: match[1], replace: match[2] });
  }

  console.log("[applySearchReplace]", {
    originalLen: original.length,
    responseLen: response.length,
    cleanedLen: cleaned.length,
    blocksFound: blocks.length,
    responseFirst200: response.slice(0, 200),
    responseLast200: response.slice(-200),
    cleanedFirst200: cleaned.slice(0, 200),
    searchTexts: blocks.map((b) => b.search.slice(0, 80)),
  });

  if (blocks.length === 0) return original; // no valid blocks — no change

  let result = original;
  for (const block of blocks) {
    if (block.search === "") {
      // Empty SEARCH = replace entire file (create from scratch)
      result = block.replace;
    } else {
      const idx = result.indexOf(block.search);
      if (idx !== -1) {
        result =
          result.slice(0, idx) +
          block.replace +
          result.slice(idx + block.search.length);
      } else {
        console.warn("[applySearchReplace] SEARCH text not found in original:", {
          search: block.search.slice(0, 100),
        });
      }
    }
  }

  return result;
}

function renderScriptWithClicks(text: string) {
  const parts = text.split(/(\[click\])/gi);
  return parts.map((part, i) =>
    /^\[click\]$/i.test(part) ? (
      <ClickBadge key={i}>&#9654; click</ClickBadge>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}


/** Extract reasoning/text from the last assistant message's parts */
function extractMessageParts(messages: UIMessage[]) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return { reasoningText: "", streamText: "", isReasoningStreaming: false };

  let reasoningText = "";
  let streamText = "";
  let isReasoningStreaming = false;

  for (const part of lastAssistant.parts) {
    if (part.type === "reasoning") {
      reasoningText += part.text;
      if (part.state === "streaming") isReasoningStreaming = true;
    } else if (part.type === "text") {
      streamText += part.text;
    }
  }

  return { reasoningText, streamText, isReasoningStreaming };
}

function AiStreamPanel({
  messages,
  isStreaming,
}: {
  messages: UIMessage[];
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { reasoningText, streamText, isReasoningStreaming } = extractMessageParts(messages);

  // Auto-scroll the panel and pre element to bottom as content arrives
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
    if (open && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamText, reasoningText, open]);

  return (
    <div ref={panelRef} className="max-h-[300px] overflow-y-auto border-b border-border px-3 py-2 space-y-2">
      {reasoningText && (
        <Reasoning isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent className="max-h-[120px] overflow-y-auto">{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 shrink-0 text-muted-foreground" />
          {isStreaming ? (
            <Shimmer as="span" className="text-sm" duration={1.5}>
              Generating edit...
            </Shimmer>
          ) : (
            <span className="text-sm text-muted-foreground">Applying changes...</span>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="ml-auto">
              <ChevronDownIcon
                className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {streamText && (
            <pre
              ref={preRef}
              className="mt-2 max-h-[120px] overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed text-muted-foreground"
            >
              {streamText}
            </pre>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface EditorProps {
  defaultValue: string;
  onChange?: (markdown: string) => void;
}

export function Editor({ defaultValue, onChange }: EditorProps) {
  console.log("Editor");
  const completionRef = useRef<CompletionRegistration | null>(null);
  const [markdown, setMarkdown] = useState(defaultValue);
  const [activeTab, setActiveTab] = useState<string>("markdown");
  const [cursorNav, setCursorNav] = useState<
    { slideIndex: number; seq: number } | undefined
  >(undefined);
  const [displayedSlideIndex, setDisplayedSlideIndex] = useState(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ignoreCursorRef = useRef(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiPending, setAiPending] = useState<{
    original: string;
    proposed: string;
  } | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null,
  );
  // Ref to hold editor state for useChat callbacks (avoids stale closures)
  const aiEditContextRef = useRef<{
    code: string;
    selection?: { text: string; startLine: number; endLine: number };
  }>({ code: "" });

  const {
    messages: aiMessages,
    setMessages: setAiMessages,
    sendMessage,
    status: aiStatus,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai-edit",
      body: () => ({
        code: aiEditContextRef.current.code,
        selection: aiEditContextRef.current.selection,
      }),
    }),
    onFinish: (event) => {
      console.log("[onFinish]", {
        isAbort: event.isAbort,
        isError: event.isError,
        isDisconnect: event.isDisconnect,
        finishReason: event.finishReason,
        partsCount: event.message.parts.length,
        partTypes: event.message.parts.map((p) => p.type),
      });

      const ed = editorRef.current;
      if (!ed) {
        console.warn("[onFinish] editorRef is null");
        return;
      }

      // Extract text from the finished message
      const text = event.message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      console.log("[onFinish] extracted text length:", text.length, "first 300:", text.slice(0, 300));

      const code = aiEditContextRef.current.code;
      const proposed = applySearchReplace(code, text);

      if (proposed === code) {
        console.warn("[onFinish] proposed === code, no changes applied");
        return;
      }

      setAiPending({ original: code, proposed });
      ignoreCursorRef.current = true;
      const pos = ed.getPosition();
      ed.setValue(proposed);
      if (pos) ed.setPosition(pos);
      ignoreCursorRef.current = false;

      const changed = computeChangedLines(code, proposed);
      decorationsRef.current = ed.createDecorationsCollection(
        changed.map((line) => ({
          range: {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: "ai-edit-changed-line",
          },
        })),
      );

      ed.updateOptions({ readOnly: true });
    },
  });

  const aiLoading = aiStatus === "submitted" || aiStatus === "streaming";
  const aiStreaming = aiStatus === "streaming";

  const slides = useMemo(() => parseSlides(markdown).slides, [markdown]);

  // Script state
  const displayedSlideIndexRef = useRef(displayedSlideIndex);
  displayedSlideIndexRef.current = displayedSlideIndex;
  const [scriptText, setScriptText] = useState("");
  const scriptFocusedRef = useRef(false);

  // Sync script text from parsed slides —
  // always sync UNLESS user is actively typing in the script textarea
  useEffect(() => {
    if (!scriptFocusedRef.current) {
      setScriptText(slides[displayedSlideIndex]?.note || "");
    }
  }, [displayedSlideIndex, slides, activeTab]);

  const handleScriptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newScript = e.target.value;
      setScriptText(newScript);

      const ed = editorRef.current;
      if (!ed) return;

      const currentMarkdown = ed.getModel()?.getValue() || "";
      const newMarkdown = updateSlideNote(
        currentMarkdown,
        displayedSlideIndexRef.current,
        newScript,
      );

      if (newMarkdown !== currentMarkdown) {
        const pos = ed.getPosition();
        ignoreCursorRef.current = true;
        ed.setValue(newMarkdown);
        if (pos) ed.setPosition(pos);
        ignoreCursorRef.current = false;
      }
    },
    [],
  );

  const handleSlideChange = useCallback((index: number) => {
    setDisplayedSlideIndex(index);
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value == null) return;
      setMarkdown(value);
      onChange?.(value);
    },
    [onChange],
  );

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Sync cursor position → slide index
    editor.onDidChangeCursorPosition((e) => {
      if (ignoreCursorRef.current) return;
      const line = e.position.lineNumber;
      // Use latest boundaries via the model text (avoid stale closure)
      const text = editor.getModel()?.getValue() || "";
      const boundaries = getSlideStartLines(text);
      let idx = 0;
      for (let i = boundaries.length - 1; i >= 0; i--) {
        if (line >= boundaries[i]) {
          idx = i;
          break;
        }
      }
      setCursorNav((prev) => ({
        slideIndex: idx,
        seq: (prev?.seq ?? 0) + 1,
      }));
    });

    // Register a custom "slidev-md" language with Slidev-aware tokenization
    monaco.languages.register({ id: "slidev-md" });
    monaco.languages.setMonarchTokensProvider("slidev-md", {
      tokenizer: {
        root: [
          [/^---\s*$/, { token: "meta.separator", next: "@frontmatter" }],
          // Step markers: <!-- step --> or <!-- step 2 -->
          [/^<!--\s*step(?:\s+\d+)?\s*-->/, "comment.step"],
          // Notes block: <!-- notes ... -->
          [/^<!--\s*notes\b/, { token: "comment.notes.bracket", next: "@notesBlock" }],
          // HTML comments
          [/<!--/, { token: "comment.html", next: "@htmlComment" }],
          [/^::right::\s*$/, "keyword.directive"],
          [
            /^```\w*\s*(\{[^}]*\})?\s*$/,
            { token: "string.code.fence", next: "@codeblock" },
          ],
          // Mark tags: <mark>, <mark at="2">, </mark>
          [/<mark\b/, { token: "tag.html", next: "@htmlTag" }],
          [/<\/mark\s*>/, "tag.html"],
          // HTML closing tags
          [/<\/[\w-]+\s*>/, "tag.html"],
          // HTML self-closing and opening tags
          [/<[\w-]+/, { token: "tag.html", next: "@htmlTag" }],
          [/^#{1,6}\s.*$/, "keyword.header"],
          [/\*\*[^*]+\*\*/, "strong"],
          [/`[^`]+`/, "variable"],
          [/^>.*$/, "comment"],
          [/^\s*[-*]\s/, "keyword"],
          [/^\s*\d+\.\s/, "keyword"],
          [/\[[^\]]+\]\([^)]+\)/, "string.link"],
          [/\$\$/, { token: "string.math", next: "@mathBlock" }],
          [/\$[^$]+\$/, "string.math"],
        ],
        // HTML tag interior: attributes, values, closing bracket
        htmlTag: [
          [/\s+/, ""],
          [/\/?>/, { token: "tag.html", next: "@pop" }],
          [/([\w-:@.]+)(\s*=\s*)/, ["attribute.name.html", "delimiter.html"]],
          [/"[^"]*"/, "attribute.value.html"],
          [/'[^']*'/, "attribute.value.html"],
          [/[\w-:@.]+/, "attribute.name.html"],
        ],
        htmlComment: [
          [/-->/, { token: "comment.html", next: "@pop" }],
          [/./, "comment.html"],
        ],
        frontmatter: [
          [/^---\s*$/, { token: "meta.separator", next: "@root" }],
          // Content escape hatches — if non-YAML content ends up here, exit to root
          [/^#{1,6}\s.*$/, { token: "keyword.header", next: "@root" }],
          [/^<!--\s*step(?:\s+\d+)?\s*-->/, { token: "comment.step", next: "@root" }],
          [/^<!--\s*notes\b/, { token: "comment.notes.bracket", next: "@notesBlock" }],
          [/^```\w*\s*(\{[^}]*\})?\s*$/, { token: "string.code.fence", next: "@codeblock" }],
          [/^::right::\s*$/, { token: "keyword.directive", next: "@root" }],
          [/<[\w-]+/, { token: "tag.html", next: "@htmlTag" }],
          // YAML keys (any word-char key followed by colon)
          [/^\w[\w-]*\s*:/, "keyword.frontmatter"],
          [/:.*$/, "string"],
          [/^\s*$/, ""],
          [/.*$/, "string"],
        ],
        codeblock: [
          [/^```\s*$/, { token: "string.code.fence", next: "@root" }],
          [/.*$/, "string.code"],
        ],
        notesBlock: [
          [/^-->\s*$/, { token: "comment.notes.bracket", next: "@root" }],
          [/.*$/, "comment.notes"],
        ],
        mathBlock: [
          [/\$\$/, { token: "string.math", next: "@root" }],
          [/.*$/, "string.math"],
        ],
      },
    });

    monaco.editor.defineTheme("slidev-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "meta.separator", foreground: "03EF62", fontStyle: "bold" },
        { token: "keyword", foreground: "6C63FF" },
        { token: "keyword.header", foreground: "05192D", fontStyle: "bold" },
        { token: "keyword.directive", foreground: "03EF62", fontStyle: "bold" },
        { token: "keyword.frontmatter", foreground: "6C63FF" },
        { token: "keyword.mark", foreground: "E07D00" },
        { token: "comment.step", foreground: "03EF62", fontStyle: "italic" },
        { token: "comment.notes", foreground: "576370", fontStyle: "italic" },
        { token: "comment.notes.bracket", foreground: "03EF62", fontStyle: "italic" },
        { token: "comment", foreground: "576370", fontStyle: "italic" },
        { token: "comment.html", foreground: "576370", fontStyle: "italic" },
        { token: "strong", foreground: "05192D", fontStyle: "bold" },
        { token: "string.code", foreground: "C41A16" },
        { token: "string.code.fence", foreground: "6C63FF" },
        { token: "string.link", foreground: "6C63FF" },
        { token: "string.math", foreground: "C41A16" },
        { token: "string", foreground: "C41A16" },
        { token: "variable", foreground: "C41A16" },
        // HTML tokens
        { token: "tag.html", foreground: "1A6B3C" },
        { token: "attribute.name.html", foreground: "6C63FF" },
        { token: "attribute.value.html", foreground: "C41A16" },
        { token: "delimiter.html", foreground: "576370" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#05192D",
        "editor.lineHighlightBackground": "#F7F9FA",
        "editorLineNumber.foreground": "#C0C0C0",
        "editorLineNumber.activeForeground": "#576370",
        "editor.selectionBackground": "#03EF6230",
        "editorIndentGuide.background": "#E8E8EA",
      },
    });

    monaco.editor.setTheme("slidev-light");

    // Supported layouts
    const supportedLayouts = [
      { value: "default", description: "Standard slide layout" },
      { value: "cover", description: "Title/cover slide with dark gradient" },
      {
        value: "center",
        description: "Vertically and horizontally centered content",
      },
      { value: "section", description: "Section header with accent bar" },
      {
        value: "two-cols",
        description: "Two-column layout (use ::right:: to split)",
      },
      { value: "image-right", description: "Content left, image right" },
      { value: "image-left", description: "Image left, content right" },
      {
        value: "code",
        description: "Code-focused layout with tighter padding",
      },
      { value: "full", description: "Full-screen layout, no padding" },
    ];

    // Frontmatter completions
    monaco.languages.registerCompletionItemProvider("slidev-md", {
      triggerCharacters: ["\n", " ", ":"],
      provideCompletionItems(model: editor.ITextModel, position: { lineNumber: number; column: number }) {
        let inFrontmatter = false;
        for (let line = position.lineNumber - 1; line >= 1; line--) {
          const text = model.getLineContent(line).trim();
          if (text === "---") {
            inFrontmatter = true;
            break;
          }
          if (text.startsWith("#") || text === "") continue;
          if (!/^\w[\w-]*\s*:/.test(text)) break;
        }

        if (!inFrontmatter) return { suggestions: [] };

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        // After "layout:" → suggest layout values
        const layoutMatch = textBeforeCursor.match(/^layout\s*:\s*(.*)$/);
        if (layoutMatch) {
          const typed = layoutMatch[1];
          const valueStart = textBeforeCursor.indexOf(":") + 1;
          const afterColon = textBeforeCursor.substring(valueStart);
          const leadingSpaces =
            afterColon.length - afterColon.trimStart().length;
          const startCol = valueStart + leadingSpaces + 1;

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startCol,
            endColumn: position.column,
          };

          return {
            suggestions: supportedLayouts
              .filter((l) => !typed.trim() || l.value.startsWith(typed.trim()))
              .map((l) => ({
                label: l.value,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                detail: l.description,
                insertText: l.value,
                range,
              })),
          };
        }

        if (/^\w[\w-]*\s*:\s/.test(textBeforeCursor)) {
          return { suggestions: [] };
        }

        // Suggest frontmatter keys
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const frontmatterKeys = [
          {
            label: "layout",
            detail: "Slide layout (default, cover, section, center, ...)",
            insertText: "layout: ",
          },
          { label: "title", detail: "Slide title text", insertText: "title: " },
          {
            label: "image",
            detail: "Image URL (for image-left / image-right layouts)",
            insertText: "image: ",
          },
          {
            label: "level",
            detail: "Title heading level (number)",
            insertText: "level: ",
          },
        ];

        return {
          suggestions: frontmatterKeys.map((item) => ({
            label: item.label,
            kind: monaco.languages.CompletionItemKind.Property,
            detail: item.detail,
            insertText: item.insertText,
            command: {
              id: "editor.action.triggerSuggest",
              title: "Re-trigger",
            },
            range,
          })),
        };
      },
    });

    completionRef.current = registerCompletion(monaco, editor, {
      endpoint: '/api/code-completion',
      language: 'slidev-md',
    });

    editor.addAction({
      id: "ai-edit-focus",
      label: "AI Edit",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        // Focus the prompt input textarea
        const textarea = document.querySelector<HTMLTextAreaElement>(
          '[data-slot="prompt-textarea"]'
        );
        textarea?.focus();
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      completionRef.current?.deregister();
    }
  }, [])

  // Paste image into editor → insert <img src="data:..." />
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const ed = editorRef.current;
      if (!ed || !ed.hasTextFocus()) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let imageItem: DataTransferItem | null = null;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          imageItem = item;
          break;
        }
      }
      if (!imageItem) return;

      e.preventDefault();

      const file = imageItem.getAsFile();
      if (!file) return;

      // Register blob URL and use short ID in markdown
      // TODO: replace with real upload — e.g. const url = await uploadImage(file);
      const blobUrl = URL.createObjectURL(file);
      const id = registerImage(blobUrl);
      const imgTag = `<img data-paste-id="${id}" />`;
      const position = ed.getPosition();
      if (!position) return;

      ed.executeEdits("paste-image", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: imgTag,
        },
      ]);
    };

    document.addEventListener("paste", handlePaste, true);
    return () => document.removeEventListener("paste", handlePaste, true);
  }, []);

  const handleAiSubmit = useCallback(
    (message: PromptInputMessage) => {
      const ed = editorRef.current;
      if (!ed || !message.text?.trim() || aiLoading) return;

      // Snapshot editor state into ref for the transport callback
      const code = ed.getModel()?.getValue() || "";
      const selection = ed.getSelection();
      let selectionData:
        | { text: string; startLine: number; endLine: number }
        | undefined;

      if (selection && !selection.isEmpty()) {
        selectionData = {
          text: ed.getModel()?.getValueInRange(selection) || "",
          startLine: selection.startLineNumber,
          endLine: selection.endLineNumber,
        };
      }

      aiEditContextRef.current = { code, selection: selectionData };

      // Clear previous conversation and send new message
      setAiMessages([]);
      setAiInstruction("");
      sendMessage({ text: message.text });
    },
    [aiLoading, sendMessage, setAiMessages],
  );

  const handleAcceptEdit = useCallback(() => {
    const ed = editorRef.current;
    if (ed) {
      ed.updateOptions({ readOnly: false });
      decorationsRef.current?.clear();
    }
    setAiPending(null);
    setAiMessages([]);
  }, [setAiMessages]);

  const handleRejectEdit = useCallback(() => {
    const ed = editorRef.current;
    if (ed && aiPending) {
      ed.updateOptions({ readOnly: false });
      ignoreCursorRef.current = true;
      const pos = ed.getPosition();
      ed.setValue(aiPending.original);
      if (pos) ed.setPosition(pos);
      ignoreCursorRef.current = false;
      decorationsRef.current?.clear();
    }
    setAiPending(null);
    setAiMessages([]);
  }, [aiPending, setAiMessages]);

  useEffect(() => {
    if (!aiPending) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleRejectEdit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [aiPending, handleRejectEdit]);

  return (
    <EditorContainer>
      <EditorPanel>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden gap-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-border shrink-0">
            <TabsList variant="line" className="h-7">
              <TabsTrigger value="markdown" className="text-xs px-2">
                Markdown
              </TabsTrigger>
              <TabsTrigger value="script" className="text-xs px-2">
                Script
              </TabsTrigger>
              <TabsTrigger value="cheatsheet" className="text-xs px-2">
                Cheat Sheet
              </TabsTrigger>
            </TabsList>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {displayedSlideIndex + 1} / {slides.length}
            </Badge>
          </div>

          <TabsContent value="markdown" className="flex-1 flex flex-col overflow-hidden m-0">
            <MonacoWrapper>
              <MonacoEditor
                defaultValue={defaultValue}
                language="slidev-md"
                onChange={handleChange}
                onMount={handleMount}
                options={{
                  fontSize: 13,
                  lineHeight: 20,
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  minimap: { enabled: false },
                  wordWrap: "on",
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  suggestOnTriggerCharacters: true,
                  tabSize: 2,
                  folding: true,
                  foldingStrategy: "indentation",
                  bracketPairColorization: { enabled: true },
                  guides: { indentation: true },
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            </MonacoWrapper>

            {/* AI Edit Bar */}
            <div className="border-t border-border bg-background shrink-0">
              {aiPending && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">
                    AI edit proposed — review changes
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleAcceptEdit}
                      >
                        <CheckIcon className="size-3.5" />
                        Accept
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Apply changes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRejectEdit}
                      >
                        <XIcon className="size-3.5" />
                        Reject
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Discard changes (Esc)
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              {aiLoading && (
                <AiStreamPanel
                  messages={aiMessages}
                  isStreaming={aiStreaming}
                />
              )}
              <div className="px-3 py-2 ai-prompt-wrapper">
                <PromptInput onSubmit={handleAiSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea
                      data-slot="prompt-textarea"
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.currentTarget.value)}
                      placeholder="Ask AI to edit your slides..."
                      className="text-sm"
                      disabled={aiLoading}
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputButton
                        tooltip={{ content: "AI Edit", shortcut: "\u2318K" }}
                        variant="ghost"
                        size="icon-xs"
                      >
                        <CommandIcon className="size-3" />
                      </PromptInputButton>
                    </PromptInputTools>
                    <PromptInputSubmit
                      disabled={!aiInstruction.trim() || aiLoading}
                    />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="script" className="flex-1 flex flex-col overflow-hidden m-0">
            <ScriptView>
              <ScriptContainer>
                <ScriptHighlight aria-hidden="true">
                  {scriptText
                    ? renderScriptWithClicks(scriptText)
                    : <ScriptPlaceholder>Write what you'd say presenting this slide...</ScriptPlaceholder>}
                </ScriptHighlight>
                <ScriptTextarea
                  value={scriptText}
                  onChange={handleScriptChange}
                  onFocus={() => {
                    scriptFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    scriptFocusedRef.current = false;
                  }}
                  onScroll={(e) => {
                    const highlight = e.currentTarget.previousElementSibling;
                    if (highlight) highlight.scrollTop = e.currentTarget.scrollTop;
                  }}
                  dir="auto"
                  placeholder=""
                />
              </ScriptContainer>
            </ScriptView>
          </TabsContent>

          <TabsContent value="cheatsheet" className="flex-1 overflow-hidden m-0">
            <CheatSheet />
          </TabsContent>
        </Tabs>
      </EditorPanel>

      <PreviewPanel>
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Preview
          </span>
        </div>
        <PreviewArea>
          <Deck
            slides={slides}
            cursorNav={cursorNav}
            onSlideChange={handleSlideChange}
          />
        </PreviewArea>
      </PreviewPanel>
    </EditorContainer>
  );
}

const EditorContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 2fr 3fr;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const EditorPanel = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const PreviewPanel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MonacoWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ScriptView = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ScriptContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
`;

const scriptSharedStyles = `
  padding: 24px;
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

const ScriptHighlight = styled.div`
  position: absolute;
  inset: 0;
  ${scriptSharedStyles}
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.foreground};
  background: ${({ theme }) => theme.colors.background};
  overflow-y: auto;
  pointer-events: none;
`;

const ScriptTextarea = styled.textarea`
  position: relative;
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  outline: none;
  ${scriptSharedStyles}
  font-family: ${({ theme }) => theme.fonts.body};
  color: transparent;
  caret-color: ${({ theme }) => theme.colors.foreground};
  background: transparent;

  &::placeholder {
    color: transparent;
  }
`;

const ScriptPlaceholder = styled.span`
  color: ${({ theme }) => theme.colors.secondaryText};
  opacity: 0.5;
`;

const ClickBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 0 4px;
  padding: 1px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primary}18;
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  border-radius: 10px;
  vertical-align: middle;
  user-select: none;
`;

const PreviewArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #e8e8e8;
  overflow: hidden;
`;
