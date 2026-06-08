import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../lib/currencyUtils';
import { sendPaymentConfirmationEmail } from '../../lib/emailService';
import AdminPagination from '../../components/AdminPagination';
import {
  Plus,
  Eye,
  Download,
  Printer,
  Search,
  DollarSign,
  Tag,
  Edit3,
  CreditCard,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  trn_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  admin_discount_percentage: number;
  admin_discount_amount: number;
  admin_discount_reason: string | null;
  total_amount: number;
  amount_paid: number;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  issued_at: string;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
  game_name: string | null;
  lobby_game_name: string | null;
  booking_type: string;
  booking_id: string | null;
  booking_number?: string | null;
  refunded_amount: number;
  refunded_at: string | null;
  refund_reason: string | null;
  billing_address?: {
    billing_name?: string;
    billing_address_line_1?: string;
    billing_address_line_2?: string;
    billing_city?: string;
    billing_emirate_or_state?: string;
    billing_country?: string;
    billing_postal_code?: string;
    billing_vat_or_tax_number?: string;
    // Fallback properties for customer-created bookings
    name?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    emirate?: string;
    country?: string;
    postal_code?: string;
    vat_number?: string;
  } | null;
}

interface InvoiceLineItem {
  id: string;
  item_type: string;
  product_name: string | null;
  description?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function InvoiceManagement() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [companyName, setCompanyName] = useState('Escape Room');
  const [companyLogo, setCompanyLogo] = useState('');

  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  });

  const [discountForm, setDiscountForm] = useState({
    discount_percentage: 0,
    discount_reason: '',
  });

  const [refundForm, setRefundForm] = useState({
    amount: 0,
    reason: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    payment_method: '',
    amount_paid: 0,
    payment_reference: '',
  });

  const [items, setItems] = useState([
    { item_type: 'custom', description: '', quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    loadSiteSettings();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadSiteSettings = async () => {
    try {
      const { data: settingsData, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'logo_url']);

      if (error) throw error;

      const data = settingsData as any[];

      if (data) {
        const companyNameSetting = data.find((s) => s.setting_key === 'company_name');
        const logoSetting = data.find((s) => s.setting_key === 'logo_url');

        if (companyNameSetting) {
          setCompanyName(companyNameSetting.setting_value as string);
        }
        if (logoSetting) {
          setCompanyLogo(logoSetting.setting_value as string);
        }
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          *,
          bookings!invoices_booking_id_fkey (
            booking_number,
            booking_type,
            game_id,
            lobby_game_id,
            games (name),
            lobby_games (name)
          )
        `, { count: 'exact' });

      // Apply Search
      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      // Apply Status Filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('issued_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setTotalItems(count || 0);

      const invoicesWithDetails = (data || []).map((invoice: any) => ({
        ...invoice,
        booking_number: invoice.bookings?.booking_number || null,
        booking_type: invoice.booking_type || invoice.bookings?.booking_type || 'custom',
        game_name: invoice.bookings?.games?.name || null,
        lobby_game_name: invoice.bookings?.lobby_games?.name || null,
      }));

      setInvoices(invoicesWithDetails);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('id, product_name, description, quantity, unit_price, line_total')
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      setLineItems(data || []);
    } catch (error) {
      console.error('Error loading invoice details:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (items.length === 0) {
        throw new Error('Please add at least one line item');
      }

      const hasEmptyDescription = items.some(item => !item.description.trim());
      if (hasEmptyDescription) {
        throw new Error('All items must have a description');
      }

      const hasInvalidPrice = items.some(item => item.unit_price <= 0);
      if (hasInvalidPrice) {
        throw new Error('All items must have a price greater than 0');
      }

      const lineItemsJson = items.map((item) => ({
        item_type: item.item_type,
        item_id: null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      console.log('Creating invoice with data:', {
        customer_name_param: createForm.customer_name,
        customer_email_param: createForm.customer_email,
        customer_phone_param: createForm.customer_phone,
        line_items: lineItemsJson,
        admin_discount_pct: 0,
        discount_reason_param: null,
        notes_param: createForm.notes || null,
        booking_id_param: null,
      });

      const { data, error } = await supabase.rpc('create_flexible_invoice', {
        customer_name_param: createForm.customer_name,
        customer_email_param: createForm.customer_email,
        customer_phone_param: createForm.customer_phone,
        line_items: lineItemsJson,
        admin_discount_pct: 0,
        discount_reason_param: null,
        notes_param: createForm.notes || null,
        booking_id_param: null,
      } as any);

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      console.log('Invoice created successfully:', data);
      alert('Invoice created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      loadInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.message || error.hint || error.details || 'Failed to create invoice';
      alert(`Failed to generate invoice: ${errorMessage}`);
    }
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const { error } = await supabase.rpc('apply_admin_discount_to_invoice', {
        invoice_id_param: selectedInvoice.id,
        discount_percentage: discountForm.discount_percentage,
        discount_reason: discountForm.discount_reason,
      } as any);

      if (error) throw error;

      alert('Discount applied successfully!');
      setShowDiscountModal(false);
      loadInvoices();
    } catch (error: any) {
      console.error('Error applying discount:', error);
      alert(error.message || 'Failed to apply discount');
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      if (refundForm.amount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }

      const remainingPaid = (selectedInvoice.amount_paid || 0) - (selectedInvoice.refunded_amount || 0);
      if (refundForm.amount > remainingPaid) {
        throw new Error(`Refund amount cannot exceed remaining paid amount (${formatPrice(remainingPaid)})`);
      }

      const { data, error } = await supabase.rpc('process_invoice_refund', {
        p_invoice_id: selectedInvoice.id,
        p_refund_amount: refundForm.amount,
        p_reason: refundForm.reason,
        p_updated_by: user?.id || null,
      } as any);

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Failed to process refund');
      }

      alert('Refund processed successfully!');
      setShowRefundModal(false);
      setRefundForm({ amount: 0, reason: '' });
      loadInvoices();
      if (showViewModal) {
        // Refresh view modal data if open? 
        // We'll just close it or reload
        loadInvoices(); 
        // We might want to reload specific invoice details but loadInvoices refreshes the list which is used for selectedInvoice if we update it?
        // Actually selectedInvoice is a state copy. We should update it or close modal.
        setShowViewModal(false); 
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      alert(error.message || 'Failed to process refund');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      if ((statusForm.status === 'paid' || statusForm.status === 'partially_paid')) {
        const amountPaid = Number(statusForm.amount_paid);
        const totalAmount = Number(selectedInvoice.total_amount);
        const epsilon = 0.01; // Tolerance for floating point comparison

        if (amountPaid <= 0) {
          throw new Error('Amount paid must be greater than 0');
        }

        // Use epsilon tolerance for floating point comparison
        if (amountPaid - totalAmount > epsilon) {
          throw new Error(`Amount paid cannot exceed total amount (${formatPrice(totalAmount)})`);
        }

        // Check if amount is significantly less than total (more than epsilon difference)
        if (statusForm.status === 'paid' && (totalAmount - amountPaid) > epsilon) {
          const confirmPartial = confirm(
            `Amount paid (${formatPrice(amountPaid)}) is less than total (${formatPrice(totalAmount)}). Mark as Partially Paid instead?`
          );
          if (confirmPartial) {
            setStatusForm({ ...statusForm, status: 'partially_paid' });
            return;
          }
        }

        if (!statusForm.payment_method) {
          throw new Error('Please select a payment method');
        }
      }

      const { data, error } = await supabase.rpc('update_invoice_status', {
        p_invoice_id: selectedInvoice.id,
        p_new_status: statusForm.status,
        p_payment_method: statusForm.payment_method || null,
        p_amount_paid: statusForm.amount_paid || null,
        p_payment_reference: statusForm.payment_reference || null,
        p_updated_by: user?.id || null,
      } as any);

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Failed to update invoice status');
      }

      if (statusForm.status === 'paid' && selectedInvoice) {
        try {
          await sendPaymentConfirmationEmail(
            selectedInvoice.customer_email,
            selectedInvoice.customer_name,
            selectedInvoice.invoice_number,
            statusForm.payment_method || 'N/A',
            new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            formatPrice(statusForm.amount_paid),
            selectedInvoice.billing_address ? [
              selectedInvoice.billing_address.billing_name && selectedInvoice.billing_address.billing_name !== selectedInvoice.customer_name ? selectedInvoice.billing_address.billing_name : null,
              selectedInvoice.billing_address.billing_address_line_1,
              selectedInvoice.billing_address.billing_address_line_2,
              selectedInvoice.billing_address.billing_city,
              selectedInvoice.billing_address.billing_emirate_or_state,
              selectedInvoice.billing_address.billing_country,
              selectedInvoice.billing_address.billing_postal_code ? `PO Box: ${selectedInvoice.billing_address.billing_postal_code}` : null,
              selectedInvoice.billing_address.billing_vat_or_tax_number ? `TRN: ${selectedInvoice.billing_address.billing_vat_or_tax_number}` : null
            ].filter(Boolean).join(', ') : ''
          );
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
      }

      alert(`Invoice status updated successfully! ${result.booking_id ? 'Booking also updated.' : ''}`);
      setShowStatusModal(false);
      loadInvoices();
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      alert(error.message || 'Failed to update invoice status');
    }
  };

  const openStatusModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setStatusForm({
      status: invoice.status,
      payment_method: invoice.payment_method || '',
      amount_paid: invoice.amount_paid || 0,
      payment_reference: invoice.payment_reference || '',
    });
    setShowStatusModal(true);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    await loadInvoiceDetails(invoice.id);
    setShowViewModal(true);
  };

  const handlePrint = () => {
    if (!selectedInvoice) return;

    const printWindow = window.open('', '', 'width=800,height=900');
    if (printWindow) {
      const lineItemsHTML = lineItems.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_name || item.description || ''}</td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatPrice(item.unit_price)}</td>
          <td style="padding: 12px; text-align: right; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${formatPrice(item.line_total)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${selectedInvoice.invoice_number}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 40px;
                color: #1f2937;
                line-height: 1.6;
              }
              .company-header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 3px solid #ea580c;
              }
              .company-logo-img {
                max-width: 150px;
                max-height: 80px;
                margin: 0 auto 15px;
                display: block;
              }
              .company-name {
                font-size: 28px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 5px;
              }
              .invoice-title {
                font-size: 28px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 5px;
              }
              .invoice-number {
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 3px;
              }
              .trn-number {
                font-size: 14px;
                color: #6b7280;
              }
              .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                gap: 40px;
              }
              .detail-section {
                flex: 1;
              }
              .detail-section h3 {
                font-size: 14px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                margin-bottom: 10px;
                letter-spacing: 1px;
              }
              .detail-section p {
                margin-bottom: 5px;
                color: #1f2937;
              }
              .detail-label {
                font-size: 13px;
                color: #6b7280;
                display: inline-block;
                width: 80px;
              }
              .detail-value {
                font-weight: 600;
                color: #1f2937;
              }
              .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .status-paid { background-color: #d1fae5; color: #065f46; }
              .status-pending { background-color: #fef3c7; color: #92400e; }
              .status-cancelled { background-color: #fee2e2; color: #991b1b; }
              .status-overdue { background-color: #fee2e2; color: #991b1b; }
              .status-partial { background-color: #dbeafe; color: #1e40af; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
                background: white;
              }
              thead {
                background-color: #f9fafb;
              }
              th {
                padding: 14px 12px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid #e5e7eb;
              }
              th:nth-child(2), td:nth-child(2) { text-align: center; }
              th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { text-align: right; }
              .totals-section {
                margin-top: 30px;
                display: flex;
                justify-content: flex-end;
              }
              .totals-table {
                width: 350px;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .totals-label {
                color: #6b7280;
                font-size: 14px;
              }
              .totals-value {
                font-weight: 600;
                color: #1f2937;
                font-size: 14px;
              }
              .discount-row .totals-label,
              .discount-row .totals-value {
                color: #ea580c;
              }
              .total-row {
                padding: 16px 0;
                border-top: 2px solid #1f2937;
                border-bottom: none;
                margin-top: 10px;
              }
              .total-row .totals-label,
              .total-row .totals-value {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
              }
              .notes-section {
                margin-top: 40px;
                padding: 20px;
                background-color: #f9fafb;
                border-radius: 8px;
                border-left: 4px solid #ea580c;
              }
              .notes-section h4 {
                font-weight: 600;
                margin-bottom: 10px;
                color: #1f2937;
              }
              .footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
              }
              @media print {
                body { padding: 20px; }
                .company-header { page-break-after: avoid; }
                table { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="company-header">
              ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="company-logo-img" />` : ''}
              <div class="company-name">${companyName}</div>
            </div>

            <div style="text-align: center; margin-bottom: 40px;">
              <h1 class="invoice-title">INVOICE</h1>
              <p class="invoice-number">${selectedInvoice.invoice_number}</p>
              <p class="trn-number">TRN: ${selectedInvoice.trn_number}</p>
            </div>

            <div class="invoice-details">
              <div class="detail-section">
                <h3>Bill To</h3>
                <p style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${selectedInvoice.customer_name}</p>
                <p style="color: #6b7280;">${selectedInvoice.customer_email}</p>
                ${selectedInvoice.customer_phone ? `<p style="color: #6b7280;">${selectedInvoice.customer_phone}</p>` : ''}
                
                ${selectedInvoice.billing_address ? `
                  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <h4 style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Billing Address</h4>
                    ${(selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name) && (selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name) !== selectedInvoice.customer_name ? `<p style="color: #1f2937;">${selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name}</p>` : ''}
                    <p style="color: #6b7280;">${selectedInvoice.billing_address.billing_address_line_1 || selectedInvoice.billing_address.address_line_1}</p>
                    ${selectedInvoice.billing_address.billing_address_line_2 || selectedInvoice.billing_address.address_line_2 ? `<p style="color: #6b7280;">${selectedInvoice.billing_address.billing_address_line_2 || selectedInvoice.billing_address.address_line_2}</p>` : ''}
                    <p style="color: #6b7280;">
                      ${[
                        selectedInvoice.billing_address.billing_city || selectedInvoice.billing_address.city,
                        selectedInvoice.billing_address.billing_emirate_or_state || selectedInvoice.billing_address.emirate,
                        selectedInvoice.billing_address.billing_country || selectedInvoice.billing_address.country
                      ].filter(Boolean).join(', ')}
                    </p>
                    ${selectedInvoice.billing_address.billing_postal_code || selectedInvoice.billing_address.postal_code ? `<p style="color: #6b7280;">PO Box: ${selectedInvoice.billing_address.billing_postal_code || selectedInvoice.billing_address.postal_code}</p>` : ''}
                    ${selectedInvoice.billing_address.billing_vat_or_tax_number || selectedInvoice.billing_address.vat_number ? `<p style="color: #6b7280; margin-top: 4px;">TRN/VAT: ${selectedInvoice.billing_address.billing_vat_or_tax_number || selectedInvoice.billing_address.vat_number}</p>` : ''}
                  </div>
                ` : ''}
              </div>
              <div class="detail-section" style="text-align: right;">
                <div style="margin-bottom: 12px;">
                  <span class="detail-label">Issue Date:</span>
                  <span class="detail-value">${new Date(selectedInvoice.issued_at).toLocaleDateString()}</span>
                </div>
                <div style="margin-bottom: 12px;">
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value">${new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span class="status-badge status-${selectedInvoice.status}">${selectedInvoice.status.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHTML}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-table">
                <div class="totals-row">
                  <span class="totals-label">Subtotal:</span>
                  <span class="totals-value">${formatPrice(selectedInvoice.subtotal)}</span>
                </div>
                ${selectedInvoice.discount_amount > 0 ? `
                  <div class="totals-row discount-row">
                    <span class="totals-label">Booking Discount:</span>
                    <span class="totals-value">-${formatPrice(selectedInvoice.discount_amount)}</span>
                  </div>
                ` : ''}
                ${selectedInvoice.admin_discount_amount > 0 ? `
                  <div class="totals-row discount-row">
                    <span class="totals-label">Admin Discount (${selectedInvoice.admin_discount_percentage}%):</span>
                    <span class="totals-value">-${formatPrice(selectedInvoice.admin_discount_amount)}</span>
                  </div>
                ` : ''}
                <div class="totals-row">
                  <span class="totals-label">VAT (5%):</span>
                  <span class="totals-value">${formatPrice(selectedInvoice.tax_amount)}</span>
                </div>
                <div class="totals-row total-row">
                  <span class="totals-label">Total:</span>
                  <span class="totals-value">${formatPrice(selectedInvoice.total_amount)}</span>
                </div>
              </div>
            </div>

            ${selectedInvoice.notes ? `
              <div class="notes-section">
                <h4>Notes</h4>
                <p>${selectedInvoice.notes}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="margin-top: 5px;">${companyName} | TRN: ${selectedInvoice.trn_number}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownloadCSV = () => {
    if (!selectedInvoice || lineItems.length === 0) return;

      const csv = [
        ['Invoice Number', selectedInvoice.invoice_number],
        ['Date', new Date(selectedInvoice.issued_at).toLocaleDateString()],
        ['Customer', selectedInvoice.customer_name],
        ['Email', selectedInvoice.customer_email],
        ['Phone', selectedInvoice.customer_phone || 'N/A'],
        [''],
        ['Product', 'Quantity', 'Unit Price', 'Total'],
        ...lineItems.map((item) => [
          item.product_name,
          item.quantity,
          formatPrice(item.unit_price),
          formatPrice(item.line_total),
        ]),
      [''],
      ['Subtotal', '', '', formatPrice(selectedInvoice.subtotal)],
      selectedInvoice.admin_discount_amount > 0
        ? ['Admin Discount', '', '', `-${formatPrice(selectedInvoice.admin_discount_amount)}`]
        : [],
      ['Tax (5%)', '', '', formatPrice(selectedInvoice.tax_amount)],
      ['Total', '', '', formatPrice(selectedInvoice.total_amount)],
    ]
      .filter((row) => row.length > 0)
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${selectedInvoice.invoice_number}.csv`;
    a.click();
  };

  const addItem = () => {
    setItems([...items, { item_type: 'custom', description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const resetCreateForm = () => {
    setCreateForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      notes: '',
    });
    setItems([{ item_type: 'custom', description: '', quantity: 1, unit_price: 0 }]);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.05;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    return subtotal + tax;
  };

  // Client-side filtering removed in favor of server-side filtering
  // const filteredInvoices = ...

  const getServiceLabel = (invoice: Invoice) => {
    if (invoice.game_name) return invoice.game_name;
    if (invoice.lobby_game_name) return invoice.lobby_game_name;
    if (invoice.booking_type === 'merchandise') return 'Merchandise';
    if (invoice.booking_type === 'video_request') return 'Video Request';
    if (invoice.notes && invoice.notes.toLowerCase().includes('video order')) return 'Video Order';
    return 'Custom Invoice';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
      paid: 'bg-primary-400/20 text-primary-300 border border-primary-400/30',
      partially_paid: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
      cancelled: 'bg-primary-600/20 text-primary-500 border border-primary-600/30',
      refunded: 'bg-slate-800/50 text-slate-400 border border-slate-700',
      partially_refunded: 'bg-orange-900/20 text-orange-400 border border-orange-900/30',
    };

    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoice Management</h1>
          <p className="text-slate-300 mt-1">Create and manage invoices for all purchases</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-red-900/30 p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading && (
          <div className="text-sm text-slate-400">
            Loading invoices...
          </div>
        )}


        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/50 border-b border-red-900/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Game/Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-900/30">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-black/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-white">{invoice.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{invoice.customer_name}</div>
                      <div className="text-sm text-slate-400">{invoice.customer_email}</div>
                      {invoice.booking_number && (
                        <div className="text-xs text-primary-500 font-mono mt-0.5">
                          {invoice.booking_number}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-sm text-white">
                        {invoice.game_name || invoice.lobby_game_name || getServiceLabel(invoice)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {invoice.game_name && 'Escape Room'}
                        {invoice.lobby_game_name && !invoice.game_name && 'Lobby Game'}
                        {!invoice.game_name && !invoice.lobby_game_name && invoice.booking_type === 'merchandise' && 'Merchandise'}
                        {!invoice.game_name && !invoice.lobby_game_name && invoice.booking_type !== 'merchandise' && getServiceLabel(invoice)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {new Date(invoice.issued_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-white">{formatPrice(invoice.total_amount)}</div>
                    {invoice.admin_discount_amount > 0 && (
                      <div className="text-xs text-primary-400">
                        Discount: -{invoice.admin_discount_percentage}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="p-2 text-primary-500 hover:bg-primary-500/20 rounded-lg"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openStatusModal(invoice)}
                        className="p-2 text-primary-500 hover:bg-primary-500/20 rounded-lg"
                        title="Update Status"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {(invoice.status === 'paid' || invoice.status === 'partially_paid' || invoice.status === 'partially_refunded') && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            const remaining = (invoice.amount_paid || 0) - (invoice.refunded_amount || 0);
                            setRefundForm({ amount: remaining, reason: '' });
                            setShowRefundModal(true);
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg"
                          title="Refund"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDiscountModal(true);
                          }}
                          className="p-2 text-primary-500 hover:bg-primary-500/20 rounded-lg"
                          title="Apply Discount"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoices.length === 0 && (
          <div className="text-center py-12 text-slate-400">No invoices found</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold text-white">Create New Invoice</h2>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.customer_email}
                    onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Phone</label>
                <input
                  type="tel"
                  value={createForm.customer_phone}
                  onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white">Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary-500 hover:text-primary-400"
                  >
                    + Add Item
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="col-span-5 px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-primary-500"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-primary-500"
                      min="1"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="col-span-3 px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-primary-500"
                      step="0.01"
                      min="0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="col-span-2 px-3 py-2 text-primary-500 hover:bg-primary-500/20 rounded-lg text-sm"
                      disabled={items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-black/30 border border-red-900/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-white">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatPrice(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Tax (5%):</span>
                  <span className="font-semibold">{formatPrice(calculateTax(calculateSubtotal()))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-red-900/30 pt-2 text-white">
                  <span>Total:</span>
                  <span>{formatPrice(calculateTotal())}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Notes (Optional)</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-red-900/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-red-900/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Invoice {selectedInvoice.invoice_number}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            <div ref={printRef} className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">INVOICE</h1>
                <p className="text-slate-400">{selectedInvoice.invoice_number}</p>
                <p className="text-slate-400 text-sm mt-1">TRN: {selectedInvoice.trn_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-white mb-2">Bill To:</h3>
                  <p className="text-slate-300">{selectedInvoice.customer_name}</p>
                  <p className="text-slate-400 text-sm">{selectedInvoice.customer_email}</p>
                  {selectedInvoice.customer_phone && (
                  <p className="text-slate-400 text-sm">{selectedInvoice.customer_phone}</p>
                )}
                
                {selectedInvoice.billing_address && (
                  <div className="mt-4 pt-4 border-t border-red-900/30">
                    <h4 className="font-semibold text-white mb-1 text-sm">Billing Address:</h4>
                    {(selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name) && (selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name) !== selectedInvoice.customer_name && (
                      <p className="text-slate-300 text-sm">{selectedInvoice.billing_address.billing_name || selectedInvoice.billing_address.name}</p>
                    )}
                    <p className="text-slate-400 text-sm">{selectedInvoice.billing_address.billing_address_line_1 || selectedInvoice.billing_address.address_line_1}</p>
                    {(selectedInvoice.billing_address.billing_address_line_2 || selectedInvoice.billing_address.address_line_2) && (
                      <p className="text-slate-400 text-sm">{selectedInvoice.billing_address.billing_address_line_2 || selectedInvoice.billing_address.address_line_2}</p>
                    )}
                    <p className="text-slate-400 text-sm">
                      {[
                        selectedInvoice.billing_address.billing_city || selectedInvoice.billing_address.city,
                        selectedInvoice.billing_address.billing_emirate_or_state || selectedInvoice.billing_address.emirate,
                        selectedInvoice.billing_address.billing_country || selectedInvoice.billing_address.country
                      ].filter(Boolean).join(', ')}
                    </p>
                    {(selectedInvoice.billing_address.billing_postal_code || selectedInvoice.billing_address.postal_code) && (
                      <p className="text-slate-400 text-sm">PO Box: {selectedInvoice.billing_address.billing_postal_code || selectedInvoice.billing_address.postal_code}</p>
                    )}
                    {(selectedInvoice.billing_address.billing_vat_or_tax_number || selectedInvoice.billing_address.vat_number) && (
                      <p className="text-slate-400 text-sm mt-1">TRN/VAT: {selectedInvoice.billing_address.billing_vat_or_tax_number || selectedInvoice.billing_address.vat_number}</p>
                    )}
                  </div>
                )}
              </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-slate-400 text-sm">Date:</span>
                    <span className="ml-2 font-semibold text-white">
                      {new Date(selectedInvoice.issued_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-slate-400 text-sm">Due Date:</span>
                    <span className="ml-2 font-semibold text-white">
                      {new Date(selectedInvoice.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                  {(selectedInvoice.status === 'paid' || selectedInvoice.status === 'partially_paid' || selectedInvoice.status === 'partially_refunded') && (
                    <button
                      onClick={() => {
                        const remaining = (selectedInvoice.amount_paid || 0) - (selectedInvoice.refunded_amount || 0);
                        setRefundForm({ amount: remaining, reason: '' });
                        setShowRefundModal(true);
                      }}
                      className="mt-2 text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded border border-red-500/20 hover:bg-red-500/20"
                    >
                      Process Refund
                    </button>
                  )}
                </div>
              </div>

              <table className="w-full mb-8">
                <thead className="bg-black/50 border-b-2 border-red-900/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-white">Description</th>
                    <th className="px-4 py-3 text-center text-white">Quantity</th>
                    <th className="px-4 py-3 text-right text-white">Unit Price</th>
                    <th className="px-4 py-3 text-right text-white">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-red-900/30">
                      <td className="px-4 py-3 text-white">{item.product_name || item.description}</td>
                      <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-white">{formatPrice(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatPrice(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between py-2 text-white">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-semibold">{formatPrice(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between py-2 text-primary-400">
                      <span>Booking Discount:</span>
                      <span className="font-semibold">
                        -{formatPrice(selectedInvoice.discount_amount)}
                      </span>
                    </div>
                  )}
                  {selectedInvoice.admin_discount_amount > 0 && (
                    <div className="flex justify-between py-2 text-primary-400">
                      <span>
                        Admin Discount ({selectedInvoice.admin_discount_percentage}%):
                      </span>
                      <span className="font-semibold">
                        -{formatPrice(selectedInvoice.admin_discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 text-white">
                    <span className="text-slate-400">Tax (5%):</span>
                    <span className="font-semibold">{formatPrice(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-red-900/30 text-lg font-bold text-white">
                    <span>Total:</span>
                    <span>{formatPrice(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm text-green-400">
                    <span>Amount Paid:</span>
                    <span>{formatPrice(selectedInvoice.amount_paid || 0)}</span>
                  </div>
                  {selectedInvoice.refunded_amount > 0 && (
                     <div className="flex justify-between py-1 text-sm text-red-400">
                      <span>Refunded:</span>
                      <span>-{formatPrice(selectedInvoice.refunded_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t border-red-900/30 font-bold text-white">
                    <span>Net Revenue:</span>
                    <span>{formatPrice((selectedInvoice.amount_paid || 0) - (selectedInvoice.refunded_amount || 0))}</span>
                  </div>
                  {(selectedInvoice.discount_amount > 0 || selectedInvoice.admin_discount_amount > 0) && (
                    <div className="pt-2 text-sm text-primary-400 text-right">
                      Total Savings: {formatPrice(selectedInvoice.discount_amount + selectedInvoice.admin_discount_amount)}
                    </div>
                  )}
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="bg-black/30 border border-red-900/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Notes:</h4>
                  <p className="text-slate-300">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-red-900/30 p-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Process Refund</h2>
              <form onSubmit={handleRefund} className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-2 mb-4">
                   <div className="flex justify-between text-sm text-white">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{formatPrice(selectedInvoice.amount_paid || 0)}</span>
                   </div>
                   <div className="flex justify-between text-sm text-white">
                      <span>Already Refunded:</span>
                      <span className="font-mono">{formatPrice(selectedInvoice.refunded_amount || 0)}</span>
                   </div>
                   <div className="flex justify-between text-sm font-bold text-white border-t border-red-500/30 pt-2">
                      <span>Refundable:</span>
                      <span className="font-mono">{formatPrice((selectedInvoice.amount_paid || 0) - (selectedInvoice.refunded_amount || 0))}</span>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    value={refundForm.amount}
                    onChange={(e) =>
                      setRefundForm({ ...refundForm, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Reason</label>
                  <textarea
                    value={refundForm.reason}
                    onChange={(e) =>
                      setRefundForm({ ...refundForm, reason: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="e.g., Customer request, Booking cancelled"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundForm({ amount: 0, reason: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm Refund
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDiscountModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Apply Admin Discount</h2>
              <form onSubmit={handleApplyDiscount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Discount Percentage
                  </label>
                  <input
                    type="number"
                    value={discountForm.discount_percentage}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, discount_percentage: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Reason</label>
                  <textarea
                    value={discountForm.discount_reason}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, discount_reason: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    required
                  />
                </div>
                <div className="bg-black/30 border border-red-900/30 p-4 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm text-white">
                    <span>Current Total:</span>
                    <span className="font-semibold">{formatPrice(selectedInvoice.total_amount)}</span>
                  </div>
                  {discountForm.discount_percentage > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-primary-400">
                        <span>Discount:</span>
                        <span>
                          -{formatPrice((selectedInvoice.subtotal * discountForm.discount_percentage) / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-red-900/30 pt-1 mt-1 text-white">
                        <span>New Total:</span>
                        <span>
                          {formatPrice(
                            selectedInvoice.subtotal -
                            (selectedInvoice.subtotal * discountForm.discount_percentage) / 100 +
                            (selectedInvoice.subtotal -
                              (selectedInvoice.subtotal * discountForm.discount_percentage) / 100) *
                              0.05
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscountModal(false);
                      setDiscountForm({ discount_percentage: 0, discount_reason: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Apply Discount
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <CreditCard className="w-6 h-6" />
                Update Invoice Status
              </h2>
              <p className="text-slate-300 mt-1">Invoice #{selectedInvoice.invoice_number}</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Invoice Status</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {(statusForm.status === 'paid' || statusForm.status === 'partially_paid') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">Payment Method</label>
                      <select
                        value={statusForm.payment_method}
                        onChange={(e) => setStatusForm({ ...statusForm, payment_method: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select payment method...</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="online">Online</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        value={statusForm.amount_paid}
                        onChange={(e) => setStatusForm({ ...statusForm, amount_paid: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Total Amount: {formatPrice(selectedInvoice.total_amount)}
                      </p>
                      {(() => {
                        const amountPaid = Number(statusForm.amount_paid);
                        const totalAmount = Number(selectedInvoice.total_amount);
                        const epsilon = 0.01;
                        const difference = totalAmount - amountPaid;

                        if (amountPaid > 0 && Math.abs(difference) > epsilon) {
                          return (
                            <p className="text-xs text-yellow-400 mt-1">
                              {amountPaid > totalAmount
                                ? '⚠️ Amount exceeds total'
                                : `Remaining: ${formatPrice(difference)}`}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Payment Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={statusForm.payment_reference}
                        onChange={(e) => setStatusForm({ ...statusForm, payment_reference: e.target.value })}
                        placeholder="Transaction ID, Receipt #, etc."
                        className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </>
                )}

                <div className="bg-primary-500/10 border border-primary-500/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">What happens when you update?</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {statusForm.status === 'paid' && (
                      <>
                        <li>• Invoice will be marked as Paid</li>
                        <li>• Linked booking payment status → Paid</li>
                        <li>• Booking status → Confirmed (if pending)</li>
                      </>
                    )}
                    {statusForm.status === 'partially_paid' && (
                      <>
                        <li>• Invoice will be marked as Partially Paid</li>
                        <li>• Amount paid will be tracked</li>
                        <li>• Booking remains pending until full payment</li>
                      </>
                    )}
                    {statusForm.status === 'cancelled' && (
                      <>
                        <li>• Invoice will be marked as Cancelled</li>
                        <li>• Linked booking → Cancelled</li>
                        <li>• Booking payment status → Failed</li>
                      </>
                    )}
                    {statusForm.status === 'completed' && (
                      <li>• Invoice marked as Completed (awaiting payment)</li>
                    )}
                    {statusForm.status === 'pending' && (
                      <li>• Invoice remains Pending</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusModal(false);
                      setStatusForm({ status: '', payment_method: '', amount_paid: 0, payment_reference: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
