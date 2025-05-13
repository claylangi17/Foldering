// src/app/(dashboard_layout)/layout.tsx
"use client"; // Make this a Client Component to use hooks

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// A simple loading component for the dashboard layout
const DashboardLoadingSkeleton = () => (
  <div className="flex min-h-screen flex-col">
    <header className="bg-gray-100 dark:bg-gray-800 p-4 shadow">
      <Skeleton className="h-6 w-1/4" />
    </header>
    <main className="flex-grow p-6">
      <Skeleton className="h-10 w-1/2 mb-4" />
      <Skeleton className="h-64 w-full" />
    </main>
    <footer className="bg-gray-100 dark:bg-gray-800 p-4 text-center text-sm">
      <Skeleton className="h-4 w-1/3 mx-auto" />
    </footer>
  </div>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login'); // Redirect to login if not authenticated and not loading
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <DashboardLoadingSkeleton />; // Show loading skeleton while checking auth state
  }

  if (!isAuthenticated) {
    // This will briefly show before redirect or if redirect fails.
    // Or, can return null as redirect should handle it.
    return null;
  }

  // TODO: Add a proper sidebar and header for dashboard navigation
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Foldering AI Dashboard</h1>
          {user && (
            <div className='text-sm'>
              Logged in as: <strong>{user.username}</strong> (Role: {user.role})
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow p-6 bg-muted/40">
        {children}
      </main>

      <footer className="bg-background border-t p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AI PO Classification System. User: {user?.username || 'Guest'}</p>
      </footer>
    </div>
  );
}
