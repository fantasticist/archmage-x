import { Button, Center, Divider, Icon, Stack, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { MdReadMore } from 'react-icons/md'

import { createTab } from '~lib/util'
import { useForPopupSettings } from '~pages/Settings/SettingItem'
import {
  SettingsGeneralLockTime,
  SettingsGeneralQuoteCurrency,
  SettingsGeneralTheme
} from '~pages/Settings/SettingsGeneral'

export default function Settings() {
  const [, setForPopupSettings] = useForPopupSettings()
  useEffect(() => {
    setForPopupSettings(true)
  }, [setForPopupSettings])

  return (
    <Stack px={8} pt={2} pb={6} spacing={6}>
      <Text textAlign="center" fontSize="3xl" fontWeight="medium">
        Settings
      </Text>

      <Divider />

      <SettingsGeneralTheme />

      <SettingsGeneralQuoteCurrency />

      <SettingsGeneralLockTime />

      <Center>
        <Button
          w={56}
          size="md"
          leftIcon={<Icon color="gray.500" as={MdReadMore} />}
          variant="ghost"
          onClick={() => {
            createTab('#/tab/settings/general')
          }}>
          <Text color="gray.500">More Settings</Text>
        </Button>
      </Center>
    </Stack>
  )
}
