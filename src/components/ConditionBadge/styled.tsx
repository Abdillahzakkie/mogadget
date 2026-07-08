import styled, { css, type RuleSet } from "styled-components";

export type BadgeVariant = "new" | "used" | "sold";

const variantStyles: Record<BadgeVariant, RuleSet> = {
  new: css`
    background: var(--brand);
    color: #fff;
  `,
  used: css`
    border: 1.5px solid var(--amber);
    color: var(--amber-text);
  `,
  sold: css`
    border: 1.5px solid var(--sold);
    color: var(--sold);
  `,
};

export const Badge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font: 600 10px var(--font-body);
  letter-spacing: 0.07em;
  white-space: nowrap;
  ${({ $variant }) => variantStyles[$variant]}
`;
