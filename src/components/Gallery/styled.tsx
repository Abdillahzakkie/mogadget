import styled from "styled-components";

export const Main = styled.div<{ $sold: boolean }>`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  background: #eceae3;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${(p) => (p.$sold ? "grayscale(.9)" : "none")};
`;

export const Placeholder = styled.span`
  color: #b9b5a8;
  font: 600 20px var(--font-display);
  letter-spacing: 0.04em;
`;

export const CoverImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const Thumbs = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

export const Thumb = styled.button<{ $active: boolean; $sold: boolean }>`
  width: 72px;
  height: 54px;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid ${(p) => (p.$active ? "var(--brand)" : "rgba(20, 21, 24, 0.12)")};
  background: #eceae3;
  cursor: pointer;
  filter: ${(p) => (p.$sold ? "grayscale(.9)" : "none")};
`;
