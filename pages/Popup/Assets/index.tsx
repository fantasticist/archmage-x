import {
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  Stack,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'
import { MdMoreVert } from 'react-icons/md'

import {
  useConnectedSitesBySite,
  useConnectedSitesByWallet
} from '~lib/services/connectedSiteService'
import { usePrice } from '~lib/services/datasource/cryptocompare'
import { useBalance } from '~lib/services/provider'
import { useChainAccountByIndex } from '~lib/services/walletService'
import { useCurrentTab } from '~lib/util'
import { shortenAddress } from '~lib/utils'

import { useActiveWallet, useSelectedNetwork } from '../select'

export default function Assets() {
  const { wallet, subWallet } = useActiveWallet()
  const { selectedNetwork: network } = useSelectedNetwork()

  const account = useChainAccountByIndex(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )

  const tab = useCurrentTab()
  const origin = tab?.url && new URL(tab.url).origin

  const conns = useConnectedSitesBySite()
  const connected =
    account &&
    conns &&
    conns.find(
      (conn) =>
        conn.masterId === account.masterId && conn.index === account.index
    )

  const { hasCopied, onCopy } = useClipboard('')

  const balance = useBalance(network, account)
  const price = usePrice(balance?.symbol)

  return (
    <Stack w="full" pt={4} spacing={8}>
      <Stack w="full" spacing={4}>
        <HStack justify="space-between" minH={16}>
          <Tooltip
            label={
              origin && !origin.startsWith('chrome')
                ? (connected ? 'Connected to ' : 'Not connected to ') + origin
                : ''
            }
            placement="top-start">
            <IconButton
              variant="ghost"
              aria-label="Show accounts connected to this site"
              icon={
                connected ? (
                  <Center w="4" h="4" borderRadius="50%" bg={'green.500'} />
                ) : (
                  <Center
                    w="4"
                    h="4"
                    borderRadius="50%"
                    borderWidth="2px"
                    borderColor="red.500"
                  />
                )
              }
            />
          </Tooltip>

          <Tooltip
            label={!hasCopied ? 'Copy Address' : 'Copied'}
            placement="top">
            <Button
              variant="ghost"
              size="lg"
              h={16}
              maxW={64}
              px={2}
              colorScheme="purple"
              onClick={!hasCopied ? onCopy : undefined}>
              <Stack>
                <HStack justify="center" fontSize="lg" spacing={1}>
                  <Text
                    noOfLines={1}
                    display="block"
                    maxW={subWallet?.name ? '98px' : '196px'}>
                    {wallet?.name}
                  </Text>
                  {subWallet?.name && (
                    <>
                      <Text>/</Text>
                      <Text noOfLines={1} display="block" maxW="98px">
                        {subWallet.name}
                      </Text>
                    </>
                  )}
                </HStack>
                <HStack justify="center" color="gray.500" ps={5}>
                  <Text fontSize="md">{shortenAddress(account?.address)}</Text>
                  <Icon w={3} h={3} as={!hasCopied ? FiCopy : FiCheckCircle} />
                </HStack>
              </Stack>
            </Button>
          </Tooltip>

          <Menu>
            <MenuButton
              variant="ghost"
              as={IconButton}
              icon={<Icon as={MdMoreVert} fontSize="xl" />}
            />
          </Menu>
        </HStack>

        <Divider />
      </Stack>

      <HStack justify="center" minH={16}>
        <Stack spacing={0} align="center">
          <Text fontSize="4xl" fontWeight="medium">
            {balance?.amount} {balance?.symbol}
          </Text>
          {price && (
            <>
              <Text fontSize="xl" fontWeight="medium" color="gray.500">
                {price.displayPrice}
              </Text>
              {price.change24Hour !== undefined && (
                <HStack
                  color={price.change24Hour >= 0 ? 'green.500' : 'red.500'}>
                  <Text fontSize="lg">
                    {price.change24Hour >= 0 ? '+' : '-'}
                    {price.displayChange24Hour}
                  </Text>
                  <Text fontSize="lg">
                    {price.change24Hour >= 0 ? '+' : '-'}
                    {price.displayChangePercent24Hour}%
                  </Text>
                </HStack>
              )}
            </>
          )}
        </Stack>
      </HStack>

      <HStack justify="center" spacing={4}>
        <Button size="md" w={28}>
          Deposit
        </Button>
        <Button size="md" w={28}>
          Send
        </Button>
      </HStack>
    </Stack>
  )
}
