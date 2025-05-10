// src/app/(dashboard_layout)/layout.tsx
import React from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Placeholder for a potential shared header or sidebar for dashboard pages */}
            {/* <header className="bg-gray-100 dark:bg-gray-800 p-4 shadow">
        <p className="font-semibold">Dashboard Area Header</p>
      </header> */}

            <main className="flex-grow p-6">
                {/* 
          A common structure might involve a sidebar and main content area:
          <div className="flex">
            <aside className="w-64 p-4 border-r">
              <p>Sidebar Navigation</p>
              <ul>
                <li><a href="/po-data">PO Data</a></li>
                <li><a href="/layers">Layers View</a></li>
              </ul>
            </aside>
            <div className="flex-grow p-6">
              {children}
            </div>
          </div>
          For now, just rendering children directly with padding.
        */}
                {children}
            </main>

            {/* Placeholder for a potential shared footer */}
            {/* <footer className="bg-gray-100 dark:bg-gray-800 p-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} AI PO Classification System</p>
      </footer> */}
        </div>
    );
}
