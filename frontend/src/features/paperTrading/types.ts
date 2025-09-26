export type PaperTradeDirection = 'LONG' | 'SHORT';
export type PaperTradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface PaperTrade {
  id: number;
  asset: number;
  asset_symbol: string;
  asset_name: string | null;
  direction: PaperTradeDirection;
  quantity: string;
  entry_price: string;
  entry_at: string;
  target_price: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  status: PaperTradeStatus;
  exit_price: string | null;
  exit_at: string | null;
  notes: string;
  entry_cost: string;
  realized_pl: string | null;
  unrealized_pl: string | null;
  current_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaperTradePayload {
  asset: number;
  direction: PaperTradeDirection;
  quantity: string;
  entry_price: string;
  entry_at?: string;
  target_price?: string;
  stop_loss?: string;
  take_profit?: string;
  notes?: string;
}

export interface ClosePaperTradePayload {
  id: number;
  exit_price: string;
  exit_at?: string;
  notes?: string;
}

export interface CancelPaperTradePayload {
  id: number;
  notes?: string;
}
