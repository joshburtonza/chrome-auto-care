import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COMPANY_NAME = 'RACE TECHNIK';
const COMPANY_TAGLINE = 'Premium Motorsport Vehicle Protection';
const COMPANY_SUPPORT_EMAIL = 'support@racetechnik.co.za';

interface InvoiceBooking {
  id: string;
  booking_date: string;
  booking_time?: string | null;
  status: string;
  payment_status?: string | null;
  payment_amount?: number | null;
  payment_date?: string | null;
  vehicles?: {
    year: string;
    make: string;
    model: string;
  } | null;
  services?: {
    title: string;
  } | null;
  all_services?: string[];
  total_price?: number;
}

interface InvoiceProfile {
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
}

export const generateBookingInvoice = (
  booking: InvoiceBooking,
  profile: InvoiceProfile,
  services: { title: string; price: number }[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [41, 37, 36]; // Dark charcoal
  const accentColor: [number, number, number] = [212, 175, 55]; // Gold
  const mutedColor: [number, number, number] = [120, 113, 108]; // Muted
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_TAGLINE, 20, 35);
  
  // Invoice title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${booking.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 35, { align: 'right' });
  
  // Invoice details section
  let yPos = 60;
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text('INVOICE DATE', 20, yPos);
  doc.text('BOOKING DATE', 80, yPos);
  doc.text('STATUS', 140, yPos);
  
  yPos += 6;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date().toLocaleDateString('en-ZA'), 20, yPos);
  doc.text(new Date(booking.booking_date).toLocaleDateString('en-ZA'), 80, yPos);
  
  // Status badge
  const statusText = booking.status.replace('_', ' ').toUpperCase();
  doc.text(statusText, 140, yPos);
  
  // Customer details
  yPos += 20;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('BILL TO', 20, yPos + 3);
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.full_name || 'Customer', 20, yPos + 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (profile.phone) {
    doc.text(profile.phone, 20, yPos + 20);
  }
  if (profile.address) {
    doc.text(profile.address, 20, yPos + 27);
  }
  
  // Vehicle details
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text('VEHICLE', pageWidth / 2, yPos + 3);
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  if (booking.vehicles) {
    doc.text(
      `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`,
      pageWidth / 2,
      yPos + 12
    );
  }
  
  // Services table
  yPos += 50;
  
  const tableData = services.map((service, index) => [
    (index + 1).toString(),
    service.title,
    `R ${service.price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Service Description', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: primaryColor,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // Totals section
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  
  yPos = finalY + 10;
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 100, yPos, pageWidth - 15, yPos);
  
  yPos += 10;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.text('Subtotal:', pageWidth - 100, yPos);
  doc.setTextColor(...primaryColor);
  doc.text(`R ${totalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setTextColor(...mutedColor);
  doc.text('VAT (15%):', pageWidth - 100, yPos);
  const vat = totalPrice * 0.15;
  doc.setTextColor(...primaryColor);
  doc.text(`R ${vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 12;
  doc.setFillColor(...accentColor);
  doc.roundedRect(pageWidth - 105, yPos - 6, 90, 16, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 100, yPos + 4);
  const grandTotal = totalPrice + vat;
  doc.text(`R ${grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Payment status
  yPos += 25;
  if (booking.payment_status === 'paid') {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(15, yPos, 50, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', 40, yPos + 8, { align: 'center' });
    
    if (booking.payment_date) {
      doc.setTextColor(...mutedColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment received: ${new Date(booking.payment_date).toLocaleDateString('en-ZA')}`, 70, yPos + 8);
    }
  } else {
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(15, yPos, 70, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT PENDING', 50, yPos + 8, { align: 'center' });
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Thank you for choosing ${COMPANY_NAME} for your vehicle protection needs.`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`For queries, please contact us at ${COMPANY_SUPPORT_EMAIL}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  const fileName = `RaceTechnik_Invoice_${booking.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
};
