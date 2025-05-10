"use client"; // Required for form interactions

import Link from "next/link";
import { EtlParameterForm } from "@/components/custom/etl-parameter-form";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-12 lg:p-24 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-4xl space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            AI Purchase Order Classification
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Streamline your procurement data with intelligent classification and insights.
          </p>
        </header>

        <section className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 dark:text-gray-100">
            Run ETL Process
          </h2>
          <EtlParameterForm />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/po-data"
            className="group block rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg"
          >
            <h3 className="mb-2 text-xl font-semibold text-blue-700 dark:text-blue-400">
              View PO Data &rarr;
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 opacity-90">
              Browse, search, and manage classified Purchase Orders.
            </p>
          </Link>

          <Link
            href="/layers"
            className="group block rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg"
          >
            <h3 className="mb-2 text-xl font-semibold text-green-700 dark:text-green-400">
              Explore Layers &rarr;
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 opacity-90">
              Navigate through hierarchical item classifications.
            </p>
          </Link>
        </section>

        {/* Placeholder for a potential link to a dedicated dashboard summary page */}
        {/* 
        <section className="mt-8 text-center">
          <Link
            href="/dashboard-summary" 
            className="group block rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg"
          >
            <h3 className="mb-2 text-xl font-semibold text-purple-700 dark:text-purple-400">
              View Dashboard Summary &rarr;
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 opacity-90">
              Get quick insights and statistics from your PO data.
            </p>
          </Link>
        </section> 
        */}
      </div>
    </main>
  );
}
