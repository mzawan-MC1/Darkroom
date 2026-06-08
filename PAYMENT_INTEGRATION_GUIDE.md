# Payment Integration System - Complete Guide

## Overview

A comprehensive, production-ready payment integration system supporting **Stripe** and **Network International** payment providers. The system handles online payments for escape room bookings, lobby game passes, and merchandise orders with full webhook support, secure credential storage, and automatic status updates.

---

## Features Implemented

### Core Features
✅ **Multi-Provider Support** - Stripe and Network International
✅ **Secure Configuration** - Admin-only payment settings with encrypted keys
✅ **Backend-Only Processing** - All payment operations through Edge Functions
✅ **Webhook Handling** - Automatic payment status updates with signature verification
✅ **Idempotent Operations** - Prevents duplicate charges and updates
✅ **Payment Tracking** - Complete audit trail with webhook logs
✅ **Test & Live Modes** - Separate test and production environments
✅ **Automatic Invoice Updates** - Payment status synced with invoices
✅ **Email Notifications** - Confirmation emails on successful payment

### Security Features
✅ **Secret Key Protection** - Never exposed to frontend
✅ **Webhook Signature Verification** - Stripe & Network International
✅ **Row-Level Security** - RLS policies on all payment tables
✅ **Service Role Only Updates** - Payments can only be modified by backend
✅ **Unique Event Processing** - Prevents duplicate webhook processing

---

## Database Schema

### New Tables

#### `payment_settings`
Stores payment provider configuration (admin only).

```sql
- id (uuid)
- provider (text) - 'stripe' | 'network_international'
- mode (text) - 'test' | 'live'
- publishable_key (text)
- secret_key (text) - ENCRYPTED, backend only
- webhook_secret (text) - For signature verification
- merchant_id (text) - Network International only
- return_url (text) - Success redirect
- cancel_url (text) - Cancel redirect
- is_active (boolean)
- created_at, updated_at
```

#### `payments`
Tracks all payment transactions.

```sql
- id (uuid)
- user_id (uuid) → auth.users
- booking_id (uuid) → bookings (nullable)
- order_id (uuid) → orders (nullable)
- lobby_pass_id (uuid) → lobby_game_passes (nullable)
- provider (text)
- amount (decimal)
- currency (text) - Default: 'AED'
- status (text) - pending|processing|paid|failed|cancelled|refunded
- provider_payment_id (text) - Transaction ID
- provider_session_id (text) - Checkout session ID
- payment_method (text) - card|wallet|bank_transfer
- metadata (jsonb)
- error_message (text)
- paid_at (timestamptz)
- created_at, updated_at
```

#### `payment_webhook_logs`
Logs all webhook events for debugging.

```sql
- id (uuid)
- provider (text)
- event_type (text)
- event_id (text) - Provider's event ID (unique)
- payment_id (uuid) → payments
- payload (jsonb)
- status (text) - received|processed|failed
- error_message (text)
- processed_at (timestamptz)
- created_at
```

### Modified Tables

**bookings** table:
- `payment_status` (text) - pending|paid|failed|refunded
- `payment_id` (uuid) → payments

**orders** table:
- `payment_status` (text) - pending|paid|failed|refunded
- `payment_id` (uuid) → payments

**invoices** table:
- `payment_method` (text) - card|cash|online|bank_transfer

---

## Edge Functions

### 1. `create-payment-session`
**Purpose**: Creates payment checkout sessions

**Endpoint**: `/functions/v1/create-payment-session`
**Auth**: Requires user JWT token
**Method**: POST

**Request Body**:
```json
{
  "type": "booking" | "order" | "lobby_pass",
  "itemId": "uuid",
  "amount": 100.00,
  "currency": "AED",
  "metadata": {
    "email": "customer@example.com",
    "customField": "value"
  }
}
```

**Response**:
```json
{
  "success": true,
  "paymentId": "payment-uuid",
  "sessionId": "stripe-session-id",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "provider": "stripe"
}
```

**Supported Providers**:
- **Stripe**: Creates Checkout Session
- **Network International**: Creates payment order

### 2. `payment-webhook`
**Purpose**: Processes payment status webhooks

**Endpoint**: `/functions/v1/payment-webhook`
**Auth**: Public (verified via webhook signature)
**Method**: POST

**Webhook Events Handled**:

**Stripe**:
- `checkout.session.completed` → Mark payment as paid
- `checkout.session.expired` → Mark as cancelled
- `payment_intent.payment_failed` → Mark as failed

**Network International**:
- `state: CAPTURED` → Mark as paid
- `state: AUTHORISED` → Mark as paid
- `state: FAILED` → Mark as failed
- `state: DECLINED` → Mark as failed

**Automatic Actions**:
1. Log webhook event
2. Verify signature
3. Update payment status
4. Update related booking/order status
5. Update invoice payment status
6. Trigger email notifications

---

## Admin Configuration

### Access Payment Settings
1. Login as Admin
2. Navigate to: **Admin Dashboard → Payment Settings**
3. Configure provider settings

### Stripe Configuration

**Required Fields**:
- **Provider**: Select "Stripe"
- **Mode**: Test or Live
- **Secret Key**: `sk_test_...` or `sk_live_...`
- **Webhook Secret**: `whsec_...`
- **Publishable Key** (optional): `pk_test_...` or `pk_live_...`

**Webhook Setup**:
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/functions/v1/payment-webhook`
3. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret

### Network International Configuration

**Required Fields**:
- **Provider**: Select "Network International"
- **Mode**: Test or Live
- **Secret Key**: Your API key
- **Merchant ID**: Your merchant/outlet ID
- **Webhook Secret**: Your webhook signature secret

**Webhook Setup**:
1. Contact Network International support
2. Register webhook URL: `https://your-domain.com/functions/v1/payment-webhook`
3. Configure webhook authentication
4. Obtain webhook secret for signature verification

### Testing Connection

After configuration:
1. Click **"Test Connection"** button
2. Verifies credentials with provider
3. Shows success/error message

---

## Frontend Integration

### Payment Button Component

The reusable `PaymentButton` component automatically handles:
- Payment provider availability check
- Session creation via backend
- Redirect to checkout
- Error handling

**Usage Example**:
```tsx
import PaymentButton from '../components/PaymentButton';

<PaymentButton
  type="booking"
  itemId={bookingId}
  amount={totalAmount}
  currency="AED"
  metadata={{
    email: customerEmail,
    bookingNumber: bookingNumber
  }}
  onSuccess={() => console.log('Payment initiated')}
  onError={(error) => console.error(error)}
/>
```

**Props**:
- `type` - booking | order | lobby_pass
- `itemId` - UUID of the item being paid for
- `amount` - Total amount in currency units (e.g., 100.00)
- `currency` - Currency code (default: 'AED')
- `metadata` - Additional data to store with payment
- `onSuccess` - Callback when payment is initiated
- `onError` - Callback for errors
- `className` - Additional CSS classes
- `disabled` - Disable the button

### Payment Success Page

**URL**: `/payment/success?session_id={SESSION_ID}`

**Features**:
- Verifies payment status from database
- Displays payment details
- Shows booking/order reference
- Links to customer portal or home

### Payment Cancel Page

**URL**: `/payment/cancel`

**Features**:
- Informs user payment was cancelled
- Provides option to retry
- No charges were made

---

## Payment Flow

### 1. User Initiates Payment
```
Customer clicks "Pay Now" button
  ↓
Frontend calls create-payment-session Edge Function
  ↓
Backend creates payment record (status: pending)
  ↓
Backend calls provider API to create checkout session
  ↓
User redirected to provider checkout page
```

### 2. Payment Processing
```
User completes payment on provider's page
  ↓
Provider sends webhook to /payment-webhook
  ↓
Webhook handler verifies signature
  ↓
Payment record updated (status: paid)
  ↓
Related booking/order updated (status: confirmed)
  ↓
Invoice updated (payment_status: paid)
  ↓
Confirmation email sent
  ↓
User redirected to success page
```

### 3. Payment Failure
```
Payment fails or user cancels
  ↓
Provider sends webhook (if applicable)
  ↓
Payment record updated (status: failed/cancelled)
  ↓
User redirected to cancel page
  ↓
Booking remains in pending status for manual processing
```

---

## Security Considerations

### 1. Secret Key Storage
- **Never** expose secret keys to frontend
- Stored securely in `payment_settings` table
- Only accessible via service role (backend)
- Admin UI masks secret keys with password input

### 2. Webhook Verification
**Stripe**:
- HMAC-SHA256 signature verification
- Timestamp validation (prevents replay attacks)
- Event ID uniqueness check

**Network International**:
- HMAC-SHA256 signature verification
- Event ID uniqueness check

### 3. Row-Level Security
- Admins: Full access to payment settings
- Users: Can only view their own payments
- Staff: Can view all payments (read-only)
- Service Role: Can insert/update payment records

### 4. Idempotency
- Webhook event IDs stored in database
- Duplicate events automatically rejected
- Prevents double-charging and double-processing

---

## Testing

### Test Mode Setup

1. Configure test credentials in Payment Settings
2. Set mode to "Test"
3. Use test payment methods:

**Stripe Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**Network International**:
- Use sandbox environment credentials
- Contact provider for test card details

### Testing Checklist

- [ ] Payment session creation
- [ ] Successful payment flow
- [ ] Failed payment handling
- [ ] Payment cancellation
- [ ] Webhook delivery and processing
- [ ] Database status updates
- [ ] Email notifications
- [ ] Invoice synchronization
- [ ] Test→Live mode switch

---

## Monitoring & Debugging

### Webhook Logs

View webhook activity:
1. Admin Dashboard → Payment Settings
2. Scroll to bottom for recent webhook logs

**Log Information**:
- Provider name
- Event type
- Event ID
- Processing status
- Error messages (if any)
- Full payload (JSON)

### Payment Records

View payment transactions:
```sql
SELECT
  p.id,
  p.status,
  p.amount,
  p.currency,
  p.provider,
  p.provider_payment_id,
  p.created_at,
  p.paid_at,
  b.booking_number,
  o.order_number
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
LEFT JOIN orders o ON p.order_id = o.id
ORDER BY p.created_at DESC;
```

### Common Issues

**Payment Session Creation Fails**:
- Check payment settings are configured and active
- Verify secret key is valid
- Check Edge Function logs

**Webhook Not Received**:
- Verify webhook URL is configured in provider dashboard
- Check webhook endpoint is publicly accessible
- Verify webhook secret matches

**Payment Status Not Updating**:
- Check webhook logs for processing errors
- Verify webhook signature is valid
- Check database RLS policies

---

## Production Deployment Checklist

### Before Going Live

- [ ] Configure live payment credentials
- [ ] Switch mode to "Live"
- [ ] Test live payment with small amount
- [ ] Verify webhook URL is correct
- [ ] Configure webhook events in provider dashboard
- [ ] Test email notifications
- [ ] Backup database
- [ ] Monitor first few transactions closely

### Go-Live Steps

1. **Update Payment Settings**:
   - Switch from Test to Live mode
   - Update secret keys to live keys
   - Update webhook secret to live secret

2. **Provider Dashboard**:
   - Configure live webhook endpoint
   - Enable live API keys
   - Verify webhook events are subscribed

3. **Testing**:
   - Make a small test payment
   - Verify entire flow works
   - Check invoice updates
   - Confirm email delivery

4. **Monitoring**:
   - Watch webhook logs
   - Monitor payment status updates
   - Check for any errors

---

## API Reference

### Create Payment Session

**Endpoint**: `POST /functions/v1/create-payment-session`

**Headers**:
```
Authorization: Bearer {user-jwt-token}
Content-Type: application/json
```

**Request**:
```json
{
  "type": "booking",
  "itemId": "booking-uuid",
  "amount": 150.00,
  "currency": "AED",
  "metadata": {
    "email": "customer@example.com",
    "phone": "+971501234567"
  }
}
```

**Response Success**:
```json
{
  "success": true,
  "paymentId": "payment-uuid",
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "provider": "stripe"
}
```

**Response Error**:
```json
{
  "success": false,
  "error": "Payment provider not configured"
}
```

### Payment Webhook

**Endpoint**: `POST /functions/v1/payment-webhook`

**Headers** (Stripe):
```
Stripe-Signature: t=1234567890,v1=signature...
Content-Type: application/json
```

**Headers** (Network International):
```
X-Webhook-Signature: signature...
Content-Type: application/json
```

**Response**:
```json
{
  "received": true
}
```

---

## Support

### Provider Documentation

**Stripe**:
- [Checkout Session API](https://stripe.com/docs/api/checkout/sessions)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

**Network International**:
- [API Documentation](https://developer.network.ae/)
- [Webhooks Guide](https://developer.network.ae/webhooks)

### Troubleshooting

**Payment fails immediately**:
- Check card is valid
- Verify sufficient funds
- Check if 3D Secure is required

**Webhook not processing**:
- Verify signature verification is working
- Check Edge Function logs
- Ensure service role key has permissions

**Invoice not updating**:
- Check payment record is linked to invoice
- Verify webhook processed successfully
- Check database update queries

---

## Summary

Your payment integration is **production-ready** with:

✅ **Database**: Full payment schema with RLS
✅ **Edge Functions**: Session creation & webhook handler
✅ **Admin UI**: Payment settings configuration
✅ **Frontend**: Payment button & success/cancel pages
✅ **Security**: Webhook verification & secret key protection
✅ **Monitoring**: Comprehensive logging & audit trail
✅ **Documentation**: Complete setup and usage guide

**Next Steps**:
1. Configure payment provider credentials in Admin → Payment Settings
2. Test payment flow in test mode
3. Configure webhooks in provider dashboard
4. Switch to live mode when ready
5. Monitor first transactions closely

Your escape room booking system now accepts online payments securely through Stripe or Network International! 🚀
