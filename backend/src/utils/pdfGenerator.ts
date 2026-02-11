/**
 * PDF Receipt Generator
 * Purpose: Generate PDF consent receipts for data principals
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.3
 */

import PDFDocument from 'pdfkit';
import { ConsentReceipt } from './consentReceipt';

/**
 * Generate PDF consent receipt
 * Returns a readable stream that can be piped to response
 */
export function generateReceiptPDF(receipt: ConsentReceipt): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Consent Receipt ${receipt.receiptId}`,
      Author: receipt.dataController.name,
      Subject: 'Consent Receipt - DPDP Act 2023',
      Keywords: 'consent, receipt, DPDP, privacy',
    },
  });

  // Header
  doc
    .fontSize(20)
    .fillColor('#2C3E50')
    .text('CONSENT RECEIPT', { align: 'center' })
    .moveDown(0.5);

  // Subheader
  doc
    .fontSize(10)
    .fillColor('#7F8C8D')
    .text('ISO/IEC 29184:2020 Compliant | DPDP Act 2023 (India)', { align: 'center' })
    .moveDown(1);

  // Horizontal line
  doc
    .strokeColor('#BDC3C7')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  // Receipt metadata
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Receipt Information', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text(`Receipt ID: ${receipt.receiptId}`, { indent: 20 })
    .text(`Consent ID: ${receipt.consentId}`, { indent: 20 })
    .text(`Issue Date: ${new Date(receipt.consentTimestamp).toLocaleString('en-IN')}`, { indent: 20 })
    .text(`Jurisdiction: ${receipt.jurisdiction}`, { indent: 20 })
    .moveDown(1);

  // Data Principal section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Data Principal', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text(`User ID: ${receipt.dataSubject.userId}`, { indent: 20 })
    .moveDown(1);

  // Data Fiduciary section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Data Fiduciary', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text(`Name: ${receipt.dataController.name}`, { indent: 20 })
    .text(`Contact: ${receipt.dataController.contact}`, { indent: 20 })
    .text(`Address: ${receipt.dataController.address}`, { indent: 20 })
    .moveDown(1);

  // Consent details section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Consent Details', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text(`Purpose: ${receipt.purposes.map(p => p.purpose).join(', ')}`, { indent: 20 })
    .text(`Data Categories: ${receipt.dataCategories.join(', ')}`, { indent: 20 })
    .text(`Status: ${receipt.status}`, { indent: 20 })
    .moveDown(0.5)
    .text(`Valid From: ${new Date(receipt.validityPeriod.from).toLocaleString('en-IN')}`, { indent: 20 })
    .text(`Valid Until: ${new Date(receipt.validityPeriod.until).toLocaleString('en-IN')}`, { indent: 20 })
    .moveDown(1);

  // Notice information section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Notice Information', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text(`Notice ID: ${receipt.notice.noticeId}`, { indent: 20 })
    .text(`Notice Version: ${receipt.notice.noticeVersion}`, { indent: 20 })
    .text(`Language: ${receipt.notice.language}`, { indent: 20 })
    .text(`Shown At: ${new Date(receipt.notice.noticeShownAt).toLocaleString('en-IN')}`, { indent: 20 })
    .moveDown(1);

  // Withdrawal section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('How to Withdraw Consent', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#34495E')
    .text('You can withdraw this consent at any time by:', { indent: 20 })
    .moveDown(0.3)
    .text(`• Method: ${receipt.withdrawal.method}`, { indent: 30 })
    .text(`• Endpoint: ${receipt.withdrawal.endpoint}`, { indent: 30 })
    .moveDown(1);

  // Compliance section
  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Compliance Framework', { underline: true })
    .moveDown(0.5);

  receipt.complianceFramework.forEach(framework => {
    doc
      .fontSize(10)
      .fillColor('#34495E')
      .text(`• ${framework}`, { indent: 20 });
  });
  doc.moveDown(1);

  // Cryptographic proof section (highlighted box)
  const proofBoxY = doc.y;
  doc
    .rect(50, proofBoxY, 495, 70)
    .fillAndStroke('#ECF0F1', '#BDC3C7');

  doc
    .fontSize(12)
    .fillColor('#2C3E50')
    .text('Cryptographic Proof', 60, proofBoxY + 10, { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor('#34495E')
    .text(`Method: ${receipt.proof.method}`, 60, doc.y)
    .text(`Hash: ${receipt.proof.value}`, 60, doc.y, { width: 475 });

  doc.moveDown(2);

  // Footer disclaimer
  doc
    .fontSize(8)
    .fillColor('#7F8C8D')
    .text(
      'This is a machine-generated receipt. It serves as proof that consent was given on the terms specified above. ' +
      'This document is compliant with ISO/IEC 29184:2020 and the Digital Personal Data Protection Act, 2023 (India).',
      50,
      doc.page.height - 80,
      {
        width: 495,
        align: 'justify',
      }
    );

  // Add page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor('#95A5A6')
      .text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  // Finalize the PDF
  doc.end();

  return doc;
}
