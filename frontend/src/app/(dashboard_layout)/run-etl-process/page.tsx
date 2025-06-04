"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from 'react';
import { useAuth } from "@/context/AuthContext";

export default function RunEtlProcessPage() {
  const { user, getCompanyName, token } = useAuth();
  const companyCode = user?.company_code;
  const companyName = companyCode ? getCompanyName(companyCode) : "N/A";
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
        const formData = new FormData(event.currentTarget);
    const fromMonth = formData.get("fromMonth") as string;
    const fromYear = formData.get("fromYear") as string;
    const toMonth = formData.get("toMonth") as string;
    const toYear = formData.get("toYear") as string;
    const fromItemCode = formData.get("fromItemCode") as string;
    const toItemCode = formData.get("toItemCode") as string;

    if (!companyCode) {
      console.error("Company code is not available. User might not be logged in or associated with a company.");
      // TODO: Show error to user
      return;
    }
    if (!token) {
      console.error("Authentication token not found.");
      // TODO: Show error to user or redirect to login
      return;
    }

    const etlParams = {
      company_code: companyCode,
      from_month: parseInt(fromMonth, 10),
      from_year: parseInt(fromYear, 10),
      to_month: parseInt(toMonth, 10),
      to_year: parseInt(toYear, 10),
      from_item_code: fromItemCode,
      to_item_code: toItemCode,
    };

        setIsLoading(true);
    setMessage(null);
    setIsError(false);

    console.log("Running ETL Process with parameters:", etlParams);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiBaseUrl) {
        throw new Error("API base URL is not configured.");
      }
      const response = await fetch(`${apiBaseUrl}/etl/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(etlParams),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || 'Failed to run ETL process');
      }
      
      setMessage(responseData.message || 'ETL process started successfully!');
      console.log('ETL Process started:', responseData);
    } catch (error: any) {
      console.error('Error running ETL process:', error);
      setMessage(error.message || 'An unexpected error occurred.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight">AI Purchase Order Classification</h1>
        <p className="text-muted-foreground">
          Streamline your procurement data with intelligent classification and insights.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto md:mx-0">
        <CardHeader>
          <CardTitle>Run ETL Process</CardTitle>
          <CardDescription>
            Configure and initiate the ETL process for your purchase order data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyNameDisplay">Company</Label>
              {companyCode ? (
                <p id="companyNameDisplay" className="text-sm font-medium p-2 border rounded-md bg-secondary/30 dark:bg-secondary/50">
                  {companyName} (Code: {companyCode})
                </p>
              ) : (
                <p id="companyNameDisplay" className="text-sm text-muted-foreground p-2 border rounded-md">
                  Company information not available. Please log in.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromMonth">From Month</Label>
                <Input id="fromMonth" name="fromMonth" type="number" defaultValue="6" placeholder="MM" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromYear">From Year</Label>
                <Input id="fromYear" name="fromYear" type="number" defaultValue="2025" placeholder="YYYY" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="toMonth">To Month</Label>
                <Input id="toMonth" name="toMonth" type="number" defaultValue="6" placeholder="MM" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toYear">To Year</Label>
                <Input id="toYear" name="toYear" type="number" defaultValue="2025" placeholder="YYYY" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromItemCode">From Item Code</Label>
                <Input id="fromItemCode" name="fromItemCode" defaultValue="0" placeholder="Start Item Code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toItemCode">To Item Code</Label>
                <Input id="toItemCode" name="toItemCode" defaultValue="ZZZZZZZZ" placeholder="End Item Code" />
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? 'Running ETL...' : 'Run ETL Process'}
            </Button>
          </form>
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${isError ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
              {message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
