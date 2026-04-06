interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: Props) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = value.slice(0, start) + "\t" + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1;
      });
    }
  }

  return (
    <textarea
      class="editor-border editor-textarea"
      value={value}
      onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
      onKeyDown={handleKeyDown}
      spellcheck={true}
    />
  );
}
