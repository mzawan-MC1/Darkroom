// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Missing orderId');
    }

    // Fetch settings to get MPGS credentials
    const { data: settings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('is_active', true)
      .eq('provider', 'mpgs_adib0')
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error('MPGS Payment provider not configured');
    }

    // Verify with MPGS
    const merchantId = settings.merchant_id;
    const apiPassword = settings.secret_key;
    const baseUrl = settings.gateway_region_base_url || 'https://eu-gateway.mastercard.com';
    const apiVersion = settings.api_version || 74;

    const apiUrl = `${baseUrl}/api/rest/version/${apiVersion}/merchant/${merchantId}/order/${orderId}`;
    const authString = btoa(`merchant.${merchantId}:${apiPassword}`);

    const mpgsResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!mpgsResponse.ok) {
      const errorData = await mpgsResponse.json();
      throw new Error(`MPGS API error: ${JSON.stringify(errorData)}`);
    }

    const orderData = await mpgsResponse.json();
    
    // Check payment status
    // For PURCHASE operation, success means status is CAPTURED or AUTHORIZED (if auth only)
    // result usually indicates the outcome of the request itself.
    // status indicates the state of the order.
    
    let status = 'pending';
    let errorMessage = null;

    if (orderData.result === 'SUCCESS' && (orderData.status === 'CAPTURED' || orderData.status === 'AUTHENTICATED')) {
      status = 'paid';
    } else if (orderData.result === 'FAILURE' || orderData.status === 'FAILED' || orderData.status === 'CANCELLED') {
      status = 'failed';
      errorMessage = orderData.result;
    } else {
      // Pending or other state
      status = 'pending';
    }

    // Find the payment record using orderId (stored in payment_reference)
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_reference', orderId)
      .maybeSingle();

    if (paymentError || !payment) {
      throw new Error('Payment record not found for this order ID');
    }

    // Update payment record
    await supabaseClient
      .from('payments')
      .update({
        status: status,
        provider_payment_id: orderData.transaction?.[0]?.transaction?.id || null, // Best effort to get transaction ID
        payment_method: 'card', // MPGS is card
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        error_message: errorMessage,
        metadata: { ...payment.metadata, gateway_response: orderData }
      })
      .eq('id', payment.id);

    // Update related records (bookings, orders, invoices)
    if (status === 'paid' || status === 'failed') {
      await updateRelatedRecords(supabaseClient, payment, status, orderData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: status,
        orderData: orderData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Verify MPGS Payment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateRelatedRecords(supabaseClient: any, payment: any, status: string, gatewayData: any) {
  const updates: any = {
    payment_status: status,
    payment_provider: 'mpgs_adib0',
    payment_reference: payment.payment_reference,
    payment_session_id: payment.provider_session_id,
    payment_transaction_id: gatewayData.transaction?.[0]?.transaction?.id || null,
    payment_amount: gatewayData.amount || payment.amount,
    payment_currency: gatewayData.currency || payment.currency,
    gateway_result: gatewayData,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
  };

  if (status === 'paid') {
    updates.status = 'confirmed'; // Confirm booking if paid
  } else if (status === 'failed') {
    // Keep pending or mark failed? Usually keep pending to allow retry, 
    // but updating payment_status to 'failed' is good info.
    // Booking status itself might remain 'pending' or go to 'cancelled' depending on business logic.
    // The prompt says: "If failure/cancel/timeout: keep booking 'PENDING_PAYMENT' or set 'PAYMENT_FAILED'/'CANCELLED_PAYMENT' and allow retry."
    // So we update payment_status to 'failed', but booking status remains 'pending' (or whatever it was) unless we want to cancel.
    // Let's keep booking status as is or 'pending'.
    // updates.status = 'pending'; // Don't change main status on failure, just payment_status
  }

  if (payment.booking_id) {
    await supabaseClient
      .from('bookings')
      .update(updates)
      .eq('id', payment.booking_id);
  }

  if (payment.order_id) {
    await supabaseClient
      .from('orders')
      .update(updates)
      .eq('id', payment.order_id);
  }

  // Invoice update
  const { data: invoice } = await supabaseClient
    .from('invoices')
    .select('*')
    .or(`booking_id.eq.${payment.booking_id},order_id.eq.${payment.order_id}`)
    .maybeSingle();

  if (invoice) {
    await supabaseClient
      .from('invoices')
      .update({
        payment_provider: 'mpgs_adib0',
        payment_reference: payment.payment_reference,
        transaction_id: gatewayData.transaction?.[0]?.transaction?.id || null,
        payment_status: status === 'paid' ? 'paid' : 'pending',
        amount_paid: status === 'paid' ? payment.amount : 0,
        status: status === 'paid' ? 'paid' : 'pending', // Invoice status
      })
      .eq('id', invoice.id);
  }
}
