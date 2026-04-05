import { useEffect, useRef } from "preact/hooks";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Light theme for CodeMirror matching CMS earth tones
const cmsLightTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "var(--editor-bg)",
    color: "var(--text)",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    padding: "0.75rem 0",
  },
  ".cm-line": {
    padding: "0 0.75rem",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-inset)",
    color: "var(--text-muted)",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-surface-hover)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--bg-overlay)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--bg-inset) !important",
  },
});

function isDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function MarkdownEditor({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const theme = isDarkMode() ? oneDark : cmsLightTheme;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        theme,
        EditorView.lineWrapping,
        keymap.of([indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div ref={containerRef} class="editor-border" />
  );
}
