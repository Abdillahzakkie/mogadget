import styled from "styled-components";

export const Wrap = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
`;

export const Card = styled.form`
  width: 100%;
  max-width: 360px;
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
`;

export const Wordmark = styled.div`
  font: 700 26px var(--font-display);
  margin-bottom: 4px;
`;

export const WordmarkAccent = styled.span`
  color: var(--brand);
`;

export const SubTitle = styled.div`
  color: var(--sold);
  font-size: 13px;
  margin-bottom: 20px;
`;

export const FieldLabel = styled.label`
  font: 500 12px var(--font-body);
  color: rgba(20, 21, 24, 0.6);
  margin: 12px 0 6px;
`;

export const TextInput = styled.input`
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font-body);
  background: var(--paper);
`;

export const ErrorNote = styled.div`
  color: var(--danger);
  font-size: 13px;
  margin-top: 12px;
`;

export const SubmitButton = styled.button<{ $busy: boolean }>`
  margin-top: 22px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--brand);
  color: #fff;
  font: 600 15px var(--font-body);
  cursor: pointer;
  opacity: ${({ $busy }) => ($busy ? 0.6 : 1)};
`;

export const PasskeyButton = styled.button`
  margin-top: 12px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  background: transparent;
  color: var(--ink);
  font: 600 14px var(--font-body);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 2px;
  color: var(--sold);
  font-size: 12px;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(20, 21, 24, 0.12);
  }
`;
