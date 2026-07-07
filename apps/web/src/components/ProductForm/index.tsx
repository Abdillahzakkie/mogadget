"use client";
import { useState } from "react";
import type {
  IProductDto,
  TCategory,
  TCondition,
  TCosmeticGrade,
  TStatus,
} from "@mogadget/contracts/types";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CONDITIONS,
  CONDITION_LABEL,
  BRANDS_BY_CATEGORY,
  GRADE_GLOSSARY,
} from "@mogadget/contracts/constants";
import { adminApi, type ImageRef } from "../../lib/adminApi";

type ImgItem = { key: string; url: string };

export interface ProductPayload {
  name: string;
  category: TCategory;
  brand: string;
  condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null;
  priceNaira: number;
  description: string | null;
  stockType: "RESTOCKABLE" | "UNIQUE_UNIT";
  status: TStatus;
  quantity: number | null;
  specs: { label: string; value: string }[];
  isVisible: boolean;
}

interface Props {
  initial?: IProductDto;
  submitLabel: string;
  onSubmit: (payload: ProductPayload, images: ImageRef[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ProductForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<TCategory>(initial?.category ?? "PHONES");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [condition, setCondition] = useState<TCondition>(initial?.condition ?? "NEW");
  const [grade, setGrade] = useState<TCosmeticGrade>(initial?.cosmeticGrade ?? "A");
  const [price, setPrice] = useState(initial ? String(initial.priceNaira) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TStatus>(initial?.status ?? "IN_STOCK");
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : "1");
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(initial?.specs ?? []);
  const [images, setImages] = useState<ImgItem[]>(
    (initial?.images ?? []).map((i) => ({ key: "", url: i.url })),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = condition === "NEW";

  function onConditionChange(c: TCondition) {
    setCondition(c);
    // Keep the payload invariant-valid: NEW → restockable/IN_STOCK; pre-owned → unique/AVAILABLE.
    if (c === "NEW") setStatus("IN_STOCK");
    else setStatus((prev) => (prev === "AVAILABLE" || prev === "SOLD" ? prev : "AVAILABLE"));
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const { key, publicUrl } = await adminApi.uploadFile(file);
        setImages((prev) => [...prev, { key, url: publicUrl }]);
      }
    } catch {
      setError("Image upload failed. Is the API running?");
    } finally {
      setUploading(false);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
  }
  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Math.trunc(Number(price));
    if (!name.trim() || !brand.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Name, brand and a positive price are required.");
      return;
    }
    // Newly uploaded images have a key; pre-existing edit images without a key are dropped from the
    // reorder payload (their keys aren't exposed by the public DTO). Re-upload to change them.
    const imageRefs: ImageRef[] = images
      .filter((i) => i.key)
      .map((i, sortOrder) => ({ key: i.key, sortOrder }));

    const payload: ProductPayload = {
      name: name.trim(),
      category,
      brand: brand.trim(),
      condition,
      cosmeticGrade: isNew ? null : grade,
      priceNaira: priceNum,
      description: description.trim() ? description.trim() : null,
      stockType: isNew ? "RESTOCKABLE" : "UNIQUE_UNIT",
      status,
      quantity: isNew ? Math.max(0, Math.trunc(Number(quantity) || 0)) : null,
      specs: specs.filter((s) => s.label.trim() && s.value.trim()),
      isVisible: initial ? ((initial as { isVisible?: boolean }).isVisible ?? true) : true,
    };

    setBusy(true);
    try {
      await onSubmit(payload, imageRefs);
    } catch {
      setError("Save failed. Check the fields and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 720 }}>
      {error && <div style={errorBox}>{error}</div>}

      <Field label="Name">
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>

      <Row>
        <Field label="Category">
          <select style={input} value={category} onChange={(e) => setCategory(e.target.value as TCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input
            style={input}
            list="brand-options"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            required
          />
          <datalist id="brand-options">
            {(BRANDS_BY_CATEGORY[category] ?? []).map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
      </Row>

      <Row>
        <Field label="Condition">
          <select
            style={input}
            value={condition}
            onChange={(e) => onConditionChange(e.target.value as TCondition)}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price (₦)">
          <input
            style={input}
            type="number"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Field>
      </Row>

      {isNew ? (
        <Row>
          <Field label="Status">
            <select style={input} value={status} onChange={(e) => setStatus(e.target.value as TStatus)}>
              <option value="IN_STOCK">In stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
          </Field>
          <Field label="Quantity">
            <input
              style={input}
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
        </Row>
      ) : (
        <Row>
          <Field label={`Cosmetic grade — ${GRADE_GLOSSARY[grade]}`}>
            <select
              style={input}
              value={grade}
              onChange={(e) => setGrade(e.target.value as TCosmeticGrade)}
            >
              <option value="A">A — Excellent</option>
              <option value="B">B — Good</option>
              <option value="C">C — Fair</option>
            </select>
          </Field>
          <Field label="Status">
            <select style={input} value={status} onChange={(e) => setStatus(e.target.value as TStatus)}>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
            </select>
          </Field>
        </Row>
      )}

      <Field label="Description">
        <textarea
          style={{ ...input, height: 96, padding: 12, resize: "vertical" }}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </Field>

      <Field label="Specs">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {specs.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...input, flex: "0 0 200px" }}
                placeholder="Label (e.g. Storage)"
                value={s.label}
                onChange={(e) =>
                  setSpecs((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <input
                style={{ ...input, flex: 1 }}
                placeholder="Value (e.g. 128GB)"
                value={s.value}
                onChange={(e) =>
                  setSpecs((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                }
              />
              <button type="button" style={ghostBtn} onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            style={{ ...ghostBtn, alignSelf: "flex-start" }}
            onClick={() => setSpecs((p) => [...p, { label: "", value: "" }])}
          >
            + Add spec
          </button>
        </div>
      </Field>

      <Field label="Photos">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          {images.map((img, i) => (
            <div key={i} style={thumbCard}>
              <div style={{ ...thumb, backgroundImage: `url(${img.url})` }} />
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <button type="button" style={miniBtn} onClick={() => move(i, -1)} disabled={i === 0}>
                  ←
                </button>
                <button
                  type="button"
                  style={miniBtn}
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                >
                  →
                </button>
                <button type="button" style={{ ...miniBtn, color: "var(--danger)" }} onClick={() => removeImage(i)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
        {uploading && <span style={{ marginLeft: 10, color: "var(--sold)", fontSize: 13 }}>Uploading…</span>}
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center" }}>
        <button type="submit" disabled={busy || uploading} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            style={dangerBtn}
            onClick={async () => {
              if (confirm("Delete this product permanently?")) await onDelete();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16, flex: 1 }}>
      <div style={fieldLabel}>{label}</div>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 16 }}>{children}</div>;
}

const fieldLabel = { font: "500 12px var(--font-body)", color: "rgba(20,21,24,.6)", marginBottom: 6 };
const input = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(20,21,24,.18)",
  padding: "0 12px",
  fontSize: 15,
  fontFamily: "var(--font-body)",
  background: "#fff",
};
const primaryBtn = {
  height: 44,
  padding: "0 22px",
  borderRadius: 10,
  border: "none",
  background: "var(--brand)",
  color: "#fff",
  font: "600 15px var(--font-body)",
  cursor: "pointer",
};
const dangerBtn = {
  height: 44,
  padding: "0 18px",
  borderRadius: 10,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--danger)",
  font: "600 14px var(--font-body)",
  cursor: "pointer",
};
const ghostBtn = {
  height: 42,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid rgba(20,21,24,.18)",
  background: "transparent",
  color: "var(--ink)",
  font: "500 13px var(--font-body)",
  cursor: "pointer",
};
const miniBtn = {
  padding: "3px 8px",
  borderRadius: 7,
  border: "1px solid rgba(20,21,24,.18)",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
const thumbCard = { width: 96 };
const thumb = {
  width: 96,
  height: 96,
  borderRadius: 10,
  background: "#ECEAE3",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const errorBox = {
  background: "rgba(196,55,47,.08)",
  color: "var(--danger)",
  border: "1px solid rgba(196,55,47,.3)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  marginBottom: 16,
};
