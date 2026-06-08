import { jsPDF } from 'jspdf';
import { supabase } from './supabase';

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    // If it's a Supabase storage URL, get a signed URL first
    if (url.includes('supabase')) {
      const pathMatch = url.match(/public\/([^\/]+)\/(.+)$/);
      if (pathMatch) {
        const { data } = await supabase.storage
          .from(pathMatch[1])
          .createSignedUrl(pathMatch[2], 3600);

        if (data?.signedUrl) {
          url = data.signedUrl;
        }
      }
    }

    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

interface WaiverPdfData {
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  signature: string;
  signedAt: string;
  bookingNumber: string;
  gameName: string;
  bookingDate: string;
  templateTitle: string;
  templateContent: string;
  templateVersion: string;
}

export async function generateWaiverPDF(data: WaiverPdfData): Promise<Blob> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Fetch company settings
  let companyName = 'Escape Room';
  let companyLogoUrl = '';

  try {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['company_name', 'company_logo_url']);

    if (settings) {
      const nameSettings = settings.find((s: any) => s.setting_key === 'company_name');
      const logoSettings = settings.find((s: any) => s.setting_key === 'company_logo_url');

      if (nameSettings && (nameSettings as any).setting_value) companyName = String((nameSettings as any).setting_value);
      if (logoSettings && (logoSettings as any).setting_value) companyLogoUrl = String((logoSettings as any).setting_value);
    }
  } catch (error) {
    console.warn('Could not fetch company settings, using defaults');
  }

  // Header with company logo and name
  if (companyLogoUrl) {
    try {
      // Load and add logo
      const logoImage = await loadImageAsBase64(companyLogoUrl);
      if (logoImage) {
        const logoWidth = 30;
        const logoHeight = 30;
        const logoX = (pageWidth - logoWidth) / 2;

        doc.addImage(logoImage, 'PNG', logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 5;
      }
    } catch (error) {
      console.warn('Failed to load logo, continuing without it:', error);
    }
  }

  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Document title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.templateTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Version: ${data.templateVersion}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Booking Information Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const bookingInfo = [
    `Booking Number: ${data.bookingNumber}`,
    `Game: ${data.gameName}`,
    `Booking Date: ${new Date(data.bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`
  ];

  bookingInfo.forEach(line => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  yPosition += 8;

  // Participant Information Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Participant Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const participantInfo = [
    `Name: ${data.participantName}`,
    `Email: ${data.participantEmail}`,
    ...(data.participantPhone ? [`Phone: ${data.participantPhone}`] : []),
  ];

  participantInfo.forEach(line => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  yPosition += 8;

  // Emergency Contact Section
  if (data.emergencyContactName || data.emergencyContactPhone) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Emergency Contact', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const emergencyInfo = [
      ...(data.emergencyContactName ? [`Name: ${data.emergencyContactName}`] : []),
      ...(data.emergencyContactPhone ? [`Phone: ${data.emergencyContactPhone}`] : []),
    ];

    emergencyInfo.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 8;
  }

  // Waiver Content Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Waiver Terms and Conditions', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Split content into lines that fit within the page width
  const lines = doc.splitTextToSize(data.templateContent, contentWidth);

  lines.forEach((line: string) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }

    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 10;

  // Check if we need a new page for signature
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = margin;
  }

  // Signature Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Signature', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Signed by: ${data.signature}`, margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(data.signedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })}`, margin, yPosition);
  yPosition += 15;

  // Footer with timestamp and document ID
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Document generated on ${new Date().toLocaleString('en-US')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Return PDF as Blob
  return doc.output('blob');
}

export async function uploadWaiverPDF(
  waiverId: string,
  pdfBlob: Blob,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const filePath = `${waiverId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('waivers')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error uploading waiver PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload PDF'
    };
  }
}

export async function getWaiverPdfUrl(filePath: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from('waivers')
      .createSignedUrl(filePath, 3600); // URL valid for 1 hour

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error getting waiver PDF URL:', error);
    return null;
  }
}
