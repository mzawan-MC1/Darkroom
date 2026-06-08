
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xvmbtzwcchdbapqoywjf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoice() {
  console.log('Checking invoice INV-20251222-000053...');
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', 'INV-20251222-000053')
    .single();

  if (error) {
    console.error('Error fetching invoice:', error);
  } else {
    console.log('Invoice Data:', JSON.stringify(data, null, 2));
  }
}

checkInvoice();
