import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import styled from "styled-components";
import { Deck } from "./Deck";
import { CheatSheet } from "./CheatSheet";
import {
  parseSlides,
  getSlideStartLines,
  updateSlideNote,
} from "../parser/parse-slides";
import {
  registerCompletion,
  type CompletionRegistration
} from 'monacopilot';


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

function cleanAiResponse(text: string): string {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```\w*\n([\s\S]*)\n```$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // Strip any reasoning/commentary before the actual slide content.
  // The file must start with `---` (first slide separator).
  const slideStart = cleaned.indexOf("---");
  if (slideStart > 0) cleaned = cleaned.slice(slideStart);
  return cleaned;
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

interface EditorProps {
  defaultValue: string;
  onChange?: (markdown: string) => void;
}

export function Editor({ defaultValue, onChange }: EditorProps) {
  console.log("Editor");
  const completionRef = useRef<CompletionRegistration | null>(null);
  const [markdown, setMarkdown] = useState(defaultValue);
  const [activeTab, setActiveTab] = useState<
    "markdown" | "script" | "cheatsheet"
  >("markdown");
  const [cursorNav, setCursorNav] = useState<
    { slideIndex: number; seq: number } | undefined
  >(undefined);
  const [displayedSlideIndex, setDisplayedSlideIndex] = useState(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPending, setAiPending] = useState<{
    original: string;
    proposed: string;
  } | null>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null,
  );

  const slides = useMemo(() => parseSlides(markdown).slides, [markdown]);

  // Script state
  const displayedSlideIndexRef = useRef(displayedSlideIndex);
  displayedSlideIndexRef.current = displayedSlideIndex;
  const [scriptText, setScriptText] = useState("");
  const scriptFocusedRef = useRef(false);
  const ignoreCursorRef = useRef(false);

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
        aiInputRef.current?.focus();
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      completionRef.current?.deregister()
    }
  }, [])
  console.log(completionRef.current);

  const handleAiSubmit = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed || !aiInstruction.trim() || aiLoading) return;

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

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          instruction: aiInstruction,
          selection: selectionData,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const proposed = cleanAiResponse(data.code);
      if (proposed === code) return;

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
    } catch (err) {
      console.error("AI edit failed:", err);
    } finally {
      setAiLoading(false);
      setAiInstruction("");
    }
  }, [aiInstruction, aiLoading]);

  const handleAcceptEdit = useCallback(() => {
    const ed = editorRef.current;
    if (ed) {
      ed.updateOptions({ readOnly: false });
      decorationsRef.current?.clear();
    }
    setAiPending(null);
  }, []);

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
  }, [aiPending]);

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
        <PanelHeader>
          <TabBar>
            <Tab
              $active={activeTab === "markdown"}
              onClick={() => setActiveTab("markdown")}
            >
              Markdown
            </Tab>
            <Tab
              $active={activeTab === "script"}
              onClick={() => setActiveTab("script")}
            >
              Script
            </Tab>
            <Tab
              $active={activeTab === "cheatsheet"}
              onClick={() => setActiveTab("cheatsheet")}
            >
              Cheat Sheet
            </Tab>
          </TabBar>
          <SlideCount>
            Slide {displayedSlideIndex + 1} / {slides.length}
          </SlideCount>
        </PanelHeader>

        <MonacoWrapper
          style={{ display: activeTab === "markdown" ? undefined : "none" }}
        >
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

        {activeTab === "markdown" && (
          <AIEditBar>
            {aiPending ? (
              <>
                <AIEditStatus>AI edit proposed — review changes</AIEditStatus>
                <AIEditButton $variant="accept" onClick={handleAcceptEdit}>
                  Accept
                </AIEditButton>
                <AIEditButton $variant="reject" onClick={handleRejectEdit}>
                  Reject (Esc)
                </AIEditButton>
              </>
            ) : (
              <>
                <AIEditInput
                  ref={aiInputRef}
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAiSubmit();
                    }
                    if (e.key === "Escape") {
                      e.currentTarget.blur();
                      editorRef.current?.focus();
                    }
                  }}
                  placeholder={
                    aiLoading
                      ? "Generating edit..."
                      : "Ask AI to edit... (\u2318K)"
                  }
                  disabled={aiLoading}
                />
                {!aiLoading && (
                  <AIEditSubmit
                    onClick={handleAiSubmit}
                    disabled={!aiInstruction.trim()}
                  >
                    Edit
                  </AIEditSubmit>
                )}
                {aiLoading && <AIEditSpinner />}
              </>
            )}
          </AIEditBar>
        )}

        {activeTab === "script" && (
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
        )}

        {activeTab === "cheatsheet" && <CheatSheet />}
      </EditorPanel>

      <PreviewPanel>
        <PanelHeader>
          <PanelTitle>Preview</PanelTitle>
        </PanelHeader>
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

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const PanelTitle = styled.span`
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.foreground};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : "transparent")};
  padding: 0 12px 4px;
  margin-right: 4px;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.foreground : theme.colors.secondaryText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.foreground};
  }
`;

const SlideCount = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.secondaryText};
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

const AIEditBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${({ theme }) => theme.colors.background};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const AIEditInput = styled.input`
  flex: 1;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 6px 10px;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.foreground};
  background: ${({ theme }) => theme.colors.surface};
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }

  &:disabled {
    opacity: 0.6;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.secondaryText};
  }
`;

const AIEditSubmit = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.accent};
  color: white;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const AIEditButton = styled.button<{ $variant: "accept" | "reject" }>`
  padding: 6px 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  background: ${({ $variant, theme }) =>
    $variant === "accept" ? theme.colors.primary : "transparent"};
  color: ${({ $variant, theme }) =>
    $variant === "accept"
      ? theme.colors.foreground
      : theme.colors.secondaryText};
  border: ${({ $variant, theme }) =>
    $variant === "reject" ? `1px solid ${theme.colors.border}` : "none"};

  &:hover {
    opacity: 0.85;
  }
`;

const AIEditStatus = styled.span`
  flex: 1;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.secondaryText};
`;

const AIEditSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: ai-spin 0.6s linear infinite;

  @keyframes ai-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
