import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduManage — Multi-School Management System",
  description: "A comprehensive school management platform for managing multiple schools, students, attendance, results, fees and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
