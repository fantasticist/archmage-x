import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { TransactionDescription } from '@ethersproject/abi'
import {
  FormatTypes,
  FunctionFragment
} from '@ethersproject/abi/src.ts/fragments'
import { BigNumber } from '@ethersproject/bignumber'
import { shallowCopy } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import { ethers } from 'ethers'
import * as React from 'react'
import { useMemo } from 'react'
import ReactJson from 'react-json-view'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import solidity from 'react-syntax-highlighter/dist/esm/languages/prism/solidity'
import prismDarkStyle from 'react-syntax-highlighter/dist/esm/styles/prism/dracula'
import prismLightStyle from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'

import { CopyArea } from '~components/CopyIcon'

SyntaxHighlighter.registerLanguage('solidity', solidity)

export const EvmTransactionData = ({
  tx,
  description,
  showHex
}: {
  tx?: TransactionRequest
  description?: TransactionDescription
  showHex?: boolean
}) => {
  const hex = tx?.data?.length ? ethers.utils.hexlify(tx.data) : undefined

  const [signature, args] = useMemo(() => {
    if (!description) {
      return []
    }

    const formatArg = (arg: any): any => {
      if (Array.isArray(arg)) {
        return arg.map(formatArg)
      }
      if (BigNumber.isBigNumber(arg)) {
        try {
          return arg.toNumber()
        } catch {
          return arg.toString()
        }
      }
      return arg
    }

    const fragment = shallowCopy(description.functionFragment)
    delete (fragment as any)._isFragment
    const signature = FunctionFragment.from(fragment).format(FormatTypes.full)

    const args = description.functionFragment.inputs.map((input, i) => {
      return {
        [`${input.type} ${input.name}`.trim()]: formatArg(description.args[i])
      }
    })

    return [signature, args]
  }, [description])

  const prismStyle = useColorModeValue(prismLightStyle, prismDarkStyle)

  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      {signature && (
        <Stack>
          <Text>Function:</Text>
          <Box
            borderRadius="8px"
            borderWidth="1px"
            borderColor="gray.500"
            px={4}
            py={2}
            bg={rjvBg}>
            <SyntaxHighlighter
              language="solidity"
              style={prismStyle}
              wrapLongLines
              customStyle={{
                padding: 0,
                background: 'inherit',
                border: 'none',
                borderRadius: 'unset',
                boxShadow: 'none'
              }}>
              {signature}
            </SyntaxHighlighter>
          </Box>
        </Stack>
      )}

      {!showHex && args && (
        <Stack>
          <Text>Arguments:</Text>
          <Box
            maxH="full"
            w="full"
            overflow="auto"
            borderRadius="8px"
            borderWidth="1px"
            borderColor="gray.500"
            px={4}
            py={2}
            bg={rjvBg}>
            <ReactJson
              src={args}
              name={false}
              theme={rjvTheme}
              iconStyle="triangle"
              collapsed={3}
              enableClipboard={false}
              displayDataTypes={false}
              displayArrayKey={false}
            />
          </Box>
        </Stack>
      )}

      {showHex && hex && (
        <Stack>
          <Text>HEX Data:</Text>
          <CopyArea name="Data" copy={hex} props={{ noOfLines: 100 }} />
        </Stack>
      )}

      {!args && !hex && (
        <Text textAlign="center" color="gray.500">
          No data
        </Text>
      )}
    </Stack>
  )
}
