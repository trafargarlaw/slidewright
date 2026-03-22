import { createGlobalStyle } from 'styled-components'

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
    background: #15202B;
    font-family: ${({ theme }) => theme.fonts.body};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  code, pre {
    font-family: ${({ theme }) => theme.fonts.mono};
  }
`
