import { supabase } from './supabase';

export interface EmailVariables {
  [key: string]: string;
}

export interface SendEmailParams {
  to: string;
  template_key: string;
  variables: EmailVariables;
  subject_override?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getBaseUrl(): string {
  return window.location.origin;
}

export function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  await sendEmail({
    to: userEmail,
    template_key: 'user_signup',
    variables: {
      user_name: userName,
      login_url: `${getBaseUrl()}/login`,
      site_name: 'Escape Room',
    },
  });
}

export async function sendBookingConfirmationEmail(
  customerEmail: string,
  customerName: string,
  bookingNumber: string,
  gameName: string,
  bookingDate: string,
  bookingTime: string,
  playerCount: string,
  totalAmount: string,
  billingAddress?: string
): Promise<void> {
  await sendEmail({
    to: customerEmail,
    template_key: 'booking_confirmation',
    variables: {
      customer_name: customerName,
      booking_number: bookingNumber,
      game_name: gameName,
      booking_date: bookingDate,
      booking_time: bookingTime,
      player_count: playerCount,
      total_amount: totalAmount,
      booking_url: `${getBaseUrl()}/customer`,
      site_name: 'Escape Room',
      billing_address: billingAddress || '',
    },
  });
}

export async function sendBookingStatusChangedEmail(
  customerEmail: string,
  customerName: string,
  bookingNumber: string,
  gameName: string,
  newStatus: string
): Promise<void> {
  await sendEmail({
    to: customerEmail,
    template_key: 'booking_status_changed',
    variables: {
      customer_name: customerName,
      booking_number: bookingNumber,
      game_name: gameName,
      new_status: newStatus,
      booking_url: `${getBaseUrl()}/customer`,
      site_name: 'Escape Room',
    },
  });
}

export async function sendPaymentConfirmationEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  paymentMethod: string,
  paymentDate: string,
  amountPaid: string,
  billingAddress?: string
): Promise<void> {
  await sendEmail({
    to: customerEmail,
    template_key: 'payment_confirmation',
    variables: {
      customer_name: customerName,
      invoice_number: invoiceNumber,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      amount_paid: amountPaid,
      site_name: 'Escape Room',
      billing_address: billingAddress || '',
    },
  });
}

export async function sendWaiverSignedEmail(
  customerEmail: string,
  customerName: string,
  gameName: string,
  bookingNumber: string,
  bookingDate: string
): Promise<void> {
  await sendEmail({
    to: customerEmail,
    template_key: 'waiver_signed',
    variables: {
      customer_name: customerName,
      game_name: gameName,
      booking_number: bookingNumber,
      booking_date: bookingDate,
      site_name: 'Escape Room',
    },
  });
}

export async function sendAccountCreatedEmail(
  userEmail: string,
  userName: string,
  tempPassword: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    template_key: 'account_created',
    variables: {
      user_name: userName,
      user_email: userEmail,
      temp_password: tempPassword,
      login_url: `${getBaseUrl()}/login`,
      site_name: 'Escape Room',
    },
  });
}

export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetUrl: string,
  expiryHours: string = '24'
): Promise<void> {
  await sendEmail({
    to: userEmail,
    template_key: 'password_reset',
    variables: {
      user_name: userName,
      reset_url: resetUrl,
      expiry_hours: expiryHours,
      site_name: 'Escape Room',
    },
  });
}

export async function sendAdminNotification(
  userEmail: string,
  userName: string,
  signupMethod: string
): Promise<void> {
  try {
    const { data: adminSettings } = await (supabase
      .from('site_settings') as any)
      .select('setting_value')
      .eq('setting_key', 'admin_notification_emails')
      .single();

    if (adminSettings?.setting_value) {
      await sendEmail({
        to: adminSettings.setting_value,
        template_key: 'admin_new_user_notification',
        variables: {
          user_name: userName,
          user_email: userEmail,
          signup_method: signupMethod,
          signup_time: new Date().toLocaleString(),
        },
      });
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}
