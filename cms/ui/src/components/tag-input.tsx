import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import { api } from "../lib/api";

const allTags = signal<string[]>([]);
let tagsFetched = false;

function fetchAllTags() {
  if (tagsFetched) return;
  tagsFetched = true;
  api.get("/api/tags").then((data: any) => {
    allTags.value = data.map((t: any) => t.name);
  });
}

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllTags();
  }, []);

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent) {
    const input = inputRef.current;
    if (!input) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
      input.value = "";
    }
    if (e.key === "Backspace" && !input.value && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div class="tag-input-wrap">
      {tags.map((tag) => (
        <span class="tag-chip">
          {tag}
          <button onClick={() => removeTag(tag)}>x</button>
        </span>
      ))}
      <input
        ref={inputRef}
        list="tag-suggestions"
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Add tags..." : ""}
        class="tag-input-field"
      />
      <datalist id="tag-suggestions">
        {allTags.value
          .filter((t) => !tags.includes(t))
          .map((t) => (
            <option value={t} />
          ))}
      </datalist>
    </div>
  );
}
