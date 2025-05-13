"use client";

import { useEffect, useState } from 'react';
import { fetchMiniDashboardData, MiniDashboardData as DashboardData } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, Layers, ListTree } from 'lucide-react'; // Icons

const MiniDashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            const loadDashboardData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const dashboardData = await fetchMiniDashboardData(token);
                    setData(dashboardData);
                } catch (err) {
                    setError((err as Error).message || "Failed to load dashboard data.");
                    console.error("Error fetching dashboard data:", err);
                } finally {
                    setIsLoading(false);
                }
            };
            loadDashboardData();
        } else {
            setIsLoading(false);
            // setError("Authentication token not found. Please login."); // Or handle silently
        }
    }, [token]);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-6 w-6" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2 mb-1" />
                            <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return <p className="text-red-500 text-center">Error loading dashboard: {error}</p>;
    }

    if (!data) {
        return <p className="text-center text-muted-foreground">No dashboard data available.</p>;
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    }

    const formatCurrency = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.total_purchase_orders)}</div>
                    <p className="text-xs text-muted-foreground">Total POs recorded</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Order Amount (IDR)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.total_order_amount_idr)}</div>
                    <p className="text-xs text-muted-foreground">Sum of all order amounts</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">L1 Categories</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.total_l1_categories)}</div>
                    <p className="text-xs text-muted-foreground">Unique general categories</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">L2 Categories (Items)</CardTitle>
                    <ListTree className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.total_l2_categories)}</div>
                    <p className="text-xs text-muted-foreground">Unique specific item types</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default MiniDashboard;
