import { readFileSync } from "fs";

export async function describeImage(
  imagePath: string,
  ollamaHost: string,
  model: string
): Promise<string> {
  const imageBytes = readFileSync(imagePath);
  const base64 = imageBytes.toString("base64");

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{
        role: "user",
        content: [
          "Describe this photograph in detail. Cover: main subjects, setting and location type",
          "(urban/rural/interior), time of day, weather, mood, colours, whether it appears to be",
          "film or digital photography, black and white or colour, any visible text or signs,",
          "and notable compositional features.",
          "Be specific and factual. Avoid vague language. Two to four sentences.",
        ].join(" "),
        images: [base64],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  return data.message.content.trim();
}

export async function suggestTags(
  description: string,
  taxonomy: string[],
  ollamaHost: string,
  model: string
): Promise<string[]> {
  const tagList = taxonomy.join(", ");
  const prompt = [
    `Given this photo description: "${description}"`,
    ``,
    `Select the most relevant tags from this exact list (return ONLY a JSON array of strings, no other text):`,
    tagList,
    ``,
    `Rules: only use tags from the list above, select 3-8 tags, prefer specific tags over generic ones.`,
  ].join("\n");

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  const raw = data.message.content.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const matches = raw.match(/"([^"]+)"/g) ?? [];
    parsed = matches.map((m) => m.slice(1, -1));
  }

  const taxonomySet = new Set(taxonomy);
  return (parsed as string[]).filter((t) => taxonomySet.has(t));
}
