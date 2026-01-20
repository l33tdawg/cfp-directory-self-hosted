import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SkipLink } from "@/components/ui/skip-link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CFP Directory - Self-Hosted",
    template: "%s | CFP Directory",
  },
  description: "Self-hosted Call for Papers platform for managing conference submissions",
  keywords: ["CFP", "call for papers", "conference", "submissions", "speakers"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen`}
      >
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster 
              richColors 
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "group border-border shadow-lg",
                  title: "text-foreground font-semibold",
                  description: "text-muted-foreground",
                  actionButton: "bg-primary text-primary-foreground",
                  cancelButton: "bg-muted text-muted-foreground",
                  success: "border-green-200 dark:border-green-800",
                  error: "border-red-200 dark:border-red-800",
                  warning: "border-amber-200 dark:border-amber-800",
                  info: "border-blue-200 dark:border-blue-800",
                },
              }}
              expand
              closeButton
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
