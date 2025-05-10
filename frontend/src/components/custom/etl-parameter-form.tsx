"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { triggerEtlProcess } from "@/lib/api"; // Import the API function

// Define the schema for form validation using Zod
const etlFormSchema = z.object({
    company_id: z.string().min(1, "Company ID is required"),
    from_month: z.coerce.number().min(1).max(12, "Month must be between 1 and 12"),
    from_year: z.coerce.number().min(1900).max(2100, "Year must be between 1900 and 2100"),
    to_month: z.coerce.number().min(1).max(12, "Month must be between 1 and 12"),
    to_year: z.coerce.number().min(1900).max(2100, "Year must be between 1900 and 2100"),
    from_item_code: z.string().min(1, "From Item Code is required"),
    to_item_code: z.string().min(1, "To Item Code is required"),
}).refine(data => {
    // Basic validation: from_year <= to_year
    if (data.from_year > data.to_year) return false;
    // If years are the same, from_month <= to_month
    if (data.from_year === data.to_year && data.from_month > data.to_month) return false;
    return true;
}, {
    message: "From date must be earlier than or equal to To date",
    path: ["from_year"], // You can point to a specific field or make it a general form error
});

type EtlFormValues = z.infer<typeof etlFormSchema>;

export function EtlParameterForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const form = useForm<EtlFormValues>({
        resolver: zodResolver(etlFormSchema),
        defaultValues: {
            company_id: "",
            from_month: new Date().getMonth() + 1, // Default to current month
            from_year: new Date().getFullYear(),   // Default to current year
            to_month: new Date().getMonth() + 1,
            to_year: new Date().getFullYear(),
            from_item_code: "0", // Example default
            to_item_code: "ZZZZZZZZ", // Example default
        },
    });

    const onSubmit: SubmitHandler<EtlFormValues> = async (data) => {
        setIsLoading(true);
        setMessage(null);
        console.log("Submitting ETL parameters:", data);

        try {
            const result = await triggerEtlProcess(data); // Use the imported API function
            setMessage(`ETL process started successfully: ${result.message}`);
            // Optionally reset form or give other feedback
            // form.reset(); 
        } catch (error: any) {
            console.error("ETL trigger error:", error);
            setMessage(`Error: ${error.message || "An unknown error occurred"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 border rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="company_id">Company ID</Label>
                    <Input id="company_id" {...form.register("company_id")} />
                    {form.formState.errors.company_id && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.company_id.message}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <Label htmlFor="from_month">From Month</Label>
                    <Input id="from_month" type="number" {...form.register("from_month")} />
                    {form.formState.errors.from_month && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.from_month.message}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="from_year">From Year</Label>
                    <Input id="from_year" type="number" {...form.register("from_year")} />
                    {form.formState.errors.from_year && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.from_year.message}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="to_month">To Month</Label>
                    <Input id="to_month" type="number" {...form.register("to_month")} />
                    {form.formState.errors.to_month && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.to_month.message}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="to_year">To Year</Label>
                    <Input id="to_year" type="number" {...form.register("to_year")} />
                    {form.formState.errors.to_year && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.to_year.message}</p>
                    )}
                </div>
            </div>
            {form.formState.errors.from_year?.type === 'custom' || form.formState.errors.root?.serverError && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.from_year?.message}</p>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="from_item_code">From Item Code</Label>
                    <Input id="from_item_code" {...form.register("from_item_code")} />
                    {form.formState.errors.from_item_code && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.from_item_code.message}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="to_item_code">To Item Code</Label>
                    <Input id="to_item_code" {...form.register("to_item_code")} />
                    {form.formState.errors.to_item_code && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.to_item_code.message}</p>
                    )}
                </div>
            </div>

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Run ETL Process"}
            </Button>

            {message && (
                <p className={`mt-4 text-sm ${message.startsWith("Error:") ? "text-red-600" : "text-green-600"}`}>
                    {message}
                </p>
            )}
        </form>
    );
}
