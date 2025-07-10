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
            Invoice #: {booking.id.slice(0, 8).toUpperCase()}
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
        <InfoRow label="Name" value={booking.guestName || "N/A"} />
        <InfoRow label="Email" value={booking.guestEmail || "N/A"} />
        <InfoRow label="Mobile" value={booking.guestMobile || "N/A"} />
        <InfoRow label="Nationality" value={booking.guestNationality || "N/A"} />
        <InfoRow label="Status" value={booking.status} />
        <InfoRow
          label="Booked On"
          value={new Date(booking.createdAt).toLocaleString()}
        />
        {booking.remarks && (
          <InfoRow label="Remarks" value={booking.remarks} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Service Details</Text>
        <InfoRow label="Service Type" value={booking.serviceType} />
        <InfoRow label="Service ID" value={booking.serviceId} />
        
        {/* Render service data based on service type */}
        {booking.serviceType === "Package" && booking.serviceData && (
          <ServiceDataRenderer serviceData={booking.serviceData} serviceType="Package" />
        )}
        {booking.serviceType === "Tour" && booking.serviceData && (
          <ServiceDataRenderer serviceData={booking.serviceData} serviceType="Tour" />
        )}
        {booking.serviceType === "Hotel" && booking.serviceData && (
          <ServiceDataRenderer serviceData={booking.serviceData} serviceType="Hotel" />
        )}
        {booking.serviceType === "Activity" && booking.serviceData && (
          <ServiceDataRenderer serviceData={booking.serviceData} serviceType="Activity" />
        )}
        {booking.serviceType === "Transport" && booking.serviceData && (
          <ServiceDataRenderer serviceData={booking.serviceData} serviceType="Transport" />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Payment Information</Text>
        {booking.payments && booking.payments.length > 0 ? (
          booking.payments.map((payment: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <InfoRow label="Provider" value={payment.provider} />
              <InfoRow label="Method" value={payment.method} />
              <InfoRow
                label="Amount"
                value={`${payment.currency.toUpperCase()} ${(payment.amount / 100).toFixed(2)}`}
              />
              <InfoRow label="Status" value={payment.status} />
              {payment.cardBrand && payment.cardLast4 && (
                <InfoRow
                  label="Card"
                  value={`${payment.cardBrand} **** ${payment.cardLast4}`}
                />
              )}
              <InfoRow
                label="Payment Date"
                value={new Date(payment.createdAt).toLocaleString()}
              />
              {payment.providerRefId && (
                <InfoRow label="Reference ID" value={payment.providerRefId} />
              )}
              {payment.receiptUrl && (
                <InfoRow label="Receipt URL" value={payment.receiptUrl} />
              )}
              {payment.failureCode && (
                <InfoRow label="Failure Code" value={payment.failureCode} />
              )}
              {payment.failureMessage && (
                <InfoRow label="Failure Message" value={payment.failureMessage} />
              )}
              {payment.refunded && (
                <InfoRow label="Refunded" value={payment.refunded ? "Yes" : "No"} />
              )}
            </View>
          ))
        ) : (
          <InfoRow label="Payment Status" value="No payments found" />
        )}
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

// Component to render service data based on service type
const ServiceDataRenderer = ({ serviceData, serviceType }: { serviceData: any; serviceType: string }) => {
  // Common fields that might exist in serviceData
  const commonFields = [
    { key: 'name', label: 'Name' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'location', label: 'Location' },
    { key: 'duration', label: 'Duration' },
    { key: 'travelers', label: 'Travelers' },
    { key: 'guests', label: 'Guests' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'price', label: 'Price' },
    { key: 'totalPrice', label: 'Total Price' },
    { key: 'roomType', label: 'Room Type' },
    { key: 'vehicleType', label: 'Vehicle Type' },
    { key: 'pickupLocation', label: 'Pickup Location' },
    { key: 'dropoffLocation', label: 'Dropoff Location' },
  ];

  return (
    <View>
      {commonFields.map(({ key, label }) => {
        if (serviceData[key] !== undefined && serviceData[key] !== null) {
          let value = serviceData[key];
          
          // Format dates
          if (key.includes('Date') || key.includes('checkIn') || key.includes('checkOut')) {
            try {
              value = new Date(value).toLocaleDateString();
            } catch (e) {
              // Keep original value if date parsing fails
            }
          }
          
          // Format duration
          if (key === 'duration' && typeof value === 'number') {
            value = `${value} days`;
          }
          
          // Format price fields
          if (key.includes('price') || key.includes('Price')) {
            if (typeof value === 'number') {
              value = `₹${value.toFixed(2)}`;
            }
          }
          
          return (
            <InfoRow key={key} label={label} value={String(value)} />
          );
        }
        return null;
      })}
      
      {/* Handle nested objects or arrays in serviceData */}
      {Object.entries(serviceData).map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !commonFields.find(f => f.key === key)) {
          return (
            <InfoRow 
              key={key} 
              label={key.charAt(0).toUpperCase() + key.slice(1)} 
              value={JSON.stringify(value)} 
            />
          );
        }
        return null;
      })}
    </View>
  );
};

export default async (booking: any) => {
  return await renderToStream(
    <BookingConfirmationPdfComponent booking={booking} />
  );
};