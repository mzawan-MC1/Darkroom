// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const provider = req.headers.get('x-payment-provider') || 'stripe';
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-webhook-signature') || '';
    const body = await req.text();

    const { data: settings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error('Payment provider not configured');
    }

    let event;
    let webhookLogId: string | null = null;

    if (settings.provider === 'stripe') {
      event = await verifyStripeWebhook(body, signature, settings.webhook_secret);
      webhookLogId = await logWebhook(supabaseClient, 'stripe', event.type, event.id, JSON.parse(body));
      await processStripeWebhook(supabaseClient, event, webhookLogId);
    } else if (settings.provider === 'network_international') {
      event = JSON.parse(body);
      const isValid = await verifyNetworkInternationalWebhook(body, signature, settings.webhook_secret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      webhookLogId = await logWebhook(supabaseClient, 'network_international', event.eventType, event.eventId, event);
      await processNetworkInternationalWebhook(supabaseClient, event, webhookLogId);
    } else {
      throw new Error('Unsupported payment provider');
    }

    if (webhookLogId) {
      await supabaseClient
        .from('payment_webhook_logs')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webhookLogId);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifyStripeWebhook(body: string, signature: string, webhookSecret: string) {
  const encoder = new TextEncoder();
  const parts = signature.split(',');
  
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) {
    throw new Error('Invalid Stripe signature format');
  }

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSigHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedSigHex !== sig) {
    throw new Error('Invalid Stripe signature');
  }

  return JSON.parse(body);
}

async function verifyNetworkInternationalWebhook(body: string, signature: string, webhookSecret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedSigHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSigHex === signature;
}

async function logWebhook(
  supabaseClient: any,
  provider: string,
  eventType: string,
  eventId: string,
  payload: any
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('payment_webhook_logs')
      .insert([{
        provider,
        event_type: eventType,
        event_id: eventId,
        payload,
        status: 'received',
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log('Duplicate webhook event, skipping:', eventId);
        return null;
      }
      throw error;
    }

    return data.id;
  } catch (error: any) {
    console.error('Error logging webhook:', error);
    return null;
  }
}

async function processStripeWebhook(supabaseClient: any, event: any, webhookLogId: string | null) {
  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('provider_session_id', session.id)
      .maybeSingle();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    await supabaseClient
      .from('payments')
      .update({
        status: 'paid',
        provider_payment_id: session.payment_intent,
        payment_method: 'card',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (webhookLogId) {
      await supabaseClient
        .from('payment_webhook_logs')
        .update({ payment_id: payment.id })
        .eq('id', webhookLogId);
    }

    await updateRelatedRecords(supabaseClient, payment, 'paid');
  } else if (event.type === 'checkout.session.expired') {
    const { data: payment } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('provider_session_id', session.id)
      .maybeSingle();

    if (payment) {
      await supabaseClient
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', payment.id);

      await updateRelatedRecords(supabaseClient, payment, 'failed');
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const { data: payment } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('provider_payment_id', session.id)
      .maybeSingle();

    if (payment) {
      await supabaseClient
        .from('payments')
        .update({
          status: 'failed',
          error_message: session.last_payment_error?.message || 'Payment failed',
        })
        .eq('id', payment.id);

      await updateRelatedRecords(supabaseClient, payment, 'failed');
    }
  }
}

async function processNetworkInternationalWebhook(supabaseClient: any, event: any, webhookLogId: string | null) {
  const orderReference = event.orderReference || event.merchantOrderReference;

  const { data: payment, error: paymentError } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('provider_session_id', orderReference)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error('Payment record not found');
  }

  if (event.state === 'CAPTURED' || event.state === 'AUTHORISED') {
    await supabaseClient
      .from('payments')
      .update({
        status: 'paid',
        provider_payment_id: event.paymentId || event.transactionId,
        payment_method: 'card',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (webhookLogId) {
      await supabaseClient
        .from('payment_webhook_logs')
        .update({ payment_id: payment.id })
        .eq('id', webhookLogId);
    }

    await updateRelatedRecords(supabaseClient, payment, 'paid');
  } else if (event.state === 'FAILED' || event.state === 'DECLINED') {
    await supabaseClient
      .from('payments')
      .update({
        status: 'failed',
        error_message: event.errorMessage || 'Payment failed',
      })
      .eq('id', payment.id);

    await updateRelatedRecords(supabaseClient, payment, 'failed');
  }
}

async function updateRelatedRecords(supabaseClient: any, payment: any, status: string) {
  if (payment.booking_id) {
    await supabaseClient
      .from('bookings')
      .update({
        payment_status: status,
        payment_id: payment.id,
        status: status === 'paid' ? 'confirmed' : 'pending',
      })
      .eq('id', payment.booking_id);
  }

  if (payment.order_id) {
    await supabaseClient
      .from('orders')
      .update({
        payment_status: status,
        payment_id: payment.id,
        status: status === 'paid' ? 'confirmed' : 'pending',
      })
      .eq('id', payment.order_id);
  }

  if (payment.lobby_pass_id) {
    await supabaseClient
      .from('lobby_game_passes')
      .update({
        status: status === 'paid' ? 'active' : 'pending',
      })
      .eq('id', payment.lobby_pass_id);
  }

  const { data: invoices } = await supabaseClient
    .from('invoices')
    .select('*')
    .or(`booking_id.eq.${payment.booking_id},order_id.eq.${payment.order_id}`)
    .maybeSingle();

  if (invoices) {
    await supabaseClient
      .from('invoices')
      .update({
        payment_method: 'card',
        payment_status: status === 'paid' ? 'paid' : 'pending',
        amount_paid: status === 'paid' ? payment.amount : 0,
      })
      .eq('id', invoices.id);
  }
}

async function sendAdminPaymentNotification(supabaseClient: any, bookingId: string, amount: number) {
  try {
    // 1. Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, games(name)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking for admin notification:', bookingError);
      return;
    }

    // 2. Fetch admin emails
    const { data: settings } = await supabaseClient
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notification_emails')
      .maybeSingle();

    if (!settings?.setting_value) {
      console.log('No admin notification emails configured. Skipping admin payment notification.');
      return;
    }

    const adminEmails = settings.setting_value;

    // 3. Prepare email data
    const gameName = booking.games?.name || 'Game';
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const variables = {
      customer_name: booking.customer_name,
      booking_number: booking.booking_number,
      game_name: gameName,
      booking_date: bookingDate,
      booking_time: booking.start_time,
      player_count: booking.number_of_players.toString(),
      total_amount: `AED ${amount}`,
      booking_url: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'thelockout.ae') || 'https://thelockout.ae'}/customer-portal`,
      site_name: 'The Lockout',
      year: new Date().getFullYear().toString(),
    };

    // 4. Send email using send-email function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log(`[PaymentWebhook] Sending admin notification to: ${adminEmails}`);

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: adminEmails,
        template_key: 'booking_confirmation', // Using confirmation template as base
        variables,
        subject_override: `[ADMIN] Payment Received - #${booking.booking_number} - AED ${amount}`
      }),
    });

  } catch (error) {
    console.error('Error sending admin payment notification:', error);
  }
}
