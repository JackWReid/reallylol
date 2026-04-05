export function getRelated(
  currentId: string,
  currentTags: string[],
  allPosts: { id: string; data: { title: string; tags?: string[] } }[],
  limit = 5
) {
  return allPosts
    .filter((p) => p.id !== currentId)
    .map((p) => ({
      ...p,
      score: (p.data.tags ?? []).filter((t) => currentTags.includes(t)).length,
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
