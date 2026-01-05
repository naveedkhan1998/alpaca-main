export type Credentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: {
    access: string;
    refresh: string;
  };
};

export interface RefreshTokenResult {
  data?: {
    access?: string;
    refresh?: string;
  };
}

// Standardized API response wrappers
export interface ApiResponse<T> {
  data: T;
  msg: string;
  count?: number;
}

export interface ApiError {
  detail?: string;
  message?: string;
  // Django REST framework non-field errors
  non_field_errors?: string[];
  // Allow any field errors - will be handled dynamically
  [key: string]: unknown;
}

// Alpaca related types
export interface AlpacaStatus {
  connection_status: boolean;
}

export interface AlpacaStatusResponse {
  data: AlpacaStatus;
}

export interface Asset {
  id: number;
  alpaca_id: string;
  symbol: string;
  name: string;
  asset_class: 'us_equity' | 'us_option' | 'crypto';
  exchange: string;
  status: 'active' | 'inactive';
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  maintenance_margin_requirement?: number;
  margin_requirement_long?: string;
  margin_requirement_short?: string;
  created_at: string;
  updated_at: string;
}

export interface WatchListAsset {
  id: number;
  asset: Asset;
  asset_id: number;
  added_at: string;
  is_active: boolean;
}

export interface WatchList {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assets: WatchListAsset[];
  asset_count: number;
}

export interface Tick {
  id: number;
  asset: Asset;
  asset_symbol: string;
  alpaca_trade_id?: number;
  exchange_code?: string;
  price: number;
  size?: number;
  conditions?: unknown;
  tape?: string;
  timestamp: string;
  received_at: string;
  used: boolean;
}

export interface PercentageInstrument {
  percentage: number;
  is_loading: boolean;
}

// Keep legacy Instrument interface for backward compatibility during migration
export interface Instrument {
  id: number;
  percentage: PercentageInstrument;
  stock_token: string | null;
  token: string | null;
  instrument: string | null;
  short_name: string | null;
  series: string | null;
  company_name: string | null;
  expiry: string | null;
  strike_price: number | null;
  option_type: string | null;
  exchange_code: string | null;
  exchange: number;
}

export type SubscribedInstrument = Instrument;

export type Candle = {
  id?: number;
  asset?: Asset;
  asset_symbol?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count?: number;
  vwap?: number;
  timeframe?: string;
  timestamp: string;
  date: string; // For legacy support
  created_at?: string;
  is_active?: boolean;
};

export interface AlpacaAccount {
  id: number;
  name: string;
  api_key: string;
  api_secret: string;
  last_updated: string;
  is_active: boolean;
  user?: number;
}

export type CreateAlpacaAccount = Omit<
  AlpacaAccount,
  'user' | 'id' | 'last_updated'
>;

// Keep legacy BreezeAccount for backward compatibility during migration
export interface BreezeAccount {
  id: number;
  name: string;
  api_key: string;
  api_secret: string;
  session_token: string;
  last_updated: string;
  is_active: boolean;
  user: number;
}

export type CreateBreezeAccount = Omit<
  BreezeAccount,
  'user' | 'id' | 'last_updated' | 'is_active' | 'session_token'
>;

export interface Indicator {
  name: string;
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string;
  tc: boolean;
  is_admin: boolean;
  auth_provider: string;
}

export interface UserRegistration extends Omit<
  User,
  'id' | 'is_admin' | 'avatar' | 'auth_provider'
> {
  password: string;
  password2: string;
}

// Query parameter types for Alpaca APIs
export interface GetAssetsParams {
  asset_class?: string;
  exchange?: string;
  tradable?: boolean;
  marginable?: boolean;
  shortable?: boolean;
  fractionable?: boolean;
  // depreciated
  // search?: string;
  q?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}

export interface SearchAssetsParams {
  q: string;
  limit?: number;
  offset?: number;
}

export interface GetWatchListsParams {
  limit?: number;
  offset?: number;
}

export interface GetCandlesParams {
  asset_id?: number;
  symbol?: string;
  timeframe?: string;
  limit?: number;
  offset?: number;
}

export interface GetTicksParams {
  asset_id?: number;
  symbol?: string;
  limit?: number;
  offset?: number;
}

// Legacy params for backward compatibility
export interface GetInstrumentsParams {
  exchange?: string;
  search?: string;
  optionType?: string;
  strikePrice?: number | null;
  expiryAfter?: string;
  expiryBefore?: string;
  instrumentType?: 'OPTION' | 'FUTURE' | undefined;
}

export interface GetPaginatedCandlesParams {
  id: number;
  tf: number;
  limit?: number;
  offset?: number;
}

// Mutation parameter types for Alpaca APIs
export interface CreateWatchListParams {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface AddAssetToWatchListParams {
  watchlist_id: number;
  asset_id: number;
}

export interface RemoveAssetFromWatchListParams {
  watchlist_id: number;
  asset_id: number;
}

export interface UpdateAlpacaParams {
  data: AlpacaAccount;
}

// Legacy mutation params for backward compatibility
export interface SubscribeInstrumentParams {
  id: number;
  duration: number;
}

export interface LoadInstrumentCandlesParams {
  id: number;
}

export interface DeleteInstrumentParams {
  id: number;
}

export interface UpdateBreezeParams {
  data: BreezeAccount;
}

export interface GoogleLoginParams {
  token: string;
}

// Response types for Alpaca APIs - Updated to match Django pagination format
export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  count: number;
  results: T[];
}

export interface PaginatedApiResponse<T> {
  next: string | null;
  previous: string | null;
  count: number;
  results: T[];
  msg?: string;
}

export type PaginatedAssets = PaginatedResponse<Asset>;
export type PaginatedWatchLists = PaginatedResponse<WatchList>;
export type PaginatedCandles = PaginatedResponse<Candle>;
export type PaginatedTicks = PaginatedResponse<Tick>;

// V3 Cursor-based pagination for candles (optimized with compact format)
export interface CandleV3 {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  trade_count: number | null;
  vwap: string | null;
}

/**
 * Compact candle response format - ~60% smaller than object format.
 *
 * Backend returns candles as arrays with column headers:
 * {
 *   columns: ["timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap"],
 *   results: [["2024-01-15T09:30:00Z", "150.25", "150.50", ...], ...]
 * }
 */
export interface CompactCandlesResponse {
  columns: string[];
  results: (string | number | null)[][];
  next_cursor: string | null;
  has_next: boolean;
}

// Legacy object format response (use format=object query param)
export interface CursorPaginatedCandlesResponse {
  results: CandleV3[];
  next_cursor: string | null;
  has_next: boolean;
}

export interface GetCandlesV3Params {
  id: number;
  timeframe?: number; // 1, 5, 15, 30, 60, 240, 1440
  limit?: number;
  cursor?: string; // ISO 8601 timestamp
}

export interface EmailVerificationResponse {
  message: string;
}
