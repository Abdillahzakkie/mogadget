"use client";
import { useState } from "react";
import { CoverImg, Main, Placeholder, Thumb, Thumbs } from "./styled";

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

  if (images.length === 0) {
    return (
      <Main $sold={sold}>
        <Placeholder>MoGadget</Placeholder>
      </Main>
    );
  }

  const current = images[Math.min(active, images.length - 1)];
  return (
    <div>
      <Main $sold={sold}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <CoverImg src={current.url} alt={name} decoding="async" />
      </Main>
      {images.length > 1 && (
        <Thumbs>
          {images.map((img, i) => (
            <Thumb
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              $active={i === active}
              $sold={sold}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <CoverImg src={img.url} alt="" loading="lazy" decoding="async" />
            </Thumb>
          ))}
        </Thumbs>
      )}
    </div>
  );
}
