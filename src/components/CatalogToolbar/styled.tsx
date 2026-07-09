import styled from "styled-components";

export const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

export const Search = styled.input`
  flex: 1 1 220px;
  min-width: 180px;
  padding: 8px 12px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 14px var(--font-body);
`;

export const Select = styled.select`
  padding: 8px 10px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 13px var(--font-body);
  background: #fff;
`;

export const PriceInput = styled.input`
  width: 110px;
  padding: 8px 10px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 13px var(--font-body);
`;

export const Reset = styled.button`
  padding: 8px 12px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  background: #fff;
  font: 600 13px var(--font-body);
  cursor: pointer;
`;

export const Count = styled.span`
  margin-left: auto;
  color: var(--sold);
  font: 500 13px var(--font-body);
`;
