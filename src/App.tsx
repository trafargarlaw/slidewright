import { ThemeProvider } from 'styled-components'
import { theme } from './styles/theme'
import { GlobalStyle } from './styles/GlobalStyle'
import { ShikiProvider } from './context/ShikiContext'
import { Deck } from './components/Deck'
import slidesData from 'virtual:slides'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <ShikiProvider>
        <Deck slides={slidesData.slides} />
      </ShikiProvider>
    </ThemeProvider>
  )
}
