"use client";

import styled from "styled-components";

// Page shells used by the server route-group layouts (client components so styled-
// components can style them; children stay server-rendered).
export const SiteMain = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px;
  min-height: 60vh;
`;

export const PanelRoot = styled.div`
  min-height: 100vh;
`;

export const PanelContainer = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px;
`;
