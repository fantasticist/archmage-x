import { FunctionFragment } from '@ethersproject/abi'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'
import { AccessListish } from '@ethersproject/transactions'

import { TransactionPayload } from '~lib/services/provider'

export type EvmTxParams = {
  to?: string
  from?: string
  nonce?: BigNumberish // ignored from user

  gasLimit?: BigNumberish // gas limit
  gasPrice?: BigNumberish

  data?: BytesLike
  value?: BigNumberish
  chainId?: number

  type?: number
  accessList?: AccessListish

  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
}

export type EvmTxPopulatedParams = {
  functionSig?: FunctionFragment

  gasPrice?: BigNumberish
  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
  code?: string
  error?: string
}

export const allowedTransactionKeys: Array<string> = [
  'accessList',
  'chainId',
  'data',
  'from',
  'gas',
  'gasLimit',
  'gasPrice',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'nonce',
  'to',
  'type',
  'value'
]

export function formatEvmTxParams(payload: {
  txParams?: EvmTxParams
  populatedParams?: EvmTxPopulatedParams
}): TransactionPayload {
  const { txParams, populatedParams } = payload

  if (txParams) {
    if (txParams.nonce) txParams.nonce = BigNumber.from(txParams.nonce)
    if (txParams.gasLimit) txParams.gasLimit = BigNumber.from(txParams.gasLimit)
    if (txParams.gasPrice) txParams.gasPrice = BigNumber.from(txParams.gasPrice)
    if (txParams.value) txParams.value = BigNumber.from(txParams.value)
    if (txParams.maxPriorityFeePerGas)
      txParams.maxPriorityFeePerGas = BigNumber.from(
        txParams.maxPriorityFeePerGas
      )
    if (txParams.maxFeePerGas)
      txParams.maxFeePerGas = BigNumber.from(txParams.maxFeePerGas)
  }

  if (populatedParams) {
    if (populatedParams.gasPrice)
      populatedParams.gasPrice = BigNumber.from(populatedParams.gasPrice)
    if (populatedParams.maxPriorityFeePerGas)
      populatedParams.maxPriorityFeePerGas = BigNumber.from(
        populatedParams.maxPriorityFeePerGas
      )
    if (populatedParams.maxFeePerGas)
      populatedParams.maxFeePerGas = BigNumber.from(
        populatedParams.maxFeePerGas
      )
  }

  return payload as TransactionPayload
}
