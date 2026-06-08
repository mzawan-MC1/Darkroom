import { supabase } from './supabase';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  tagline: string;
  min_players: number;
  max_players: number;
  duration_minutes: number;
  base_price: number;
  difficulty_level: string;
  status: string;
}

export interface LobbyGameInfo {
  id: string;
  name: string;
  description: string;
  hourly_price: number;
  max_players: number;
  is_available: boolean;
}

export interface MerchandiseInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
}

export interface ScheduleInfo {
  id: string;
  game_id: string;
  game_name: string;
  date: string;
  start_time: string;
  end_time: string;
  available_slots: number;
  max_players: number;
  price_per_player: number;
}

export interface PromotionInfo {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export const chatHelpers = {
  async getActiveGames(): Promise<GameInfo[]> {
    const { data, error } = await supabase
      .from('games')
      .select('id, name, description, tagline, min_players, max_players, duration_minutes, base_price, difficulty_level, status')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getGameById(gameId: string): Promise<GameInfo | null> {
    const { data, error } = await supabase
      .from('games')
      .select('id, name, description, tagline, min_players, max_players, duration_minutes, base_price, difficulty_level, status')
      .eq('id', gameId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async searchGames(query: string): Promise<GameInfo[]> {
    const { data, error } = await supabase
      .from('games')
      .select('id, name, description, tagline, min_players, max_players, duration_minutes, base_price, difficulty_level, status')
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tagline.ilike.%${query}%`)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getAvailableLobbyGames(): Promise<LobbyGameInfo[]> {
    const { data, error } = await supabase
      .from('lobby_games')
      .select('id, name, description, hourly_price, max_players, is_available')
      .eq('is_available', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getGameSchedules(gameId?: string, date?: string): Promise<ScheduleInfo[]> {
    let query = supabase
      .from('game_schedules')
      .select(`
        id,
        game_id,
        games(name),
        date,
        start_time,
        end_time,
        available_slots,
        max_players,
        price_per_player
      `)
      .gte('date', date || new Date().toISOString().split('T')[0])
      .order('date')
      .order('start_time');

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as any[] || []).map((schedule: any) => ({
      id: schedule.id,
      game_id: schedule.game_id,
      game_name: schedule.games?.name || '',
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      available_slots: schedule.available_slots,
      max_players: schedule.max_players,
      price_per_player: schedule.price_per_player
    }));
  },

  async getMerchandise(category?: string): Promise<MerchandiseInfo[]> {
    let query = supabase
      .from('merchandise')
      .select('id, name, description, price, category, stock_quantity')
      .gt('stock_quantity', 0)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getActivePromotions(): Promise<PromotionInfo[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, is_active')
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .order('discount_value', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async validatePromotionCode(code: string): Promise<PromotionInfo | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, is_active')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getGroupDiscounts(gameId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('group_pricing_tiers')
      .select('*')
      .eq('game_id', gameId)
      .order('min_players');

    if (error) throw error;
    return data || [];
  },

  async createConversation(sessionId: string, userId?: string) {
    const { data, error } = await (supabase
      .from('chat_conversations') as any)
      .insert({
        session_id: sessionId,
        user_id: userId || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getConversation(sessionId: string) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string, metadata?: any) {
    const { data, error } = await (supabase
      .from('chat_messages') as any)
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getConversationHistory(conversationId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};
