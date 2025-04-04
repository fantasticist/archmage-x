import { Box, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { useTransparentize } from '~lib/hooks/useColor'

export type AlertLevel = 'info' | 'warning' | 'error'

interface AlertBoxProps {
  level?: AlertLevel
  nowrap?: boolean
  children: ReactNode
}

export const AlertBox = ({
  level = 'warning',
  nowrap = false,
  children
}: AlertBoxProps) => {
  let bgColor, borderColor
  switch (level) {
    case 'info':
      bgColor = 'blue.300'
      borderColor = 'blue.500'
      break
    case 'warning':
      bgColor = 'orange.300'
      borderColor = 'orange.500'
      break
    case 'error':
      bgColor = 'red.300'
      borderColor = 'red.500'
      break
  }

  const bg = useTransparentize(bgColor, bgColor, 0.1)

  if (!children) {
    return <></>
  }

  return (
    <Box
      py="2"
      px="4"
      borderRadius="4px"
      borderWidth="1px"
      borderColor={borderColor}
      bg={bg}>
      {!nowrap ? <Text>{children}</Text> : children}
    </Box>
  )
}
