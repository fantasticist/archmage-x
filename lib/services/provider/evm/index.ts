import { BigNumber } from '@ethersproject/bignumber'
import { hexlify } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { resolveProperties } from '@ethersproject/properties'
import {
  UrlJsonRpcProvider as BaseUrlJsonRpcProvider,
  BlockTag
} from '@ethersproject/providers'
import { version } from '@ethersproject/providers/lib/_version'
import { ConnectionInfo } from '@ethersproject/web'

import { EvmChainInfo } from '~lib/network/evm'
import { IChainAccount, INetwork } from '~lib/schema'
import { ProviderAdaptor } from '~lib/services/provider/types'
import { getSigningWallet } from '~lib/wallet'

const logger = new Logger(version)

export type EthFeeHistoryResponse = {
  oldestBlock: number
  baseFeePerGas?: BigNumber[]
  gasUsedRatio: number[]
  reward?: BigNumber[][]
}

class UrlJsonRpcProvider extends BaseUrlJsonRpcProvider {
  async getFeeHistory(
    numberOfBlocks: number,
    endBlockTag: BlockTag | Promise<BlockTag>,
    percentiles: number[]
  ): Promise<EthFeeHistoryResponse> {
    await this.getNetwork()

    const params = await resolveProperties({
      numberOfBlocks,
      endBlockTag: this._getBlockTag(endBlockTag),
      percentiles
    })

    const result = await this.perform('getFeeHistory', params)
    try {
      return {
        oldestBlock: BigNumber.from(result.oldestBlock).toNumber(),
        baseFeePerGas: result.baseFeePerGas?.map((f: string) =>
          BigNumber.from(f)
        ),
        gasUsedRatio: result.gasUsedRatio,
        reward: result.reward?.map((reward: string[]) =>
          reward.map((r: string) => BigNumber.from(r))
        )
      } as EthFeeHistoryResponse
    } catch (error) {
      return logger.throwError(
        'bad result from backend',
        Logger.errors.SERVER_ERROR,
        {
          method: 'getFeeHistory',
          params,
          result,
          error
        }
      )
    }
  }

  prepareRequest(method: string, params: any): [string, Array<any>] {
    switch (method) {
      case 'getFeeHistory':
        return [
          'eth_feeHistory',
          [
            hexlify(params.numberOfBlocks),
            hexlify(params.endBlockNumber),
            params.percentiles
          ]
        ]
      default:
        return super.prepareRequest(method, params)
    }
  }
}

export class EvmProvider extends UrlJsonRpcProvider {
  private static providers = new Map<number, EvmProvider>()

  static async from(network: INetwork): Promise<EvmProvider> {
    const info = network.info as EvmChainInfo
    const cached = await EvmProvider.providers.get(+network.chainId)
    if (cached) {
      const net = (await cached.getNetwork()) as Network & {
        rpcUrls: string[]
      }
      if (
        net.name === info.name &&
        net.ensAddress === info.ens?.registry &&
        net.rpcUrls.length === info.rpc.length &&
        net.rpcUrls.every((url, i) => url === info.rpc[i])
      ) {
        // all the same, so return cached
        return cached
      }
    }

    const provider = new EvmProvider(network)
    EvmProvider.providers.set(+network.chainId, provider)
    return provider
  }

  constructor(network: INetwork) {
    const info = network.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +network.chainId,
      ensAddress: info.ens?.registry,
      rpcUrls: info.rpc // extra field
    } as Network)
  }

  static getUrl(network: Network, apiKey: any): ConnectionInfo {
    const rpcUrls: string[] = (network as any).rpcUrls
    if (!rpcUrls?.length) {
      throw new Error('empty evm rpc urls')
    }
    return { url: rpcUrls[0], allowGzip: true } as ConnectionInfo
  }

  async getBlockInterval(): Promise<number> {
    const thisBlock = await this.getBlock('latest')
    const lastBlock = await this.getBlock(thisBlock.number - 1)
    return thisBlock.timestamp - lastBlock.timestamp // seconds
  }
}

export class EvmProviderAdaptor implements ProviderAdaptor {
  private constructor(public provider: EvmProvider) {}

  static async from(network: INetwork): Promise<EvmProviderAdaptor> {
    const provider = await EvmProvider.from(network)
    return new EvmProviderAdaptor(provider)
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address)
    return balance.toString()
  }

  async getTransactions(address: string): Promise<any> {
    // TODO
    return
  }

  async signTransaction(wallet: IChainAccount, transaction: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    return signer.signTransaction(transaction)
  }

  async sendTransaction(signedTransaction: any): Promise<any> {
    return this.provider.sendTransaction(signedTransaction)
  }

  async signMessage(wallet: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    return signer.signMessage(message)
  }

  async signTypedData(wallet: IChainAccount, typedData: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    return signer.signTypedData(typedData)
  }
}
