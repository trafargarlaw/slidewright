import { createGlobalStyle } from "styled-components";

// Unlayered rules here beat every cascade layer, including the deck's, so
// resets belong in Tailwind's base layer (global.css), not here.
export const GlobalStyle = createGlobalStyle`
  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #e8e8e8;
    font-family: ${({ theme }) => theme.fonts.body};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    display: flex;
  }

  .ai-edit-changed-line {
    background: rgba(3, 239, 98, 0.12) !important;
  }
`;
