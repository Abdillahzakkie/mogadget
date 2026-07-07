"use client";
import { useState } from "react";
import type { CSSProperties } from "react";

// Product photo gallery (spec §9): large 4:3 main image with a thumbnail strip on desktop
// and tap-to-switch on mobile. Falls back to a neutral placeholder when a listing has no
// photos yet (seed data ships without images).
export function Gallery({
  images,
  name,
  sold,
}: {
  images: { url: string }[];
  name: string;
  sold: boolean;
}) {
  const [active, setActive] = useState(0);
  const filter = sold ? "grayscale(.9)" : "none";

  if (images.length === 0) {
    return (
      <div style={{ ...main, filter }}>
        <span style={placeholder}>MoGadget</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];
  return (
    <div>
      <div style={{ ...main, filter }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={name}
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
      {images.length > 1 && (
        <div style={thumbs}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              style={{
                ...thumb,
                borderColor: i === active ? "var(--brand)" : "rgba(20,21,24,.12)",
                filter,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const main: CSSProperties = {
  position: "relative",
  aspectRatio: "4 / 3",
  borderRadius: 16,
  background: "#ECEAE3",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const placeholder: CSSProperties = {
  color: "#B9B5A8",
  font: "600 20px var(--font-display)",
  letterSpacing: ".04em",
};
const thumbs: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
};
const thumb: CSSProperties = {
  width: 72,
  height: 54,
  padding: 0,
  borderRadius: 8,
  overflow: "hidden",
  border: "2px solid",
  background: "#ECEAE3",
  cursor: "pointer",
};
