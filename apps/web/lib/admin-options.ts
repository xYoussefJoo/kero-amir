import "server-only";
import { getCategoriesAdmin, getToolsAdmin } from "@/lib/server/admin";

/** Category and tool choices for the project form (English names). */
export async function projectOptions() {
  const [categories, tools] = await Promise.all([getCategoriesAdmin(), getToolsAdmin()]);
  return {
    categories: categories.map((c) => ({ id: c.id, label: c.translations.find((t) => t.locale === "en")?.name ?? c.slug })),
    tools: tools.map((t) => ({ id: t.id, label: t.name })),
  };
}
