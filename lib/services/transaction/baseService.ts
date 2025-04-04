import Dexie from 'dexie'

import { DB } from '~lib/db'
import { EXTENSION } from '~lib/extension'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getTransactionUrl } from '~lib/services/network'
import {
  TransactionStatus,
  getTransactionInfo
} from '~lib/services/transaction/index'

import { PENDING_TX_CHECKER } from './check'

export abstract class BaseTransactionService {
  async getPendingTxCount(account: IChainAccount): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address
      ])
      .count()
  }

  async getTransactionCount(
    account: IChainAccount,
    type: string
  ): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address,
        type
      ])
      .count()
  }

  async getPendingTxs(
    account: IChainAccount,
    limit?: number,
    reverse = true,
    lastNonce?: number
  ): Promise<IPendingTx[]> {
    if (!account.address) {
      return []
    }
    let collection = DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          Dexie.minKey
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          lastNonce !== undefined && lastNonce !== null
            ? lastNonce
            : Dexie.maxKey
        ]
      )

    collection = reverse ? collection.reverse() : collection

    collection =
      typeof limit === 'number' ? collection.limit(limit) : collection

    return collection.toArray()
  }

  async getTransactions(
    account: IChainAccount,
    type: string,
    limit: number = 100,
    lastIndex1?: number,
    lastIndex2?: number
  ): Promise<ITransaction[]> {
    if (!account.address) {
      return []
    }
    return DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type+index1+index2]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          type,
          Dexie.minKey,
          Dexie.minKey
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          type,
          lastIndex1 !== undefined && lastIndex1 !== null
            ? lastIndex1
            : Dexie.maxKey,
          lastIndex2 !== undefined && lastIndex2 !== null
            ? lastIndex2
            : Dexie.maxKey
        ]
      )
      .reverse()
      .limit(limit)
      .toArray()
  }

  async getPendingTx(id: number): Promise<IPendingTx | undefined> {
    return DB.pendingTxs.get(id)
  }

  async getTransaction(id: number): Promise<ITransaction | undefined> {
    return DB.transactions.get(id)
  }

  async checkPendingTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    return PENDING_TX_CHECKER.checkPendingTx(pendingTx, ...args)
  }

  async notifyTransaction(network: INetwork, transaction: ITransaction) {
    const info = getTransactionInfo(transaction)
    const success = info.status === TransactionStatus.CONFIRMED
    const nonce = info.nonce

    const explorerUrl = getTransactionUrl(network, info.hash)

    const title = success ? 'Confirmed transaction' : 'Failed transaction'
    const message = success
      ? `Transaction ${nonce} confirmed! ${
          explorerUrl ? 'View on block explorer' : ''
        }`
      : `Transaction ${nonce} failed! Transaction encountered an error.`

    EXTENSION.showNotification(title, message, explorerUrl)
  }
}
