import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

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

  code, pre {
    font-family: ${({ theme }) => theme.fonts.mono};
  }

  .ai-edit-changed-line {
    background: rgba(3, 239, 98, 0.12) !important;
  }
`;
