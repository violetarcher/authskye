export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override the root layout's sidebar by rendering children directly
  // This creates a full-page layout without the navigation
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {children}
    </div>
  );
}
