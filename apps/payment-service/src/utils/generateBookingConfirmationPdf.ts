import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import renderBookingPdfStream from "../templates/BookingConfirmationPdfComponent";
import { prisma } from "@repo/database";

export const generateAndStoreBookingPdf = async (
  booking: any
): Promise<string> => {
  // 1. Render your custom booking PDF to buffer
  const stream = await renderBookingPdfStream(booking);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  const customPdfBuffer = Buffer.concat(chunks);

  // 2. Optionally re-load and save with pdf-lib for consistency (optional)
  const finalPdfDoc = await PDFDocument.create();
  const customDoc = await PDFDocument.load(customPdfBuffer);
  const customPages = await finalPdfDoc.copyPages(
    customDoc,
    customDoc.getPageIndices()
  );
  customPages.forEach((page) => finalPdfDoc.addPage(page));

  const mergedPdfBuffer = await finalPdfDoc.save();

  // 3. Save final PDF locally
  const uploadDir = path.resolve(
    __dirname,
    "../../uploads/booking-confirmations"
  );
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `booking-${booking.id}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, mergedPdfBuffer);

  // 4. Save path to DB
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      confirmationPdfPath: `http://localhost:8081/payment-service/uploads/booking-confirmations/${fileName}`,
    },
  });

  return filePath;
};
