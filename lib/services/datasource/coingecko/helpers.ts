export interface ReturnObject {
  success: boolean
  message: string
  code: number
  data: any
}

/**
 * @description The base url for the CoinGecko API
 */
const BASE = 'https://api.coingecko.com/api/'

/**
 * @description The host of the CoinGecko API
 */
const HOST = 'api.coingecko.com'

/**
 * @description The current version for the CoinGecko API
 */
const API_VERSION = '3'

/**
 * @description The CoinGecko URI according to base and current version
 */
const URI = `${BASE}v${API_VERSION}`

/**
 * @description The maximum number of requests per second for the CoinGecko API
 */
const REQUESTS_PER_SECOND = 10

/**
 * @description Timeout for connection to CoinGecko API in milliseconds (default: 30 seconds)
 */
const TIMEOUT = 30000

/**
 * @description Available options to order results by
 * @kind constant
 */
const ORDER = {
  GECKO_ASC: 'gecko_asc',
  GECKO_DESC: 'gecko_desc',
  MARKET_CAP_ASC: 'market_cap_asc',
  MARKET_CAP_DESC: 'market_cap_desc',
  VOLUME_ASC: 'volume_asc',
  VOLUME_DESC: 'volume_desc',
  COIN_NAME_ASC: 'coin_name_asc',
  COIN_NAME_DESC: 'coin_name_desc',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  HOUR_24_ASC: 'h24_change_asc',
  HOUR_24_DESC: 'h24_change_desc',
  TRUST_SCORE_DESC: 'trust_score_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  OPEN_INTEREST_BTC_ASC: 'open_interest_btc_asc',
  OPEN_INTEREST_BTC_DESC: 'open_interest_btc_desc',
  TRADE_VOLUME_24H_BTC_ASC: 'trade_volume_24h_btc_asc',
  TRADE_VOLUME_24H_BTC_DESC: 'trade_volume_24h_btc_desc'
}

/**
 * @description Available status update category types to filter by
 */
const STATUS_UPDATE_CATEGORY = {
  GENERAL: 'general',
  MILESTONE: 'milestone',
  PARTNERSHIP: 'partnership',
  EXCHANGE_LISTING: 'exchange_listing',
  SOFTWARE_RELEASE: 'software_release',
  FUND_MOVEMENT: 'fund_movement',
  NEW_LISTINGS: 'new_listings',
  EVENT: 'event'
}

/**
 * @description Available project type options to filter by
 */
const STATUS_UPDATE_PROJECT_TYPE = {
  COIN: 'coin',
  MARKET: 'market'
}

/**
 * @description List of event types (most recent from /events/type)
 */
const EVENT_TYPE = {
  EVENT: 'Event',
  CONFERENCE: 'Conference',
  MEETUP: 'Meetup'
}

export const constants = {
  BASE,
  HOST,
  API_VERSION,
  URI,
  REQUESTS_PER_SECOND,
  ORDER,
  STATUS_UPDATE_CATEGORY,
  STATUS_UPDATE_PROJECT_TYPE,
  EVENT_TYPE,
  TIMEOUT
}

const isString = (str: any) => {
  return typeof str === 'string' || str instanceof String
}

const isStringEmpty = (str: any) => {
  if (!isString(str)) return false
  return str.length == 0
}

const isDate = (date: any) => {
  if (isString(date) || isArray(date) || date === undefined || date === null)
    return false
  return (
    date &&
    Object.prototype.toString.call(date) === '[object Date]' &&
    !isNaN(date)
  )
}

const isObject = (obj: any) => {
  if (isArray(obj) || isDate(obj)) return false
  return obj !== null && typeof obj === 'object'
}

const isNumber = (num: any) => {
  return !isNaN(num) && !isNaN(parseInt(num))
}

const isArray = (arr: any) => {
  return Array.isArray(arr)
}

const _WARN_ = (title = '', detail = '') => {
  console.log(`${title}: ${detail}`)

  return true
}

export const utils = {
  isString,
  isStringEmpty,
  isDate,
  isObject,
  isNumber,
  isArray,
  _WARN_
}
