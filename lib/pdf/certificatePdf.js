import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function generateCertificatePDF(certificate, student, test) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  // Certificate border
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(3);
  doc.rect(10, 10, 277, 190);

  // Inner border
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(1);
  doc.rect(15, 15, 267, 180);

  // Header
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("GYANSAGAR TEST SYSTEM", 148.5, 35, { align: "center" });

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Gyansagar coaching classes, Jalsu", 148.5, 45, { align: "center" });

  // Certificate title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 65, { align: "center" });

  // Presented to
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("This certificate is proudly presented to", 148.5, 80, { align: "center" });

  // Student name
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text(student.name.toUpperCase(), 148.5, 100, { align: "center" });

  // For successfully completing
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("for successfully completing", 148.5, 115, { align: "center" });

  // Test name
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(test.title.toUpperCase(), 148.5, 130, { align: "center" });

  // Score and rank
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`Score: ${certificate.percentage}% | Rank: ${certificate.rank || "N/A"}`, 148.5, 145, { align: "center" });

  // Date
  const date = new Date(certificate.issuedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  doc.text(`Date: ${date}`, 148.5, 155, { align: "center" });

  // Certificate ID
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Certificate ID: ${certificate.certificateId}`, 148.5, 165, { align: "center" });

  // Generate QR Code
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-certificate?certificateId=${certificate.certificateId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 80,
    margin: 1
  });

  // Add QR code to bottom right
  doc.addImage(qrCodeDataUrl, "PNG", 220, 160, 40, 40);

  // Signature area
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Kalyan Singh Yadav", 45, 175, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Director", 45, 180, { align: "center" });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(25, 170, 65, 170);

  return doc;
}
