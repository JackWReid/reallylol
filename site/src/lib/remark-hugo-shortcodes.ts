import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const R2_BASE = "https://media.really.lol";

function resolveImageUrl(src: string): string {
  if (src.startsWith("http")) return src;
  return `${R2_BASE}/${src.replace(/^\//, "")}`;
}

// Match both straight quotes (") and curly/smart quotes (\u201C\u201D).
// Remark may convert straight quotes to smart quotes in text nodes.
function extractAttr(text: string, attr: string): string | null {
  const re = new RegExp(`${attr}=["\\u201C]([^"\\u201D]*)["\\u201D]`);
  const match = text.match(re);
  return match ? match[1] : null;
}

function processShortcode(rawText: string): string | null {
  // {{< image ... >}} or {{<image ...>}}
  if (/\{\{<\s*image\b/.test(rawText)) {
    const src = extractAttr(rawText, "src");
    if (!src) return null;
    const alt = extractAttr(rawText, "alt") ?? "";
    const caption = extractAttr(rawText, "caption") ?? "";
    const url = resolveImageUrl(src);
    return `<figure><img src="${url}" alt="${alt}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  }

  // {{<audio ...>}} or {{< audio ...>}}
  if (/\{\{<\s*audio\b/.test(rawText)) {
    const src = extractAttr(rawText, "src");
    if (!src) return null;
    const caption = extractAttr(rawText, "caption") ?? "";
    return caption
      ? `<figure><audio controls src="${src}"></audio><figcaption>${caption}</figcaption></figure>`
      : `<audio controls src="${src}"></audio>`;
  }

  // {{< highlight lang >}} ... {{< /highlight >}} - strip the tags
  if (/\{\{<\s*highlight\b/.test(rawText) || /\{\{<\s*\/highlight\s*>\}\}/.test(rawText)) {
    const stripped = rawText
      .replace(/\{\{<\s*highlight[^>]*>\}\}/g, "")
      .replace(/\{\{<\s*\/highlight\s*>\}\}/g, "")
      .trim();
    return stripped ? `<pre><code>${stripped}</code></pre>` : "";
  }

  return null;
}

export const remarkHugoShortcodes: Plugin<[], Root> = () => {
  return (tree) => {
    // Handle paragraph nodes whose full reconstructed text is a Hugo shortcode.
    // Remark may split {{< image ... >}} across text + html child nodes.
    visit(tree, "paragraph", (node: any, index, parent: any) => {
      // Reconstruct the raw text from all child nodes
      const raw = (node.children as any[])
        .map((child: any) => {
          if (child.type === "text") return child.value;
          if (child.type === "html") return child.value;
          return "";
        })
        .join("");

      if (!raw.includes("{{<")) return;

      const replacement = processShortcode(raw);
      if (replacement !== null && parent && typeof index === "number") {
        parent.children[index] = { type: "html", value: replacement };
      }
    });

    // Also handle standalone text nodes (fallback)
    visit(tree, "text", (node: any, index, parent: any) => {
      if (!node.value || !node.value.includes("{{<")) return;
      const replacement = processShortcode(node.value);
      if (replacement !== null && parent && typeof index === "number") {
        parent.children[index] = { type: "html", value: replacement };
      }
    });

    // Handle standalone html nodes that contain shortcode-style markup
    visit(tree, "html", (node: any, index, parent: any) => {
      if (!node.value || !node.value.includes("{{<")) return;
      const replacement = processShortcode(node.value);
      if (replacement !== null) {
        node.value = replacement;
      }
    });
  };
};
