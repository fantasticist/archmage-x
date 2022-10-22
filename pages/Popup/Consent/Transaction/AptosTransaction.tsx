import { EditIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  Image,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import { TxnBuilderTypes, Types } from 'aptos'
import Decimal from 'decimal.js'
import * as React from 'react'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { BiQuestionMark } from 'react-icons/bi'

import { AlertBox } from '~components/AlertBox'
import { SpinningOverlay } from '~components/SpinningOverlay'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import { formatTxPayload, useNonce } from '~lib/services/provider'
import { DEFAULT_TXN_EXP_SEC_FROM_NOW } from '~lib/services/provider/aptos/provider'
import { Balance } from '~lib/services/token'
import { TransactionType } from '~lib/services/transaction'
import {
  extractAptosFunctionIdentifier,
  parseAptosTxInfo
} from '~lib/services/transaction/aptosParse'
import { shortenAddress } from '~lib/utils'
import {
  AptosTransactionChanges,
  AptosTransactionEvents,
  AptosTransactionPayload
} from '~pages/Popup/Consent/Transaction/AptosTransactionData'
import { FromToWithCheck } from '~pages/Popup/Consent/Transaction/FromTo'

import { useTabsHeaderScroll } from './helpers'

export const AptosTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account,
  balance,
  suffix,
  onComplete
}: {
  origin?: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  balance?: Balance
  suffix?: ReactNode
  onComplete: () => void
}) => {
  const payload = formatTxPayload(network, request.payload)
  const { txParams, populatedParams } = payload as {
    txParams: TxnBuilderTypes.RawTransaction
    populatedParams: Types.UserTransaction
  }
  console.log(txParams, populatedParams)

  const userTx = useMemo(
    () => ({
      ...populatedParams,
      type: 'user_transaction'
    }),
    [populatedParams]
  )

  const txInfo = useMemo(
    () => parseAptosTxInfo(account.address!, userTx),
    [account, userTx]
  )
  const [moduleAddr, moduleName, funcName] = extractAptosFunctionIdentifier(
    txInfo.function
  )

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const [gasPrice, setGasPrice] = useState(
    new Decimal(+populatedParams.gas_unit_price)
      .div(new Decimal(10).pow(networkInfo.decimals))
      .toDecimalPlaces(networkInfo.decimals)
      .toNumber()
  )
  const [sequenceNumber, setSequenceNumber] = useState(
    +populatedParams.sequence_number
  )
  const [gasLimit, setGasLimit] = useState(+populatedParams.max_gas_amount)
  const [expirationSecs, setExpirationSecs] = useState(
    DEFAULT_TXN_EXP_SEC_FROM_NOW
  )

  const [editGasPrice, setEditGasPrice] = useState(false)
  const [editSequenceNumber, setEditSequenceNumber] = useState(false)
  const [editGasLimit, setEditGasLimit] = useState(false)
  const [editExpirationSecs, setEditExpirationSecs] = useState(false)

  const gasUsed = +populatedParams.gas_used
  const gasFee = useMemo(() => {
    return new Decimal(populatedParams.gas_used)
      .mul(gasPrice)
      .toDecimalPlaces(networkInfo.decimals)
      .toString()
  }, [networkInfo, populatedParams, gasPrice])

  const managedSequenceNumber = useNonce(network, account)
  useEffect(() => {
    if (editSequenceNumber || managedSequenceNumber === undefined) {
      return
    }
    setSequenceNumber(managedSequenceNumber)
  }, [editSequenceNumber, managedSequenceNumber])

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const value = useMemo(
    () =>
      txInfo.amount
        ? new Decimal(txInfo.amount).div(
            new Decimal(10).pow(networkInfo.decimals)
          )
        : undefined,
    [txInfo, networkInfo]
  )

  const insufficientBalance = !balance

  const onConfirm = useCallback(async () => {}, [])

  return (
    <>
      <Stack>
        <Center pt={2} px={6}>
          <Box px={2} py={1} borderRadius="8px" borderWidth="1px">
            <Text noOfLines={1} display="block" fontSize="sm">
              {networkInfo.name}
            </Text>
          </Box>
        </Center>

        <Divider />

        <Box px={6}>
          <FromToWithCheck
            subWallet={subWallet}
            from={populatedParams.sender}
            to={txInfo.to}
          />
        </Box>

        <Divider />
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={6} spacing={4}>
            {origin && <Text>{origin}</Text>}

            <HStack minH="30px">
              <HStack
                px={2}
                py={1}
                borderRadius="4px"
                borderWidth="1px"
                maxW="full">
                {txInfo.type === TransactionType.Send ? (
                  <Text fontSize="md" color="gray.500">
                    {`Send ${networkInfo.currencySymbol}`.toUpperCase()}
                  </Text>
                ) : txInfo.type === TransactionType.DeployContract ? (
                  <Text fontSize="md" color="gray.500">
                    {'Deploy Module'.toUpperCase()}
                  </Text>
                ) : (
                  <Text fontSize="md" noOfLines={3}>
                    <chakra.span color="blue.500">
                      {shortenAddress(moduleAddr)}
                    </chakra.span>
                    <chakra.span color="gray.500">&nbsp;::&nbsp;</chakra.span>
                    <chakra.span color="orange.500">{moduleName}</chakra.span>
                    <chakra.span color="gray.500">
                      &nbsp;::&nbsp;{funcName}
                    </chakra.span>
                  </Text>
                )}
              </HStack>
            </HStack>

            <Stack>
              <HStack>
                {price && (
                  <Image
                    borderRadius="full"
                    boxSize="30px"
                    fit="cover"
                    src={price.imageUrl}
                    fallback={
                      <Center
                        w="30px"
                        h="30px"
                        borderRadius="full"
                        borderWidth="1px"
                        borderColor="gray.500">
                        <Icon as={BiQuestionMark} fontSize="3xl" />
                      </Center>
                    }
                    alt="Currency Logo"
                  />
                )}

                <Text fontSize="2xl" fontWeight="medium">
                  {formatNumber(value)} {networkInfo.currencySymbol}
                </Text>
              </HStack>

              {price && value && (
                <Text ps="15px">
                  {price.currencySymbol}&nbsp;
                  {formatNumber(value.mul(price.price || 0))}
                </Text>
              )}
            </Stack>
          </Stack>
          <Divider />
        </Box>

        <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
          <Tabs w="full" px={6} index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>DETAILS</Tab>
              <Tab>PAYLOAD</Tab>
              <Tab>EVENTS</Tab>
              <Tab>CHANGES</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={16}>
                  <Stack spacing={8}>
                    <AlertBox level="error" nowrap>
                      <Text>
                        We were not able to estimate gas. There might be an
                        error in the contract and this transaction may fail.
                      </Text>
                      {!ignoreEstimateError && (
                        <Text
                          color="purple.500"
                          fontWeight="medium"
                          cursor="pointer"
                          onClick={() => {
                            setIgnoreEstimateError(true)
                          }}>
                          I want to proceed anyway
                        </Text>
                      )}
                    </AlertBox>
                  </Stack>

                  <Stack spacing={6}>
                    <HStack justify="space-between">
                      <Text>
                        Gas Fee&nbsp;
                        <chakra.span fontSize="md" fontStyle="italic">
                          estimated
                        </chakra.span>
                      </Text>

                      <Text>
                        {gasFee} {networkInfo.currencySymbol}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Gas Unit Price</Text>

                      {!editGasPrice ? (
                        <HStack>
                          <Text>
                            {gasPrice} {networkInfo.currencySymbol}
                          </Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditGasPrice(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <HStack>
                          <NumberInput
                            maxW={48}
                            min={0}
                            step={new Decimal(1)
                              .div(new Decimal(10).pow(networkInfo.decimals))
                              .toNumber()}
                            keepWithinRange
                            allowMouseWheel
                            precision={networkInfo.decimals}
                            value={gasPrice}
                            onChange={(_, val) => setGasPrice(val)}>
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>

                          <Text> {networkInfo.currencySymbol}</Text>
                        </HStack>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Sequence Number</Text>

                      {!editSequenceNumber ? (
                        <HStack>
                          <Text>{sequenceNumber}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditSequenceNumber(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={sequenceNumber}
                          onChange={(_, val) => setSequenceNumber(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>
                        Gas Used&nbsp;
                        <chakra.span fontSize="md" fontStyle="italic">
                          estimated
                        </chakra.span>
                        &nbsp;(Units)
                      </Text>

                      <Text>{gasUsed}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Max Gas Limit (Units)</Text>

                      {!editGasLimit ? (
                        <HStack>
                          <Text>{gasLimit}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditGasLimit(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={gasLimit}
                          onChange={(_, val) => setGasLimit(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Expiration Time (Seconds)</Text>

                      {!editExpirationSecs ? (
                        <HStack>
                          <Text>{expirationSecs}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditExpirationSecs(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={expirationSecs}
                          onChange={(_, val) => setExpirationSecs(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>
                  </Stack>
                </Stack>
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionPayload tx={userTx} />
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionEvents tx={userTx} />
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionChanges tx={userTx} />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          {insufficientBalance === true && (
            <AlertBox level="error">
              You do not have enough {networkInfo.currencySymbol} in your
              account to pay for transaction fees on Ethereum Mainnet network.
              Buy {networkInfo.currencySymbol} or deposit from another account.
            </AlertBox>
          )}

          <HStack justify="center" spacing={12}>
            <Button
              size="lg"
              w={36}
              variant="outline"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(
                  { id: request.id } as ConsentRequest,
                  false
                )
                onComplete()
              }}>
              Reject
            </Button>
            <Button
              size="lg"
              w={36}
              colorScheme="purple"
              isDisabled={!ignoreEstimateError || insufficientBalance !== false}
              onClick={onConfirm}>
              Confirm
            </Button>
          </HStack>

          {suffix}
        </Stack>
      </Box>

      <SpinningOverlay loading={spinning} />
    </>
  )
}
