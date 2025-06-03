import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  renderToStream,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

Font.register({
  family: "Lato-Regular",
  src: path.resolve(__dirname, "./assets/Lato-Regular.ttf"),
});

Font.register({
  family: "Lato-Bold",
  src: path.resolve(__dirname, "./assets/Lato-Bold.ttf"),
});

const logoPath = path.resolve(__dirname, "./assets/logo.png");
const logoBase64 = fs.readFileSync(logoPath).toString("base64");
const logoUri = `data:image/png;base64,${logoBase64}`;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Lato-Regular",
    fontSize: 12,
    color: "#2f3640",
  },
  header: {
    borderBottom: "2 solid #dcdde1",
    marginBottom: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    height: 40,
  },
  section: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 14,
    fontFamily: "Lato-Bold",
    color: "#0a3d62",
    marginBottom: 8,
    textTransform: "uppercase",
    borderBottom: "1 solid #dcdde1",
    paddingBottom: 4,
  },
  headingText: {
    fontSize: 16,
    fontFamily: "Lato-Bold",
    marginBottom: 4,
    color: "#1e272e",
  },
  metaText: {
    fontSize: 10,
    fontFamily: "Lato-Regular",
    color: "#636e72",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontFamily: "Lato-Bold",
    color: "#353b48",
  },
  value: {
    flex: 1,
    fontFamily: "Lato-Regular",
    color: "#2f3640",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: "#999",
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
});

type Props = {
  booking: any;
};

export const BookingConfirmationPdfComponent = ({ booking }: Props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image style={styles.logo} src={logoUri} />
        <View>
          <Text style={styles.headingText}>Booking Confirmation</Text>
          <Text style={styles.metaText}>
            Invoice #:{" "}
            {booking.invoiceNumber || booking.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.metaText}>GSTR No: 07ABCDE1234F1Z5</Text>
          <Text style={styles.metaText}>
            Invoice Date: {new Date(booking.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Guest Information</Text>
        <InfoRow label="Booking ID" value={booking.id} />
        <InfoRow label="Name" value={booking.guestName} />
        <InfoRow label="Email" value={booking.guestEmail} />
        <InfoRow label="Mobile" value={booking.guestMobile} />
        <InfoRow label="Nationality" value={booking.guestNationality} />
        <InfoRow label="Status" value={booking.status} />
        <InfoRow
          label="Booked On"
          value={new Date(booking.createdAt).toLocaleString()}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Package Details</Text>
        {booking.items.map((item: any, i: number) => (
          <View key={i}>
            <InfoRow label="Package" value={item.package?.name || "N/A"} />
            <InfoRow label="Travelers" value={String(item.travelers)} />
            <InfoRow
              label="Travel Date"
              value={new Date(item.startDate).toLocaleDateString()}
            />
            <InfoRow label="Location" value={item.package?.location || "N/A"} />
            <InfoRow
              label="Duration"
              value={`${item.package?.duration || 0} days`}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Payment Information</Text>
        {booking.payments.map((p: any, i: any) => (
          <View key={i}>
            <InfoRow label="Provider" value={p.provider} />
            <InfoRow
              label="Amount"
              value={`${p.currency.toUpperCase()} ${(p.amount / 100).toFixed(2)}`}
            />
            <InfoRow
              label="Card"
              value={`${p.cardBrand} **** ${p.cardLast4}`}
            />
            <InfoRow
              label="Date"
              value={new Date(p.createdAt).toLocaleString()}
            />
            <InfoRow label="Status" value={p.status} />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>
          This is a system-generated document. For help, email
          support@royaldusk.com
        </Text>
      </View>
    </Page>
  </Document>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export default async (booking: any) => {
  return await renderToStream(
    <BookingConfirmationPdfComponent booking={booking} />
  );
};
