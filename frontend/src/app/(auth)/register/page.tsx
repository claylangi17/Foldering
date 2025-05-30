"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { registerUser, FrontendUserCreateData, fetchCompanies, Company } from '@/lib/api'; // Import registerUser and its data type

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyCode, setCompanyCode] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const router = useRouter();
    
    // Fetch companies on page load
    useEffect(() => {
        const getCompanies = async () => {
            try {
                const companyData = await fetchCompanies();
                setCompanies(companyData);
            } catch (err) {
                console.error("Error fetching companies:", err);
                setError("Failed to load companies. Please try again later.");
            } finally {
                setLoadingCompanies(false);
            }
        };
        
        getCompanies();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);

        try {
            const userData: FrontendUserCreateData = {
                username,
                email: email || null, // Send null if empty, as schema allows Optional
                full_name: fullName || null, // Send null if empty
                company_code: companyCode, // Send the selected company code
                password
            };
            const response = await registerUser(userData);
            console.log("Registration successful", response);
            // TODO: Optionally auto-login or redirect to login page
            // For now, redirect to login page after successful registration
            alert("Registration successful! Please login.");
            router.push('/login');
        } catch (err: any) {
            setError(err.message || "Failed to register. Please try again.");
            console.error("Registration error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl">Create an Account</CardTitle>
                    <CardDescription>
                        Enter your details to register.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="yourusername"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Full Name (Optional)</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Your Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="company">Company (Required)</Label>
                            <Select 
                                onValueChange={(value) => setCompanyCode(Number(value))}
                                disabled={loading || loadingCompanies}
                                required
                            >
                                <SelectTrigger id="company">
                                    <SelectValue placeholder="Select your company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingCompanies ? (
                                        <SelectItem value="loading" disabled>Loading companies...</SelectItem>
                                    ) : (
                                        companies.map((company) => (
                                            <SelectItem key={company.company_code} value={company.company_code.toString()}>
                                                {company.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="********"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Registering..." : "Create Account"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-sm">
                    <p>
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Login
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
