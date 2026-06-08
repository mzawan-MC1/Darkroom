// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentSessionRequest {
  type: 'booking' | 'order' | 'lobby_pass';
  itemId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let user = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (!userError && userData.user) {
        user = userData.user;
      }
    }

    const { type, itemId, amount, currency = 'AED', metadata = {} } = await req.json() as PaymentSessionRequest;

    if (!type || !itemId || !amount) {
      throw new Error('Missing required fields: type, itemId, amount');
    }

    const { data: settings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error('Payment provider not configured');
    }

    console.log("Payment provider:", settings.provider);
    console.log("Merchant ID:", settings.merchant_id);
    console.log("Amount:", amount);
    console.log("Currency:", currency);
    console.log("Item ID:", itemId);

    let paymentSession;
    const userId = user?.id || null; // Use null if no user authenticated

    if (settings.provider === 'stripe') {
      paymentSession = await createStripeSession(
        settings,
        userId || 'guest',
        type,
        itemId,
        amount,
        currency,
        metadata
      );
    } else if (settings.provider === 'network_international') {
      paymentSession = await createNetworkInternationalSession(
        settings,
        userId || 'guest',
        type,
        itemId,
        amount,
        currency,
        metadata
      );
    } else if (settings.provider === 'mpgs_adib0' || settings.provider === 'mpgs') {
      console.log('Initiating MPGS session for provider:', settings.provider);

      if (!settings.merchant_id || !settings.secret_key) {
        console.error("MPGS config missing:", settings);
        throw new Error("MPGS merchant configuration incomplete");
      }

      paymentSession = await createMPGSSession(
        settings,
        userId || 'guest',
        type,
        itemId,
        amount,
        currency,
        metadata
      );
    } else {
      throw new Error(`Unsupported payment provider: ${settings.provider}`);
    }

    const paymentData: any = {
      user_id: userId,
      provider: settings.provider,
      amount,
      currency,
      status: 'pending',
      provider_session_id: paymentSession.sessionId,
      payment_reference: paymentSession.orderId, // Important for MPGS
      metadata,
    };

    if (type === 'booking') {
      paymentData.booking_id = itemId;
    } else if (type === 'order') {
      paymentData.order_id = itemId;
    } else if (type === 'lobby_pass') {
      paymentData.lobby_pass_id = itemId;
    }

    console.log("Inserting paymentData:", paymentData);

    let paymentRecord, paymentError;
    
    // Try insert with payment_reference
    ({ data: paymentRecord, error: paymentError } = await supabaseClient
      .from('payments')
      .insert([paymentData])
      .select()
      .single());

    // If it fails due to missing column, retry without it
    if (paymentError && paymentError.message.includes('payment_reference')) {
      console.warn("payment_reference column missing, retrying without it");
      delete paymentData.payment_reference;

      ({ data: paymentRecord, error: paymentError } = await supabaseClient
        .from('payments')
        .insert([paymentData])
        .select()
        .single());
    }

    if (paymentError) {
      console.error("Payment insert failed:", paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentRecord.id,
        sessionId: paymentSession.sessionId,
        checkoutUrl: paymentSession.checkoutUrl,
        provider: settings.provider,
        merchantId: settings.merchant_id, // Needed for MPGS checkout.js configuration
        orderId: paymentSession.orderId, // Needed for MPGS return URL verification
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Payment session creation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createStripeSession(
  settings: any,
  userId: string,
  type: string,
  itemId: string,
  amount: number,
  currency: string,
  metadata: any
) {
  const stripeApiUrl = settings.mode === 'live'
    ? 'https://api.stripe.com/v1/checkout/sessions'
    : 'https://api.stripe.com/v1/checkout/sessions';

  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('/')[2] || '';
  const origin = `https://${baseUrl}`; // Or retrieve from settings if stored, but using Supabase URL for now or hardcoded frontend URL

  // Ideally, origin should be the frontend URL. 
  // Assuming the frontend URL is passed or configured. For now using what was there.
  // The existing code uses Deno.env.get('SUPABASE_URL')... which might be wrong if frontend is elsewhere.
  // But I will stick to existing pattern or use settings.return_url which might include domain.
  
  // Actually, return_url in settings is usually relative '/payment/success'.
  // We need the frontend origin.
  // Let's assume the frontend sends the origin in headers or we construct it.
  // For this project, let's assume `https://thelockout.ae` or localhost.
  // But `createStripeSession` in existing code used `origin` derived from Supabase URL which is odd.
  // Wait, `settings.return_url` might be full URL if admin entered it.
  // But the placeholder said `/payment/success`.
  
  // I'll leave Stripe logic as is to avoid breaking it, but for MPGS I need to be careful.
  // MPGS returnUrl needs to be absolute.
  
  const params = new URLSearchParams({
    'payment_method_types[]': 'card',
    'mode': 'payment',
    'success_url': `${origin}${settings.return_url}?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${origin}${settings.cancel_url}`,
    'client_reference_id': userId,
    'line_items[0][price_data][currency]': currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
    'line_items[0][price_data][product_data][name]': `${type} Payment`,
    'line_items[0][quantity]': '1',
    'metadata[type]': type,
    'metadata[item_id]': itemId,
    'metadata[user_id]': userId,
  });

  Object.entries(metadata).forEach(([key, value]) => {
    params.append(`metadata[${key}]`, String(value));
  });

  const response = await fetch(stripeApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.secret_key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Stripe API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const session = await response.json();

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

async function createNetworkInternationalSession(
  settings: any,
  userId: string,
  type: string,
  itemId: string,
  amount: number,
  currency: string,
  metadata: any
) {
  const apiUrl = settings.mode === 'live'
    ? 'https://api-gateway.network.ae/payments'
    : 'https://api-gateway.sandbox.network.ae/payments';

  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('/')[2] || '';
  const origin = `https://${baseUrl}`;

  const orderReference = `${type}-${itemId}-${Date.now()}`;

  const payload = {
    action: 'SALE',
    amount: {
      currencyCode: currency,
      value: Math.round(amount * 100),
    },
    merchantAttributes: {
      redirectUrl: `${origin}${settings.return_url}`,
      cancelUrl: `${origin}${settings.cancel_url}`,
    },
    merchantOrderReference: orderReference,
    emailAddress: metadata.email || '',
    billingAddress: metadata.billingAddress || {},
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.secret_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Network International API error: ${errorData.message || 'Unknown error'}`);
  }

  const session = await response.json();

  return {
    sessionId: session.orderReference || orderReference,
    checkoutUrl: session._links?.payment?.href || session.redirectUrl,
  };
}

async function createMPGSSession(
  settings: any,
  userId: string,
  type: string,
  itemId: string,
  amount: number,
  currency: string,
  metadata: any
) {
  const merchantId = settings.merchant_id;
  const apiPassword = settings.secret_key; // Assuming secret_key holds API Password
  const baseUrl = settings.gateway_region_base_url || 'https://eu-gateway.mastercard.com';
  const apiVersion = settings.api_version || 74;
  
  // Use provided frontend origin if available in metadata, else fallback
  // In a real app, origin should be configured in settings or passed from client
  // Here we'll hardcode the production URL or use a placeholder that the frontend must handle
  // For MPGS Hosted Checkout, returnUrl is mandatory and must be absolute.
  const origin = 
    settings.frontend_url || 
    metadata.origin || 
    'https://thelockout.ae'; 
  
  // Use provided return URL path, ensure it starts with /
  const returnPath = settings.return_url.startsWith('/') ? settings.return_url : `/${settings.return_url}`;
  const cancelPath = settings.cancel_url.startsWith('/') ? settings.cancel_url : `/${settings.cancel_url}`;
  
  // Construct full URLs
  const returnUrlBase = `${origin}${returnPath}`;
  const cancelUrlBase = `${origin}${cancelPath}`;
  // For timeout, default to a generic error page if not specified
  const timeoutUrlBase = settings.timeout_url 
      ? (settings.timeout_url.startsWith('http') ? settings.timeout_url : `${origin}${settings.timeout_url.startsWith('/') ? settings.timeout_url : '/' + settings.timeout_url}`) 
      : `${origin}/payment/timeout`;

  const orderId = `LOK-${type.substring(0, 3).toUpperCase()}-${itemId.substring(0, 8)}-${Date.now()}`;

  // Append orderId to URLs so frontend can retrieve it
  const returnUrl = `${returnUrlBase}${returnUrlBase.includes('?') ? '&' : '?'}orderId=${orderId}`;
  const cancelUrl = `${cancelUrlBase}${cancelUrlBase.includes('?') ? '&' : '?'}orderId=${orderId}`;
  const timeoutUrl = `${timeoutUrlBase}${timeoutUrlBase.includes('?') ? '&' : '?'}orderId=${orderId}`;
  
  console.log('MPGS URLs:', { returnUrl, cancelUrl, timeoutUrl });

  const apiUrl = `${baseUrl}/api/rest/version/${apiVersion}/merchant/${merchantId}/session`;

  const payload = {
    apiOperation: "INITIATE_CHECKOUT",
    interaction: {
      operation: "PURCHASE",
      merchant: {
        name: settings.merchant_name || "LockOut Recreational Playground",
        url: origin,
        logo: settings.merchant_logo_url
      },
      displayControl: {
        billingAddress: settings.require_billing_address ? "MANDATORY" : "OPTIONAL",
        customerEmail: settings.require_customer_email ? "MANDATORY" : "OPTIONAL"
      },
      timeout: settings.timeout_seconds || 1800,
      returnUrl: returnUrl,
      cancelUrl: cancelUrl,
      timeoutUrl: timeoutUrl
    },
    order: {
      currency: currency,
      amount: amount.toFixed(2),
      id: orderId,
      description: `Payment for ${type} ${itemId}`
    },
    customer: {
      email: metadata.email,
      firstName: metadata.firstName,
      lastName: metadata.lastName,
      mobilePhone: metadata.phone,
      phone: metadata.phone
    },
    billing: {
      address: {
        city: metadata.billing_city || "Dubai",
        stateProvince: metadata.billing_state || "Dubai",
        country: "ARE",
        postcodeZip: metadata.billing_postal || "00000",
        street: metadata.billing_address_line_1 || "Street",
        street2: metadata.billing_address_line_2 || undefined
      }
    }
  };

  const authString = btoa(`merchant.${merchantId}:${apiPassword}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`MPGS API error: ${errorData.result} - ${JSON.stringify(errorData.error)}`);
  }

  const session = await response.json();
  console.log("MPGS full response:", JSON.stringify(session));

  if (session.result !== 'SUCCESS') {
    throw new Error(`MPGS Session Creation Failed: ${session.result}`);
  }

  return {
    sessionId: session.session.id,
    orderId: orderId,
    successIndicator: session.successIndicator,
    checkoutUrl: null, // Hosted Checkout doesn't give a URL, it gives a session ID for the JS library
  };
}
