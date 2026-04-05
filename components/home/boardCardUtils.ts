// Full class names listed explicitly so Tailwind JIT includes them in the build
export const ACCENT_CLASSES = [
  "bg-pink-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-red-500",
] as const;

export function getAccentClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + (id.codePointAt(i) ?? 0)) >>> 0;
  }
  return ACCENT_CLASSES[hash % ACCENT_CLASSES.length];
}

export function formatCreatedDate(
  date: Date | string | null | undefined,
): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `Created ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}
