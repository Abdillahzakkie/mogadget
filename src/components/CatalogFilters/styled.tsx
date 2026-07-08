import styled, { css } from "styled-components";

export const Rail = styled.aside`
  display: flex;
  flex-direction: column;
`;

const groupLabelCss = css`
  font: 600 12px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(20, 21, 24, 0.6);
  margin-bottom: 10px;
  display: block;
`;

export const GroupLabel = styled.label`
  ${groupLabelCss}
`;

export const GroupHeading = styled.div`
  ${groupLabelCss}
  margin-top: 20px;
`;

const inputCss = css`
  width: 100%;
  padding: 9px 11px;
  border-radius: 9px;
  border: 1px solid rgba(20, 21, 24, 0.16);
  font: 400 15px var(--font-body);
  background: #fff;
`;

export const Input = styled.input`
  ${inputCss}
`;

export const PriceInput = styled(Input)`
  width: 50%;
`;

export const SortSelect = styled.select`
  ${inputCss}
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Chip = styled.button<{ $on: boolean }>`
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(20, 21, 24, 0.16);
  background: #fff;
  font: 500 13px var(--font-body);
  cursor: pointer;
  color: var(--ink);
  ${(p) =>
    p.$on &&
    css`
      background: var(--brand);
      color: #fff;
      border-color: var(--brand);
    `}
`;

export const CheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const CheckRow = styled.label`
  display: flex;
  gap: 8px;
  align-items: center;
  font: 400 15px var(--font-body);
  cursor: pointer;
`;

export const PriceRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const Muted = styled.span`
  color: var(--sold);
  font-size: 12px;
`;

export const ApplyButton = styled.button`
  margin-top: 16px;
  width: 100%;
  padding: 10px;
  border-radius: 9px;
  border: none;
  background: var(--ink);
  color: #fff;
  font: 600 14px var(--font-body);
  cursor: pointer;
`;

export const ClearButton = styled.button`
  margin-top: 16px;
  background: none;
  border: none;
  color: var(--danger);
  font: 500 14px var(--font-body);
  cursor: pointer;
  text-align: left;
  padding: 0;
`;
