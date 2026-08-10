// src/app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AuthWrapper } from "@/components/auth-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";
import { ConditionalLayout } from "@/components/conditional-layout";
import './globals.css';

export const metadata = {
  title: 'Sportsbook',
  description: 'Your edge. Every game.',
};

export const viewport = {
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <AuthWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <ConditionalLayout sidebar={<Sidebar />}>
                {children}
              </ConditionalLayout>
              <Toaster position="top-right" />
            </ThemeProvider>
          </AuthWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
