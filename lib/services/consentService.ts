import { poll } from '@ethersproject/web'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import browser from 'webextension-polyfill'

import { setActiveNetwork } from '~lib/active'
import { ENV } from '~lib/env'
import { EXTENSION } from '~lib/extension'
import { NetworkKind } from '~lib/network'
import { Context, SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { ChainId, IChainAccount, INetwork, TokenVisibility } from '~lib/schema'
import { CONNECTED_SITE_SERVICE } from '~lib/services/connectedSiteService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { EvmProvider } from '~lib/services/provider/evm'
import {
  Provider,
  formatTxPayload,
  getProvider
} from '~lib/services/provider/provider'
import { TOKEN_SERVICE } from '~lib/services/token'
import { APTOS_TRANSACTION_SERVICE } from '~lib/services/transaction/aptosService'
import { EVM_TRANSACTION_SERVICE } from '~lib/services/transaction/evmService'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { SESSION_STORE, StoreKey, useSessionStorage } from '~lib/store'
import { createWindow } from '~lib/util'
import { canWalletSign } from '~lib/wallet'

export enum Permission {
  ACCOUNT = 'account'
}

export type RequestPermissionPayload = {
  permissions: { permission: Permission; data?: any }[]
}

export type AddNetworkPayload = {
  networkKind: NetworkKind
  chainId: ChainId
  info: any
}

export type WatchAssetPayload = {
  token: string
  info: any
  balance: string
}

export type SignMsgPayload = {
  message: string // hex string
  signature?: any
}

export type SignTypedDataPayload = {
  metadata: [string, string][]
  typedData: any
  originalTypedData?: any
  signature?: any
}

export enum ConsentType {
  UNLOCK = 'unlock',
  REQUEST_PERMISSION = 'requestPermission',
  TRANSACTION = 'transaction',
  SIGN_MSG = 'signMessage',
  SIGN_TYPED_DATA = 'signTypedData',
  WATCH_ASSET = 'watchAsset',
  ADD_NETWORK = 'addNetwork',
  SWITCH_NETWORK = 'switchNetwork'
}

export type ConsentRequest = {
  id: number
  networkId: number
  accountId: number | number[]
  type: ConsentType
  origin?: string
  payload: any
}

interface IConsentService {
  requestConsent(
    req: Omit<ConsentRequest, 'id'>,
    ctx?: Context,
    waitCompleted?: boolean
  ): Promise<any>

  getRequests(): Promise<ConsentRequest[]>

  clearRequests(type?: ConsentType): Promise<void>

  processRequest(req: ConsentRequest, approve: boolean): Promise<void>
}

// @ts-ignore
class ConsentServicePartial implements IConsentService {
  async processRequest(req: ConsentRequest, approve: boolean): Promise<void> {
    await (CONSENT_SERVICE as any).processRequestPre()

    let resolve, reject
    try {
      if (!approve) {
        throw ethErrors.provider.userRejectedRequest()
      }

      const { signedTx, txHash } =
        req.type === ConsentType.TRANSACTION
          ? await this.processRequestSignTx(req)
          : ({} as any)

      resolve = await (CONSENT_SERVICE as any).processRequestIntermediate(
        req,
        signedTx,
        txHash
      )
    } catch (err: any) {
      console.error(err)
      if (
        req.type === ConsentType.TRANSACTION &&
        !err.toString().includes('User rejected the request')
      ) {
        EXTENSION.showNotification(
          'Failed transaction',
          `Transaction encountered an error. (${err})`
        )
      }
      if (err instanceof Error) {
        err = Object.getOwnPropertyNames(err).reduce((o, k) => {
          o[k] = err[k]
          return o
        }, {} as any)
      }
      reject = err
    }

    await (CONSENT_SERVICE as any).processRequestPost(req, resolve, reject)
  }

  async processRequestSignTx(req: ConsentRequest) {
    let network: INetwork | undefined
    let accounts: IChainAccount[] | undefined
    let account: IChainAccount | undefined
    let provider: Provider | undefined
    if (req.networkId != null) {
      network = await NETWORK_SERVICE.getNetwork(req.networkId)
      assert(network)
      provider = await getProvider(network)
    }
    if (req.accountId != null) {
      accounts = await WALLET_SERVICE.getChainAccounts(
        Array.isArray(req.accountId) ? req.accountId : [req.accountId]
      )
      assert(accounts.length)
      account = accounts[0]
    }

    const payload = formatTxPayload(network!, req.payload)

    let { signedTx, txHash } = payload as any
    if (signedTx || txHash) {
      assert(network!.kind === NetworkKind.EVM)
    } else {
      signedTx = await provider!.signTransaction(account!, payload.txParams)
    }

    return {
      signedTx,
      txHash
    }
  }
}

class ConsentService extends ConsentServicePartial {
  private consentRequests: ConsentRequest[] = []
  private waits = new Map<number, [Function, Function]>()
  private nextId = 0
  private readonly initPromise: Promise<void>

  constructor() {
    super()

    this.initPromise = SESSION_STORE.get<ConsentRequest[]>(
      StoreKey.CONSENT_REQUESTS
    ).then(async (consentRequests) => {
      if (!consentRequests?.length) {
        if (!consentRequests) {
          await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, [])
        }
        return
      }
      this.consentRequests = consentRequests
      const lastId = consentRequests
        .map((req) => req.id)
        .reduce((maxId, id) => Math.max(maxId, id))
      this.nextId = lastId + 1

      this.setBadge().finally()
    })
  }

  async getRequests(): Promise<ConsentRequest[]> {
    await this.initPromise
    return this.consentRequests
  }

  async clearRequests(type?: ConsentType) {
    await this.initPromise

    const removed =
      type === undefined
        ? this.consentRequests
        : this.consentRequests.filter((req) => req.type === type)
    const removedSet = new Set(removed.map((req) => req.id))

    this.consentRequests = this.consentRequests.filter(
      (req) => !removedSet.has(req.id)
    )
    for (const [id, [_, reject]] of this.waits) {
      if (removedSet.has(id)) {
        reject(ethErrors.provider.userRejectedRequest())
        this.waits.delete(id)
      }
    }
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)

    await this.setBadge()
  }

  private async addRequest(request: ConsentRequest) {
    let index = 0
    if (this.consentRequests.length) {
      for (let i = this.consentRequests.length - 1; i >= 0; --i) {
        if (this.consentRequests[i].type === request.type) {
          index = i + 1
          break
        }
      }
    }

    if (index) {
      this.consentRequests.splice(index, 0, request)
    } else {
      this.consentRequests.push(request)
    }

    // cache
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)
  }

  // be called by content script
  async requestConsent(
    request: Omit<ConsentRequest, 'id'>,
    ctx?: Context,
    waitCompleted = true
  ): Promise<any> {
    // check wallet keystore ability for signing request
    switch (request.type) {
      case ConsentType.TRANSACTION:
      // pass through
      case ConsentType.SIGN_MSG:
      // pass through
      case ConsentType.SIGN_TYPED_DATA: {
        assert(!Array.isArray(request.accountId))
        const account = await WALLET_SERVICE.getChainAccount(request.accountId)
        assert(account)
        const wallet = await WALLET_SERVICE.getWallet(account.masterId)
        assert(wallet)
        if (!canWalletSign(wallet.type)) {
          throw ethErrors.provider.userRejectedRequest()
        }
        break
      }
    }

    await this.initPromise

    const req = {
      ...request,
      id: this.nextId++
    }
    await this.addRequest(req)

    let promise
    if (waitCompleted) {
      let resolve, reject
      promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      this.waits.set(req.id, [resolve as any, reject as any])
    }

    await this.setBadge()

    if (ctx && !ctx.fromInternal) {
      // open popup
      const window = await createWindow(ctx, '/')

      if (request.type === ConsentType.UNLOCK) {
        const listener = async (windowId: number) => {
          if (windowId !== window.id) {
            return
          }
          if (await PASSWORD_SERVICE.isLocked()) {
            await this.processRequest(req, false)
          }
          browser.windows.onRemoved.removeListener(listener)
        }
        browser.windows.onRemoved.addListener(listener)
      }
    }

    if (waitCompleted) {
      return await promise
    }
  }

  async processRequestPre() {
    await this.initPromise
  }

  async processRequestIntermediate(
    req: ConsentRequest,
    signedTx?: any,
    txHash?: string
  ) {
    if (req.type === ConsentType.UNLOCK) {
      return
    }

    let network: INetwork | undefined
    let accounts: IChainAccount[] | undefined
    let account: IChainAccount | undefined
    let provider: Provider | undefined
    if (req.networkId != null) {
      network = await NETWORK_SERVICE.getNetwork(req.networkId)
      assert(network)
      provider = await getProvider(network)
    }
    if (req.accountId != null) {
      accounts = await WALLET_SERVICE.getChainAccounts(
        Array.isArray(req.accountId) ? req.accountId : [req.accountId]
      )
      assert(accounts.length)
      account = accounts[0]
    }

    let response
    switch (req.type) {
      case ConsentType.REQUEST_PERMISSION:
        response = await (CONSENT_SERVICE as any).requestPermission(
          accounts!,
          req.origin!,
          req.payload
        )
        break
      case ConsentType.TRANSACTION: {
        const payload = formatTxPayload(network!, req.payload)

        let txResponse
        if (signedTx) {
          txResponse = await provider!.sendTransaction(signedTx)
        } else {
          assert(network!.kind === NetworkKind.EVM)
          try {
            const evmProvider = provider as EvmProvider
            const blockNumber =
              await evmProvider.provider._getInternalBlockNumber(
                100 + 2 * evmProvider.provider.pollingInterval
              )
            txResponse = await poll(
              async () => {
                const tx = await evmProvider.provider.getTransaction(txHash!)
                if (tx === null) {
                  return undefined
                }
                return evmProvider.provider._wrapTransaction(
                  tx,
                  txHash,
                  blockNumber
                )
              },
              { oncePoll: evmProvider.provider }
            )
          } catch (error: any) {
            console.error(error)
            // here do not throw
          }
        }

        switch (network!.kind) {
          case NetworkKind.EVM:
            if (txResponse) {
              await EVM_TRANSACTION_SERVICE.addPendingTx(
                account!,
                payload.txParams,
                txResponse,
                req.origin,
                payload.populatedParams?.functionSig
              )
            }
            break
          case NetworkKind.APTOS:
            await APTOS_TRANSACTION_SERVICE.addPendingTx(
              account!,
              { ...txResponse, type: 'pending_transaction' },
              { ...payload.populatedParams, type: 'user_transaction' },
              req.origin
            )
            break
        }

        if (txResponse) {
          response = txResponse
        } else {
          assert(network!.kind === NetworkKind.EVM)
          response = { hash: txHash }
        }
        break
      }
      case ConsentType.SIGN_MSG:
        const { message, signature } = req.payload as SignMsgPayload
        if (!signature) {
          response = await provider!.signMessage(account!, message)
        } else {
          response = signature
        }
        break
      case ConsentType.SIGN_TYPED_DATA: {
        const { typedData, signature } = req.payload as SignTypedDataPayload
        if (!signature) {
          response = await provider!.signTypedData(account!, typedData)
        } else {
          response = signature
        }
        break
      }
      case ConsentType.WATCH_ASSET: {
        const { token, info, balance } = req.payload as WatchAssetPayload
        const existing = await TOKEN_SERVICE.getToken({
          account: account!,
          token
        })
        if (existing) {
          if (existing.visible === TokenVisibility.SHOW) {
            throw ethErrors.rpc.invalidRequest('Token already exists')
          }
          await TOKEN_SERVICE.setTokenVisibility(
            existing.id,
            TokenVisibility.SHOW
          )
        } else {
          await TOKEN_SERVICE.addToken({
            account: account!,
            token,
            info: { info, balance }
          })
        }
        break
      }
      case ConsentType.ADD_NETWORK: {
        const { networkKind, chainId, info } = req.payload as AddNetworkPayload
        await NETWORK_SERVICE.addNetwork(networkKind, chainId, info)
        break
      }
      case ConsentType.SWITCH_NETWORK:
        await setActiveNetwork(network!.id)
        break
    }

    return response
  }

  async processRequestPost(
    req: ConsentRequest,
    resolveData: any,
    rejectData: any
  ) {
    let index = this.consentRequests.findIndex(({ id }) => req.id === id)
    if (index < 0) {
      throw new Error(`consent request with id ${req.id} not found`)
    }

    let resolve: any, reject: any
    const wait = this.waits.get(req.id)
    if (wait) {
      ;[resolve, reject] = wait
      this.waits.delete(req.id)
    }

    if (rejectData) {
      if ('message' in rejectData) {
        const err = new Error(rejectData['message'])
        Object.getOwnPropertyNames(rejectData).forEach(
          (k) => ((err as any)[k] = rejectData[k])
        )
        rejectData = err
      }
      reject?.(rejectData)
    } else {
      resolve?.(resolveData)
    }

    // delete cache
    this.consentRequests.splice(index, 1)
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)

    await this.setBadge()
  }

  private async requestPermission(
    accounts: IChainAccount[],
    origin: string,
    payload: RequestPermissionPayload
  ): Promise<any> {
    for (const { permission } of payload.permissions) {
      switch (permission) {
        case Permission.ACCOUNT:
          await CONNECTED_SITE_SERVICE.connectSiteWithReplace(accounts, origin)
      }
    }
  }

  private async setBadge() {
    if (!this.consentRequests.length) {
      await browser.action.setBadgeText({ text: '' })
    } else {
      await browser.action.setBadgeText({
        text: this.consentRequests.length + ''
      })
      await browser.action.setBadgeBackgroundColor({ color: '#037DD6' })
    }
  }
}

function createConsentService() {
  const serviceName = 'consentService'
  if (ENV.inServiceWorker) {
    const service = new ConsentService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IConsentService>(
      serviceName,
      // @ts-ignore
      new ConsentServicePartial()
    )
  }
}

export const CONSENT_SERVICE = createConsentService()

export function useConsentRequests(): ConsentRequest[] | undefined {
  const [requests] = useSessionStorage(StoreKey.CONSENT_REQUESTS)
  return requests
}
