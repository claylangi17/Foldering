"use client";

import MiniDashboard from "@/components/custom/mini-dashboard";
import { EtlParameterForm } from "@/components/custom/etl-parameter-form"; // Changed to named import
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground">
                    Key metrics and quick access to data processing.
                </p>
            </div>
            <MiniDashboard />
            <Separator />
            <div>
                <h2 className="text-xl font-semibold tracking-tight mb-2">ETL Process</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Trigger the ETL process to update purchase order data from the source.
                </p>
                <EtlParameterForm />
            </div>
        </div>
    );
}
