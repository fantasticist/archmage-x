// https://tokenlists.org
// https://github.com/Uniswap/token-lists
// https://github.com/Uniswap/tokenlists-org
import { TokenList } from '@uniswap/token-lists'

import { fetchJsonWithCache } from '~lib/fetch'
import { IPFS_GATEWAY_API } from '~lib/services/datasource/ipfsGateway'
import { DEFAULT_EVM_TOKEN_LIST_URLS } from '~lib/services/datasource/tokenlists/defaultTokenLists'
import { EvmClient } from '~lib/services/provider/evm/client'

import validate from './validate'

class TokenListsApi {
  async getTokenList(url: string): Promise<TokenList | undefined> {
    const provider = await EvmClient.from('Ethereum Mainnet')

    let tokenList
    if (url.startsWith('https://') || url.startsWith('http://')) {
      tokenList = await fetchJsonWithCache(url, 1000 * 3600 * 24 * 7)
    } else {
      let ipfsHash
      if (!url.startsWith('ipfs://') && url.endsWith('.eth')) {
        const resolver = await provider.getResolver(url)
        if (!resolver) {
          return undefined
        }
        ipfsHash = await resolver.getContentHash()
        if (!ipfsHash) {
          return undefined
        }
      } else {
        ipfsHash = url
      }

      if (ipfsHash.startsWith('ipfs://')) {
        ipfsHash = ipfsHash.slice('ipfs://'.length)
      }

      tokenList = await IPFS_GATEWAY_API.fetch(ipfsHash, true)
    }

    // validate schema
    {
      const valid = validate(tokenList)
      if (!valid) {
        console.error(
          `validate token list from ${url}: ${(validate as any).errors?.map(
            (error: any) => {
              delete error.data
              return error
            }
          )}`
        )
        return undefined
      }
    }

    return tokenList
  }

  async getDefaultEvmTokenListUrls(): Promise<string[]> {
    return DEFAULT_EVM_TOKEN_LIST_URLS
  }

  async getTokenLists(
    urls: string[]
  ): Promise<{ url: string; tokenList: TokenList }[]> {
    let result: { url: string; tokenList: TokenList }[] = []
    for (const url of urls) {
      try {
        const tokenList = await this.getTokenList(url)
        if (tokenList) {
          result.push({ url, tokenList })
        }
      } catch (err) {
        console.error(`get token list from ${url}: ${err}`)
      }
    }
    return result
  }
}

export const TOKENLISTS_API = new TokenListsApi()
