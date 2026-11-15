"use client";

import type { components } from "@/lib/api/schema";
import { AddItem, EditableRow } from "./EditableRow";
import { FormFooter, nameIn, Text, translations, val } from "./fields";
import { useContentSave } from "./useContentSave";

type Category = components["schemas"]["CategoryAdminDto"];

export function CategoriesEditor({ categories }: { categories: Category[] }) {
  const order = categories.map((c) => c.id);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">The filter chips above the project grid, in this order.</p>
      <ul className="flex flex-col gap-3">
        {categories.map((c, i) => (
          <EditableRow key={c.id} id={c.id} resource="categories" order={order} index={i}
            title={nameIn(c.translations, "en") || c.slug} meta={[nameIn(c.translations, "de"), `/${c.slug}`].filter(Boolean).join(" · ")}
            deleteLabel={`Delete the category “${nameIn(c.translations, "en")}”? Projects keep their other categories.`}
            form={(close) => <CategoryForm category={c} close={close} />} />
        ))}
      </ul>
      <AddItem label="Add category" form={(close) => <CategoryForm close={close} />} />
    </div>
  );
}

function CategoryForm({ category, close }: { category?: Category; close: () => void }) {
  const { save, busy, messages } = useContentSave("categories", category?.id, close);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const de = val(f, "de");
    save({ slug: val(f, "slug"), translations: translations({ name: val(f, "en") }, de ? { name: de } : null) });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <Text label="Name (English)" name="en" value={category && nameIn(category.translations, "en")} required />
        <Text label="Name (German)" name="de" value={category && nameIn(category.translations, "de")} />
        <Text label="Web address" name="slug" value={category?.slug} required hint="Lowercase and hyphens, e.g. brand-identity." />
      </div>
      <FormFooter busy={busy} messages={messages} onCancel={close} />
    </form>
  );
}
