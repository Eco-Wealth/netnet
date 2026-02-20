import "./globals.css";
import Shell from "@/components/Shell";

export const metadata = {
  title: "netnet cockpit",
  description: "Mobile cockpit for Netnet agent operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
