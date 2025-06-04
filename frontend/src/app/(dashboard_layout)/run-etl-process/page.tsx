"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useEffect } from 'react';

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export default function RunEtlProcessPage() {
  const { user, getCompanyName, token } = useAuth();
  const companyCode = user?.company_code;
  const companyName = companyCode ? getCompanyName(companyCode) : "N/A";
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [fromMonth, setFromMonth] = useState<string>("6");
  const [toMonth, setToMonth] = useState<string>("6");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fromYear = formData.get("fromYear") as string;
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
      company_id: String(companyCode), // Ensure company_id is a string
      from_month: parseInt(fromMonth, 10), // fromMonth from state
      from_year: parseInt(fromYear, 10),
      to_month: parseInt(toMonth, 10),     // toMonth from state
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
      const response = await fetch(`${apiBaseUrl}/process/trigger-etl`, { // Changed endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(etlParams),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorDetail = responseData.detail || responseData.message || 'Failed to run ETL process';
        const err = new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
        (err as any).cause = responseData; // Attach full responseData for better context in catch block
        throw err;
      }
      
      setMessage(responseData.message || 'ETL process started successfully!');
      console.log('ETL Process started:', responseData);
    } catch (error: any) {
      console.error('Error running ETL process:', error);
      let detailedErrorMessage = error.message || 'An unexpected error occurred.';
      if (error.response && error.response.data && error.response.data.detail) {
        // Axios-like error structure
        detailedErrorMessage = JSON.stringify(error.response.data.detail);
      } else if (error.cause && typeof error.cause === 'object' && 'detail' in error.cause) {
        // Handling if error.cause contains the detail (e.g. from fetch response.json() failure)
        const cause = error.cause as any;
        if (Array.isArray(cause.detail)) {
          detailedErrorMessage = cause.detail.map((err: any) => `${err.loc ? err.loc.join(' -> ') + ': ' : ''}${err.msg} (type: ${err.type})`).join('\n');
        } else if (typeof cause.detail === 'string'){
          detailedErrorMessage = cause.detail;
        } else {
          detailedErrorMessage = JSON.stringify(cause.detail);
        }
      } else if (error.message && error.message.includes("Failed to run ETL process") && error.message.includes("{")){
        // Attempt to parse if the message itself contains JSON string from responseData.detail
        try {
            const potentialJson = error.message.substring(error.message.indexOf("{"));
            const parsedDetail = JSON.parse(potentialJson);
            if (Array.isArray(parsedDetail)) {
              detailedErrorMessage = parsedDetail.map((err: any) => `${err.loc ? err.loc.join(' -> ') + ': ' : ''}${err.msg} (type: ${err.type})`).join('\n');
            } else {
                detailedErrorMessage = JSON.stringify(parsedDetail);
            }
        } catch (parseError) {
            // Keep original if parsing fails
        }
      }
      setMessage(detailedErrorMessage);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full max-w-3xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Run ETL Process
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
        Configure and initiate the ETL process for your purchase order data.
        </p>
      </div>
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyNameDisplay" className="text-base">Company</Label>
              {companyCode ? (
                <Input id="companyNameDisplay" value={companyName || "Company information not available"} readOnly className="bg-secondary/30 dark:bg-secondary/50 h-11 text-base" />
              ) : (
                <Input id="companyNameDisplay" value="Company information not available. Please log in." readOnly className="h-11 text-base" />
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Date Range Filter</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromMonth" className="text-base">From Month</Label>
                  <Select name="fromMonth" defaultValue={fromMonth} onValueChange={setFromMonth}>
                    <SelectTrigger id="fromMonth" className="h-11 text-base">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={`from-${option.value}`} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromYear" className="text-base">From Year</Label>
                  <Input id="fromYear" name="fromYear" type="number" defaultValue="2025" placeholder="YYYY" className="h-11 text-base" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="toMonth" className="text-base">To Month</Label>
                  <Select name="toMonth" defaultValue={toMonth} onValueChange={setToMonth}>
                    <SelectTrigger id="toMonth" className="h-11 text-base">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={`to-${option.value}`} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toYear" className="text-base">To Year</Label>
                  <Input id="toYear" name="toYear" type="number" defaultValue="2025" placeholder="YYYY" className="h-11 text-base" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Item Code Filter</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromItemCode" className="text-base">From Item Code</Label>
                  <Input id="fromItemCode" name="fromItemCode" defaultValue="0" placeholder="Start Item Code" className="h-11 text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toItemCode" className="text-base">To Item Code</Label>
                  <Input id="toItemCode" name="toItemCode" defaultValue="ZZZZZZZZ" placeholder="End Item Code" className="h-11 text-base" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto h-12 px-8 text-base" disabled={isLoading}>
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
