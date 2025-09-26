import { Varela_Round } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/admin/auth";

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Sabuho",
  description: "Master any subject through interactive quizzes and comprehensive learning tools",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body
        className={`${varelaRound.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}