// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  message: string;
  conversationId?: string;
  sessionId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, conversationId, sessionId }: ChatRequest = await req.json();

    let conversation;
    if (conversationId) {
      const { data } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      conversation = data;
    } else {
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existing) {
        conversation = existing;
      } else {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({ session_id: sessionId })
          .select()
          .single();
        conversation = newConv;
      }
    }

    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: message,
    });

    const { data: history } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const [games, lobbyGames, merchandise, promotions, schedules, groupTiers] = await Promise.all([
      supabase.from("games").select("*").eq("status", "active"),
      supabase.from("lobby_games").select("*").eq("is_available", true),
      supabase.from("merchandise").select("*").gt("stock_quantity", 0),
      supabase.from("promotions").select("*").eq("is_active", true).gte("valid_until", new Date().toISOString()),
      supabase.from("game_schedules").select("*, games(name)").gte("date", new Date().toISOString().split("T")[0]).gt("available_slots", 0).limit(100),
      supabase.from("group_pricing_tiers").select("*, games(name)").order("min_players"),
    ]);

    const systemData = {
      games: games.data || [],
      lobbyGames: lobbyGames.data || [],
      merchandise: merchandise.data || [],
      promotions: promotions.data || [],
      schedules: schedules.data || [],
      groupTiers: groupTiers.data || [],
    };

    const response = generateIntelligentResponse(message, systemData, history || []);

    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: response,
    });

    return new Response(
      JSON.stringify({
        response,
        conversationId: conversation.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function extractIntent(message: string): string {
  const msg = message.toLowerCase();

  if (/(hi|hello|hey|greetings|good morning|good evening)/i.test(msg) && msg.length < 30) return "greeting";
  if (/(book|reserve|schedule|appointment|slot)/i.test(msg)) return "booking";
  if (/(price|cost|rate|fee|charge|expensive|cheap|affordable)/i.test(msg)) return "pricing";
  if (/(game|escape room|room|puzzle|challenge)/i.test(msg) && !/(lobby|arcade)/i.test(msg)) return "games";
  if (/(lobby|arcade|casual|board game)/i.test(msg)) return "lobby_games";
  if (/(buy|shop|merchandise|product|gift|souvenir)/i.test(msg)) return "merchandise";
  if (/(promo|discount|coupon|offer|deal|sale)/i.test(msg)) return "promotions";
  if (/(group|team|friends|people|players|party)/i.test(msg)) return "group_info";
  if (/(time|available|when|date|schedule)/i.test(msg)) return "availability";
  if (/(location|address|where|direction|parking)/i.test(msg)) return "location";
  if (/(duration|long|minutes|hours)/i.test(msg)) return "duration";
  if (/(difficulty|hard|easy|beginner|expert)/i.test(msg)) return "difficulty";
  if (/(cancel|refund|policy|change|modify)/i.test(msg)) return "policy";
  if (/(thank|thanks)/i.test(msg)) return "thanks";
  if (/(help|assist|support)/i.test(msg)) return "help";

  return "general";
}

function extractNumbers(message: string): number[] {
  const matches = message.match(/\d+/g);
  return matches ? matches.map(n => parseInt(n)) : [];
}

function extractDays(message: string): string[] {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const msg = message.toLowerCase();
  return days.filter(day => msg.includes(day));
}

function generateIntelligentResponse(message: string, systemData: any, history: any[]): string {
  const intent = extractIntent(message);
  const numbers = extractNumbers(message);
  const days = extractDays(message);
  const msg = message.toLowerCase();

  switch (intent) {
    case "greeting":
      return "Hi there! I'm Asma, your escape room assistant. I'm here to help you have an amazing experience! I can help you:\n\n✨ Find and book the perfect escape room\n🎮 Check out our lobby games\n🛍️ Browse merchandise\n💰 Discover current promotions\n📅 Check availability\n👥 Get group discounts\n\nWhat would you like to explore today?";

    case "booking": {
      const playerCount = numbers.length > 0 ? numbers[0] : null;
      let schedules = systemData.schedules.slice(0, 6);

      if (days.length > 0) {
        schedules = schedules.filter((s: any) => {
          const scheduleDay = new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          return days.some(d => scheduleDay.includes(d));
        });
      }

      if (schedules.length === 0) {
        return "I'd love to help you book! To find the perfect slot, could you tell me:\n\n1. Which game interests you?\n2. How many players?\n3. Your preferred date and time?\n\nOr just ask me 'What games do you have?' to see all options!";
      }

      const upcoming = schedules.map((s: any) => {
        const date = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return "• " + s.games?.name + ": " + date + " at " + s.start_time + " (" + s.available_slots + " spots available - AED " + s.price_per_player + "/person)";
      }).join("\n");

      let response = "Great! Here are some available slots:\n\n" + upcoming + "\n\n";

      if (playerCount && systemData.groupTiers.length > 0) {
        const relevantDiscounts = systemData.groupTiers.filter((t: any) => t.min_players <= playerCount);
        if (relevantDiscounts.length > 0) {
          response += "💰 Great news! For " + playerCount + " players, you qualify for group discounts!\n\n";
        }
      }

      response += "Ready to book? Let me know which slot works for you!";
      return response;
    }

    case "games": {
      if (msg.includes("recommend") || msg.includes("suggest") || msg.includes("best")) {
        const beginner = systemData.games.find((g: any) => g.difficulty_level === 'easy');
        const intermediate = systemData.games.find((g: any) => g.difficulty_level === 'medium');
        const advanced = systemData.games.find((g: any) => g.difficulty_level === 'hard');

        let recommendations = "Based on your experience level, here are my recommendations:\n\n";
        if (beginner) recommendations += "🌟 Beginners: " + beginner.name + " - " + beginner.tagline + " (" + beginner.duration_minutes + " min, AED " + beginner.base_price + ")\n";
        if (intermediate) recommendations += "⭐ Intermediate: " + intermediate.name + " - " + intermediate.tagline + " (" + intermediate.duration_minutes + " min, AED " + intermediate.base_price + ")\n";
        if (advanced) recommendations += "🔥 Advanced: " + advanced.name + " - " + advanced.tagline + " (" + advanced.duration_minutes + " min, AED " + advanced.base_price + ")\n";

        return recommendations + "\nEach game offers a unique adventure! Want to know more about any of these?";
      }

      const gameList = systemData.games.map((g: any) =>
        "🎮 " + g.name + "\n   " + g.tagline + "\n   👥 " + g.min_players + "-" + g.max_players + " players | ⏱️ " + g.duration_minutes + " min | 💰 AED " + g.base_price
      ).join("\n\n");

      return "We have " + systemData.games.length + " amazing escape rooms ready for you!\n\n" + gameList + "\n\nEach game is crafted for maximum immersion and challenge! Want to check availability for any of these?";
    }

    case "lobby_games": {
      if (systemData.lobbyGames.length === 0) {
        return "Our lobby games are currently being set up! But our escape rooms are ready and waiting for you. Want to check those out?";
      }

      const lobbyList = systemData.lobbyGames.map((g: any) =>
        "🎯 " + g.name + " - AED " + g.hourly_price + "/hour" + (g.max_players ? " (up to " + g.max_players + " players)" : "")
      ).join("\n");

      return "Perfect for some casual fun while you wait! Our lobby has:\n\n" + lobbyList + "\n\nThese are available for hourly rental. Want to reserve any?";
    }

    case "merchandise": {
      const merchList = systemData.merchandise.slice(0, 10).map((m: any) =>
        "  • " + m.name + " - AED " + m.price + " (" + m.category + ")"
      ).join("\n");

      return "Check out our awesome merchandise! 🛍️\n\n" + merchList + "\n\nAll items are in stock and ready to go! Interested in any?";
    }

    case "promotions": {
      if (systemData.promotions.length === 0) {
        return "We don't have active promotions right now, but don't worry! We offer excellent group discounts - the more players, the bigger the savings! Plus, our experiences are priced to give you amazing value. Want to check our current rates?";
      }

      const promos = systemData.promotions.map((p: any) => {
        const validUntil = new Date(p.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const discount = p.discount_type === "percentage" ? p.discount_value + "%" : "AED " + p.discount_value;
        return "🎉 " + p.code + " - " + p.description + "\n   💰 " + discount + " off\n   ⏰ Valid until " + validUntil;
      }).join("\n\n");

      return "Awesome timing! We have some great deals for you:\n\n" + promos + "\n\nI'll automatically apply the best promotion when you book! Want to see available slots?";
    }

    case "pricing": {
      if (systemData.games.length === 0) return "Let me check our pricing information for you...";

      const minPrice = Math.min(...systemData.games.map((g: any) => g.base_price));
      const maxPrice = Math.max(...systemData.games.map((g: any) => g.base_price));

      let response = "Our escape rooms range from AED " + minPrice + " to AED " + maxPrice + " per game.\n\n";

      if (systemData.groupTiers.length > 0) {
        response += "💡 Group Discounts Available:\n";
        const uniqueDiscounts = [...new Set(systemData.groupTiers.map((t: any) => t.discount_percentage))];
        uniqueDiscounts.slice(0, 3).forEach((discount: number) => {
          const tier = systemData.groupTiers.find((t: any) => t.discount_percentage === discount);
          response += "   • " + tier.min_players + "+ players: " + discount + "% off\n";
        });
      }

      response += "\n📅 Prices may vary by date and time. Want me to check specific slots for you?";
      return response;
    }

    case "group_info": {
      const playerCount = numbers.length > 0 ? numbers[0] : null;

      if (playerCount) {
        const suitableGames = systemData.games.filter((g: any) => g.min_players <= playerCount && g.max_players >= playerCount);

        if (suitableGames.length === 0) {
          return "For " + playerCount + " players, you might need multiple rooms or we can split into teams! Let me know and I'll help you plan the perfect group experience.";
        }

        let response = "Perfect! For " + playerCount + " players, you have great options:\n\n";

        suitableGames.slice(0, 3).forEach((g: any) => {
          response += "🎮 " + g.name + " - AED " + g.base_price + "\n";
        });

        const relevantDiscounts = systemData.groupTiers.filter((t: any) => t.min_players <= playerCount);
        if (relevantDiscounts.length > 0) {
          const maxDiscount = Math.max(...relevantDiscounts.map((t: any) => t.discount_percentage));
          response += "\n💰 Group Discount: You'll save " + maxDiscount + "% with " + playerCount + " players!\n";
        }

        return response + "\nReady to book? Just let me know your preferred time!";
      }

      const maxPlayers = Math.max(...systemData.games.map((g: any) => g.max_players));
      const minPlayers = Math.min(...systemData.games.map((g: any) => g.min_players));
      return "Our games accommodate " + minPlayers + " to " + maxPlayers + " players, and we offer fantastic group discounts! The more friends you bring, the more you save. How many people are in your group?";
    }

    case "availability": {
      const schedules = systemData.schedules.slice(0, 15);

      if (schedules.length === 0) {
        return "Let me help you find the perfect time! Could you tell me:\n• Which game you're interested in?\n• Your preferred date?\n• How many players?";
      }

      const today = new Date().toISOString().split("T")[0];
      const todaySchedules = schedules.filter((s: any) => s.date === today);
      const upcomingSchedules = schedules.filter((s: any) => s.date > today);

      let response = "Here's what's available:\n\n";

      if (todaySchedules.length > 0) {
        response += "📅 Today:\n";
        todaySchedules.slice(0, 3).forEach((s: any) => {
          response += "   • " + s.games?.name + " at " + s.start_time + " (" + s.available_slots + " spots - AED " + s.price_per_player + "/person)\n";
        });
        response += "\n";
      }

      if (upcomingSchedules.length > 0) {
        response += "📅 Coming Up:\n";
        upcomingSchedules.slice(0, 5).forEach((s: any) => {
          const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          response += "   • " + s.games?.name + " on " + date + " at " + s.start_time + " (" + s.available_slots + " spots)\n";
        });
      }

      return response + "\n✨ Which slot catches your eye? I'll get you booked right away!";
    }

    case "difficulty": {
      const easyGames = systemData.games.filter((g: any) => g.difficulty_level === 'easy');
      const mediumGames = systemData.games.filter((g: any) => g.difficulty_level === 'medium');
      const hardGames = systemData.games.filter((g: any) => g.difficulty_level === 'hard');

      let response = "We have games for all skill levels!\n\n";
      if (easyGames.length > 0) response += "🌟 Beginner-Friendly: " + easyGames.map((g: any) => g.name).join(", ") + "\n";
      if (mediumGames.length > 0) response += "⭐ Intermediate: " + mediumGames.map((g: any) => g.name).join(", ") + "\n";
      if (hardGames.length > 0) response += "🔥 Advanced: " + hardGames.map((g: any) => g.name).join(", ") + "\n";

      return response + "\nWhat's your experience level? I can recommend the perfect challenge!";
    }

    case "duration": {
      const durations = systemData.games.map((g: any) => g.name + ": " + g.duration_minutes + " minutes").join("\n• ");
      return "Our escape rooms are timed experiences:\n\n• " + durations + "\n\nPlan to arrive 10 minutes early for briefing. The clock starts when you enter the room! ⏰";
    }

    case "location":
      return "🗺️ We're located in Dubai! For exact directions, parking info, and what to bring, please contact our team. Would you like to book a game?";

    case "policy":
      return "📋 For cancellations, modifications, and our policies, I recommend reaching out to our team directly. They'll be happy to help! Would you like me to help you with booking instead?";

    case "thanks":
      return "You're very welcome! I'm always here to help. Is there anything else you'd like to know about our escape rooms, lobby games, or merchandise? 😊";

    case "help":
      return "I'm here to assist you with everything! I can help you:\n\n✅ Find the perfect escape room\n✅ Check real-time availability\n✅ Book your adventure\n✅ Get group discounts\n✅ Browse lobby games & merchandise\n✅ Apply promotion codes\n✅ Answer any questions\n\nJust ask me anything - I understand natural conversation! What would you like to know?";

    default:
      if (history.length > 1) {
        const lastMessage = history[history.length - 2];
        if (lastMessage && lastMessage.role === "assistant" && lastMessage.content.includes("game")) {
          if (systemData.schedules.length > 0) {
            const upcoming = systemData.schedules.slice(0, 5).map((s: any) => {
              const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return "• " + s.games?.name + ": " + date + " at " + s.start_time + " (AED " + s.price_per_player + "/person)";
            }).join("\n");
            return "Based on what we were discussing, here are some available slots:\n\n" + upcoming + "\n\nWould any of these work for you?";
          }
        }
      }

      return "I want to make sure I give you the best help possible! Could you tell me more about what you're looking for? Are you interested in:\n\n🎮 Booking an escape room\n📅 Checking availability\n💰 Learning about prices and discounts\n🎯 Trying our lobby games\n🛍️ Shopping for merchandise\n\nOr feel free to ask me anything else!";
  }
}
