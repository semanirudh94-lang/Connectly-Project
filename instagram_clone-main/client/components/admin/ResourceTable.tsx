"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/LanguageProvider";
import type { Paginated, ListParams } from "@/lib/admin.service";

export type FieldType = "text" | "select" | "boolean" | "date";
export interface Option {
  value: string;
  label: string;
}
export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
}
export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: any) => React.ReactNode;
}
export interface ResourceConfig {
  title: string;
  list: (params: ListParams) => Promise<Paginated<any>>;
  columns: ColumnDef[];
  filters?: FieldDef[];
  searchable?: boolean;
  searchPlaceholder?: string;
  sortOptions?: Option[];
  rowId?: (row: any) => string;
  create?: {
    title: string;
    fields: FieldDef[];
    submit: (body: any) => Promise<any>;
  };
  edit?: {
    title: string;
    fields: FieldDef[];
    submit: (id: string, body: any) => Promise<any>;
  };
  remove?: {
    submit: (id: string) => Promise<any>;
  };
}

const PAGE_SIZE = 15;

export default function ResourceTable({ config }: { config: ResourceConfig }) {
  const { t } = useLanguage();
  const [data, setData] = useState<Paginated<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState(config.sortOptions?.[0]?.value || "createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{ mode: "edit" | "create"; row?: any } | null>(
    null,
  );

  const idOf = config.rowId || ((r: any) => r._id);

  // Debounce the keyword search.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever a query input changes.
  useEffect(() => setPage(1), [debounced, sort, order, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListParams = {
        page,
        limit: PAGE_SIZE,
        sort,
        order,
      };
      if (debounced) params.search = debounced;
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await config.list(params);
      setData(res);
    } catch (err: any) {
      toast.add({
        type: "error",
        title: err?.response?.data?.message || t("admin.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, sort, order, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOrder = () => setOrder((o) => (o === "asc" ? "desc" : "asc"));

  const rows = data?.items ?? [];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {config.searchable && (
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={config.searchPlaceholder || t("admin.search")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
            />
          </div>
        )}

        {config.filters?.map((f) => (
          <FilterControl
            key={f.name}
            field={f}
            value={filters[f.name] || ""}
            onChange={(v) => setFilters((s) => ({ ...s, [f.name]: v }))}
          />
        ))}

        {config.sortOptions && config.sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none"
            >
              {config.sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleOrder}
              title={order === "asc" ? t("admin.ascending") : t("admin.descending")}
              className="p-2 rounded-lg border border-ig-border text-ig-text hover:bg-ig-hover"
            >
              {order === "asc" ? "↑" : "↓"}
            </button>
          </div>
        )}

        {config.create && (
          <Button onClick={() => setModal({ mode: "create" })}>
            <Plus size={16} /> {t("admin.create")}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-ig-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ig-hover text-ig-muted">
              <tr>
                {config.columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left font-medium px-3 py-2 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
                {(config.edit || config.remove) && (
                  <th className="text-right font-medium px-3 py-2">
                    {t("admin.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="text-center py-10 text-ig-muted"
                  >
                    {t("common.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="text-center py-10 text-ig-muted"
                  >
                    {t("admin.noResults")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={idOf(row)}
                    className="border-t border-ig-border text-ig-text"
                  >
                    {config.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 align-middle">
                        {c.render
                          ? c.render(row)
                          : String(row[c.key] ?? "—")}
                      </td>
                    ))}
                    {(config.edit || config.remove) && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {config.edit && (
                            <button
                              onClick={() =>
                                setModal({ mode: "edit", row })
                              }
                              className="p-1.5 rounded-lg text-ig-muted hover:text-ig-text hover:bg-ig-hover"
                              title={t("admin.edit")}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {config.remove && (
                            <button
                              onClick={() => handleDelete(idOf(row))}
                              className="p-1.5 rounded-lg text-[#ed4956] hover:bg-ig-hover"
                              title={t("admin.delete")}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-ig-muted">
            {t("admin.pageInfo", {
              page: data.page,
              total: data.totalPages,
              count: data.total,
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-ig-border text-ig-text disabled:opacity-40 hover:bg-ig-hover"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-ig-border text-ig-text disabled:opacity-40 hover:bg-ig-hover"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {modal && (
        <FormModal
          config={config}
          mode={modal.mode}
          row={modal.row}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );

  async function handleDelete(id: string) {
    if (!config.remove) return;
    if (!window.confirm(t("admin.confirmDelete"))) return;
    try {
      await config.remove.submit(id);
      toast.add({ type: "success", title: t("admin.deleted") });
      load();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: err?.response?.data?.message || t("admin.actionFailed"),
      });
    }
  }
}

function FilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select" || field.type === "boolean") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none"
      >
        <option value="">{field.label}</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.label}
      className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
    />
  );
}

function FormModal({
  config,
  mode,
  row,
  onClose,
  onSaved,
}: {
  config: ResourceConfig;
  mode: "edit" | "create";
  row?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const spec = mode === "edit" ? config.edit! : config.create!;
  const [form, setForm] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    spec.fields.forEach((f) => {
      if (mode === "edit" && row) {
        const v = row[f.name];
        init[f.name] =
          f.type === "date" && v ? new Date(v).toISOString().slice(0, 10) : v ?? "";
      } else {
        init[f.name] = f.type === "boolean" ? false : "";
      }
    });
    return init;
  });
  const [busy, setBusy] = useState(false);

  const setField = (name: string, value: any) =>
    setForm((s) => ({ ...s, [name]: value }));

  async function handleSubmit() {
    setBusy(true);
    try {
      const body: Record<string, any> = {};
      spec.fields.forEach((f) => {
        let v = form[f.name];
        if (f.type === "boolean") v = v === true || v === "true";
        if (v === "" || v === undefined) return;
        body[f.name] = v;
      });
      if (mode === "edit") {
        await config.edit!.submit(row._id, body);
      } else {
        await config.create!.submit(body);
      }
      toast.add({ type: "success", title: t("admin.saved") });
      onSaved();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: err?.response?.data?.message || t("admin.actionFailed"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl w-full max-w-[460px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <h2 className="text-sm font-semibold text-ig-text">{spec.title}</h2>
          <button onClick={onClose} className="p-1 text-ig-text hover:opacity-60">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {spec.fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1">
              <span className="text-xs text-ig-muted">{f.label}</span>
              {f.type === "select" ? (
                <select
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none focus:border-ig-text"
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <select
                  value={String(form[f.name] ?? false)}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none focus:border-ig-text"
                >
                  <option value="true">{t("admin.yes")}</option>
                  <option value="false">{t("admin.no")}</option>
                </select>
              ) : (
                <input
                  type={f.type === "date" ? "date" : "text"}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className="py-2 px-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none focus:border-ig-text"
                />
              )}
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-ig-border shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
