import { Index } from './subWallet'

export interface IConnectedSite {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  origin: string // URL.origin
  iconUrl?: string
  connected: 0 | 1 // boolean is not indexable
  info: any
}

export const connectedSiteSchemaV1 =
  '++id, &[masterId+index+origin+connected], [masterId+index+connected], [origin+connected]'
