// src/app/(dashboard_layout)/layout.tsx
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added usePathname
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils"; // For conditional classes
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import {
  LayoutDashboard,
  PlayCircle,
  Database,
  Layers,
  UserCircle,
  LogOutIcon,
  MenuIcon,
} from 'lucide-react';

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
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // For active link highlighting

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return null; // Redirect should handle it
  }

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    router.push('/login');
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/run-etl-process", label: "Run ETL Process", icon: PlayCircle },
    { href: "/po-data", label: "View PO Data", icon: Database },
    { href: "/layers", label: "Explore Layers", icon: Layers },
  ];

  const profileNavItem = { href: "/profile", label: "Profile", icon: UserCircle };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar for larger screens */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <span>PO Classifier</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <ul className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname === item.href && "bg-muted text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto p-4 border-t">
          <Link
            href={profileNavItem.href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary mb-2",
                pathname === profileNavItem.href && "bg-muted text-primary"
            )}
          >
            <profileNavItem.icon className="h-4 w-4" />
            {profileNavItem.label}
          </Link>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary">
            <LogOutIcon className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header for mobile and main content header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="md:hidden">
                <MenuIcon className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="md:hidden w-64 p-0 bg-card">
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                  <span>PO Classifier</span>
                </Link>
              </div>
              <nav className="grid gap-2 text-base font-medium p-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                      pathname === item.href && "bg-muted text-foreground font-semibold"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto p-4 border-t">
                <Link
                    href={profileNavItem.href}
                    className={cn(
                        "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground mb-2",
                        pathname === profileNavItem.href && "bg-muted text-foreground font-semibold"
                    )}
                >
                    <profileNavItem.icon className="h-5 w-5" />
                    {profileNavItem.label}
                </Link>
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary">
                  <LogOutIcon className="mr-2 h-5 w-5" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>


        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/40">
          {children}
        </main>

        {/* Optional Footer can be added back if desired */}
        {/* <footer className="bg-background border-t p-4 text-center text-xs text-muted-foreground mt-auto">
          <p>&copy; {new Date().getFullYear()} AI PO Classification System. All rights reserved.</p>
        </footer> */}
      </div>
    </div>
  );
}
