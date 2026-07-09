import styled from "styled-components";

export const Section = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
  @media (min-width: 900px) {
    grid-template-columns: 3fr 2fr;
  }
`;

export const Card = styled.div`
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 12px;
  padding: 16px;
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  h3 { margin: 0; font: 700 14px var(--font-body); color: var(--ink); }
`;

export const RangeTabs = styled.div`
  display: inline-flex;
  gap: 4px;
  button {
    border: 1px solid rgba(20, 21, 24, 0.14);
    background: #fff;
    border-radius: 8px;
    padding: 4px 10px;
    font: 600 12px var(--font-body);
    cursor: pointer;
  }
  button[data-active="true"] {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
`;

export const Legend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font: 500 12px var(--font-body);
  color: var(--sold);
  span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
`;

export const Muted = styled.p`
  color: var(--sold);
  font: 500 13px var(--font-body);
  margin: 0;
`;

export const BarRow = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr 36px;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font: 500 12px var(--font-body);
  .track { background: rgba(20, 21, 24, 0.08); border-radius: 6px; height: 10px; overflow: hidden; }
  .fill { height: 100%; background: var(--brand); border-radius: 6px; }
  .n { text-align: right; color: var(--sold); }
`;

export const LeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(20, 21, 24, 0.06);
  font: 500 13px var(--font-body);
  &:last-child { border-bottom: none; }
  .clicks { color: var(--sold); white-space: nowrap; }
`;

export const Chip = styled.span<{ $tone: "warn" | "info" | "bad" }>`
  display: inline-block;
  margin: 0 6px 6px 0;
  padding: 4px 10px;
  border-radius: 999px;
  font: 600 12px var(--font-body);
  background: ${(p) => (p.$tone === "bad" ? "rgba(220,38,38,0.1)" : p.$tone === "warn" ? "rgba(217,119,6,0.12)" : "rgba(20,21,24,0.06)")};
  color: ${(p) => (p.$tone === "bad" ? "#b91c1c" : p.$tone === "warn" ? "#b45309" : "var(--ink)")};
`;
