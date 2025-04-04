import { ChakraProvider } from '@chakra-ui/react'
import { HashRouter, Route, Routes } from 'react-router-dom'

import { QueryProvider } from '~components/QueryProvider'
import { useActiveBuild } from '~lib/active'
import { LanguageProvider } from '~lib/i18n'
import AddWalletPage from '~pages/AddWallet'
import PopupPage from '~pages/Popup'
import SettingsPage from '~pages/Settings'
import WelcomePage from '~pages/Welcome'
import { theme } from '~theme'

export default function Popup() {
  useActiveBuild()

  return (
    <QueryProvider>
      <LanguageProvider>
        <ChakraProvider resetCSS theme={theme}>
          <HashRouter>
            <Routes>
              <Route path="/*" element={<PopupPage />} />
              <Route
                path="/tab/*"
                element={
                  <Routes>
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/add-wallet" element={<AddWalletPage />} />
                    <Route path="/settings/*" element={<SettingsPage />} />
                  </Routes>
                }
              />
            </Routes>
          </HashRouter>
        </ChakraProvider>
      </LanguageProvider>
    </QueryProvider>
  )
}
