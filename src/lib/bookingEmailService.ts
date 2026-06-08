import { supabase } from './supabase';

interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  gameName: string;
  bookingDate: string;
  bookingTime: string;
  playerCount: number;
  totalAmount: string;
  bookingNumber: string;
  billingAddress?: string;
}

export type BookingEmailType = 'booking_received' | 'booking_confirmation';

export async function sendBookingEmail(
  emailType: BookingEmailType,
  bookingData: BookingEmailData,
  options?: { to?: string; subjectOverride?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    const siteName = 'Escape Room';
    const currentYear = new Date().getFullYear();
    const bookingUrl = `${window.location.origin}/customer-portal`;

    const variables = {
      customer_name: bookingData.customerName,
      booking_number: bookingData.bookingNumber,
      game_name: bookingData.gameName,
      booking_date: bookingData.bookingDate,
      booking_time: bookingData.bookingTime,
      player_count: bookingData.playerCount.toString(),
      total_amount: bookingData.totalAmount,
      booking_url: bookingUrl,
      site_name: siteName,
      year: currentYear.toString(),
      billing_address: bookingData.billingAddress || '',
    };

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options?.to || bookingData.customerEmail,
        template_key: emailType,
        variables,
        subject_override: options?.subjectOverride,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to send email (Status ${response.status})`;
      try {
        const result = JSON.parse(errorText);
        errorMessage = result.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage}: ${errorText.slice(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error(`Error sending ${emailType} email:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

export async function sendAdminBookingNotification(
  emailType: BookingEmailType,
  bookingData: BookingEmailData
) {
  try {
    // 1. Fetch admin emails
    const { data } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notification_emails')
      .maybeSingle();
      
    if (!data || !(data as any).setting_value) {
      console.log('[BookingEmail] No admin notification emails configured. Skipping.');
      return { success: true };
    }

    const adminEmails = (data as any).setting_value;
    
    // 2. Send email
    console.log(`[BookingEmail] Sending ADMIN notification for ${emailType} to:`, adminEmails);
    
    // Create a descriptive subject
    const subjectPrefix = emailType === 'booking_received' ? 'New Booking Request' : 'Booking Confirmed';
    const subjectOverride = `[ADMIN] ${subjectPrefix} - #${bookingData.bookingNumber}`;
    
    return sendBookingEmail(emailType, bookingData, {
      to: adminEmails,
      subjectOverride
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, error: 'Failed to send admin notification' };
  }
}

export async function sendBookingReceivedEmail(bookingData: BookingEmailData) {
  console.log('[BookingEmail] Sending "Booking Received" email to:', bookingData.customerEmail);
  return sendBookingEmail('booking_received', bookingData);
}

export async function sendBookingConfirmationEmail(bookingData: BookingEmailData) {
  console.log('[BookingEmail] Sending "Booking Confirmation" email to:', bookingData.customerEmail);
  return sendBookingEmail('booking_confirmation', bookingData);
}

// Legacy function name for backward compatibility
export async function sendBookingConfirmedEmail(bookingData: BookingEmailData) {
  console.log('[BookingEmail] Sending "Booking Confirmation" email to:', bookingData.customerEmail);
  return sendBookingEmail('booking_confirmation', bookingData);
}

export async function getBookingEmailData(bookingId: string): Promise<BookingEmailData | null> {
  try {
    const { data: bookingResult, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        customer_name,
        customer_email,
        booking_date,
        start_time,
        number_of_players,
        final_amount,
        billing_address,
        game:games(name),
        lobby_game:lobby_games(name)
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    if (!bookingResult) return null;

    const booking = bookingResult as any;

    const gameName = booking.game?.name || booking.lobby_game?.name || 'Game';

    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const bookingTime = booking.start_time || 'TBD';

    let billingAddressStr = '';
    if (booking.billing_address) {
      const ba = booking.billing_address;
      const parts = [
        (ba.billing_name || ba.name) && (ba.billing_name || ba.name) !== booking.customer_name ? (ba.billing_name || ba.name) : null,
        ba.billing_address_line_1 || ba.address_line_1,
        ba.billing_address_line_2 || ba.address_line_2,
        ba.billing_city || ba.city,
        ba.billing_emirate_or_state || ba.emirate,
        ba.billing_country || ba.country,
        (ba.billing_postal_code || ba.postal_code) ? `PO Box: ${ba.billing_postal_code || ba.postal_code}` : null,
        (ba.billing_vat_or_tax_number || ba.vat_number) ? `TRN: ${ba.billing_vat_or_tax_number || ba.vat_number}` : null
      ];
      billingAddressStr = parts.filter(Boolean).join(', ');
    }

    return {
      bookingId: booking.id,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      gameName,
      bookingDate,
      bookingTime,
      playerCount: booking.number_of_players,
      totalAmount: `AED ${booking.final_amount}`,
      bookingNumber: booking.booking_number,
      billingAddress: billingAddressStr,
    };
  } catch (error) {
    console.error('Error fetching booking email data:', error);
    return null;
  }
}
