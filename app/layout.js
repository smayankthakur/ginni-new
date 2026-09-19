import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Ginni Ki Baatein | The Divine Tarot",
  description: "A private tarot counsel from The Divine Tarot — refined Hinglish readings for clarity and strategic foresight.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Cinzel:wght@500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="stars" />
        <div className="aurora" />
        {children}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
