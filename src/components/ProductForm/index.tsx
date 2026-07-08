"use client";
import { useState } from "react";
import {
  BRANDS_BY_CATEGORY,
  CATEGORIES,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  CONDITIONS,
  GRADE_GLOSSARY,
} from "@/server/validators/constants";
import type {
  IAdminProductDto,
  TCategory,
  TCondition,
  TCosmeticGrade,
  TStatus,
} from "@/server/validators/types";
import { adminApi, type ImageRef } from "../../lib/adminApi";
import {
  ActionsRow,
  AddSpecButton,
  DangerButton,
  ErrorBox,
  FieldLabel,
  FieldWrap,
  FormRow,
  GhostButton,
  MiniButton,
  PrimaryButton,
  RemoveMiniButton,
  Select,
  SpecLabelInput,
  SpecRow,
  SpecsList,
  SpecValueInput,
  StyledForm,
  TextArea,
  TextInput,
  Thumb,
  ThumbActions,
  ThumbCard,
  ThumbGrid,
  UploadingNote,
} from "./styled";

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
  initial?: IAdminProductDto;
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
  const [quantity, setQuantity] = useState(
    initial?.quantity != null ? String(initial.quantity) : "1",
  );
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(initial?.specs ?? []);
  const [images, setImages] = useState<ImgItem[]>(
    (initial?.images ?? []).map((i) => ({ key: i.key, url: i.url })),
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
    // Every image (existing, from the admin DTO, or freshly uploaded) carries a key, so the current
    // on-screen order becomes the persisted sortOrder.
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
      isVisible: initial?.isVisible ?? true,
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
    <StyledForm onSubmit={submit}>
      {error && <ErrorBox>{error}</ErrorBox>}

      <Field label="Name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>

      <Row>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as TCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand">
          <TextInput
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
          <Select
            value={condition}
            onChange={(e) => onConditionChange(e.target.value as TCondition)}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price (₦)">
          <TextInput
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
            <Select value={status} onChange={(e) => setStatus(e.target.value as TStatus)}>
              <option value="IN_STOCK">In stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </Select>
          </Field>
          <Field label="Quantity">
            <TextInput
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
            <Select value={grade} onChange={(e) => setGrade(e.target.value as TCosmeticGrade)}>
              <option value="A">A — Excellent</option>
              <option value="B">B — Good</option>
              <option value="C">C — Fair</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TStatus)}>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
            </Select>
          </Field>
        </Row>
      )}

      <Field label="Description">
        <TextArea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </Field>

      <Field label="Specs">
        <SpecsList>
          {specs.map((s, i) => (
            <SpecRow key={i}>
              <SpecLabelInput
                placeholder="Label (e.g. Storage)"
                value={s.label}
                onChange={(e) =>
                  setSpecs((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <SpecValueInput
                placeholder="Value (e.g. 128GB)"
                value={s.value}
                onChange={(e) =>
                  setSpecs((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                }
              />
              <GhostButton
                type="button"
                onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}
              >
                ✕
              </GhostButton>
            </SpecRow>
          ))}
          <AddSpecButton
            type="button"
            onClick={() => setSpecs((p) => [...p, { label: "", value: "" }])}
          >
            + Add spec
          </AddSpecButton>
        </SpecsList>
      </Field>

      <Field label="Photos">
        <ThumbGrid>
          {images.map((img, i) => (
            <ThumbCard key={i}>
              <Thumb $src={img.url} />
              <ThumbActions>
                <MiniButton type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                  ←
                </MiniButton>
                <MiniButton
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                >
                  →
                </MiniButton>
                <RemoveMiniButton type="button" onClick={() => removeImage(i)}>
                  ✕
                </RemoveMiniButton>
              </ThumbActions>
            </ThumbCard>
          ))}
        </ThumbGrid>
        <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
        {uploading && <UploadingNote>Uploading…</UploadingNote>}
      </Field>

      <ActionsRow>
        <PrimaryButton type="submit" disabled={busy || uploading} $busy={busy}>
          {busy ? "Saving…" : submitLabel}
        </PrimaryButton>
        {onDelete && (
          <DangerButton
            type="button"
            onClick={async () => {
              if (confirm("Delete this product permanently?")) await onDelete();
            }}
          >
            Delete
          </DangerButton>
        )}
      </ActionsRow>
    </StyledForm>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <FieldWrap>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </FieldWrap>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <FormRow>{children}</FormRow>;
}
