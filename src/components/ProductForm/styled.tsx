"use client";

import styled, { css } from "styled-components";

export const StyledForm = styled.form`
  max-width: 720px;
`;

export const ErrorBox = styled.div`
  background: rgba(196, 55, 47, 0.08);
  color: var(--danger);
  border: 1px solid rgba(196, 55, 47, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
`;

export const FieldWrap = styled.div`
  margin-bottom: 16px;
  flex: 1;
`;

export const FieldLabel = styled.div`
  font: 500 12px var(--font-body);
  color: rgba(20, 21, 24, 0.6);
  margin-bottom: 6px;
`;

export const FormRow = styled.div`
  display: flex;
  gap: 16px;
`;

const inputCss = css`
  width: 100%;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font-body);
  background: #fff;
`;

export const TextInput = styled.input`
  ${inputCss}
`;

export const Select = styled.select`
  ${inputCss}
`;

export const TextArea = styled.textarea`
  ${inputCss}
  height: 96px;
  padding: 12px;
  resize: vertical;
`;

export const SpecsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SpecRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const SpecLabelInput = styled(TextInput)`
  flex: 0 0 200px;
`;

export const SpecValueInput = styled(TextInput)`
  flex: 1;
`;

export const GhostButton = styled.button`
  height: 42px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  background: transparent;
  color: var(--ink);
  font: 500 13px var(--font-body);
  cursor: pointer;
`;

export const AddSpecButton = styled(GhostButton)`
  align-self: flex-start;
`;

export const ThumbGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
`;

export const ThumbCard = styled.div`
  width: 96px;
`;

export const Thumb = styled.div<{ $src: string }>`
  width: 96px;
  height: 96px;
  border-radius: 10px;
  background: #eceae3;
  background-size: cover;
  background-position: center;
  background-image: ${({ $src }) => `url(${$src})`};
`;

export const ThumbActions = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

export const MiniButton = styled.button`
  padding: 3px 8px;
  border-radius: 7px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  background: #fff;
  cursor: pointer;
  font-size: 12px;
`;

export const RemoveMiniButton = styled(MiniButton)`
  color: var(--danger);
`;

export const UploadingNote = styled.span`
  margin-left: 10px;
  color: var(--sold);
  font-size: 13px;
`;

export const ActionsRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
`;

export const PrimaryButton = styled.button<{ $busy: boolean }>`
  height: 44px;
  padding: 0 22px;
  border-radius: 10px;
  border: none;
  background: var(--brand);
  color: #fff;
  font: 600 15px var(--font-body);
  cursor: pointer;
  opacity: ${({ $busy }) => ($busy ? 0.6 : 1)};
`;

export const DangerButton = styled.button`
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  font: 600 14px var(--font-body);
  cursor: pointer;
`;
