'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Sidebar } from './sidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function ConditionalLayout({ children, sidebar }: ConditionalLayoutProps) {
  const { user, isLoading } = useUser();

  // While loading, show minimal layout (no sidebar flash)
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Not logged in - full width, no sidebar
  if (!user) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  // Logged in - show sidebar
  return (
    <div className="flex min-h-screen w-full">
      {sidebar}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
