"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserCompany } from '@/lib/api'; // Import the new API function
import { toast } from 'sonner'; // Assuming sonner for toast notifications

export default function ProfilePage() {
  const { user, token, companiesList, getCompanyName, updateUserContext } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(user?.company_code?.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  // const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null); // Using toast instead

  useEffect(() => {
    // Update selectedCompany if user's company_code changes from context (e.g., after successful update)
    if (user?.company_code) {
      setSelectedCompany(user.company_code.toString());
    }
  }, [user?.company_code]);

  const handleCompanyUpdate = async () => {
    if (!token || !selectedCompany || !user) {
      toast.error('Error: Missing required information to update company.');
      return;
    }
    if (parseInt(selectedCompany) === user.company_code) {
        toast.info('No change detected in company selection.');
        return;
    }

    setIsUpdating(true);
    // setUpdateMessage(null);

    try {
      const updatedUser = await updateUserCompany(token, parseInt(selectedCompany));
      updateUserContext(updatedUser); // Update user in AuthContext
      toast.success('Company updated successfully!');
    } catch (error: any) {      
      console.error("Failed to update company:", error);
      toast.error(error.message || 'Failed to update company.');
    } finally {
      setIsUpdating(false);
    }
  };



  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground">Loading user data or not logged in...</p>
      </div>
    );
  }

  const companyName = user.company_code ? getCompanyName(user.company_code) : 'N/A';
  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="space-y-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center">User Profile</h1>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="w-20 h-20 md:w-24 md:h-24">
            {/* Placeholder for user image - can be added later */}
            {/* <AvatarImage src="https://github.com/shadcn.png" alt={`@${user.username}`} /> */}
            <AvatarFallback className="text-3xl md:text-4xl">{userInitial}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.full_name || user.username}</CardTitle>
            <CardDescription>@{user.username}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="text-lg">{user.role || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Code</p>
                    <p className="text-lg">{user.company_code || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p className="text-lg">{companyName}</p>
                </div>
            </div>
          </div>

          {user?.role === 'SPV' && companiesList && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-3">Change Company</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="company-select" className="block text-sm font-medium text-muted-foreground mb-1">
                    Select New Company
                  </label>
                  <Select 
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                    disabled={isUpdating}
                  >
                    <SelectTrigger id="company-select" className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companiesList.map((company) => (
                        <SelectItem key={company.company_code} value={company.company_code.toString()}>
                          {company.name} (Code: {company.company_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCompanyUpdate} 
                  disabled={isUpdating || !selectedCompany || parseInt(selectedCompany) === user.company_code}
                >
                  {isUpdating ? 'Updating...' : 'Update Company'}
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder for other profile settings or actions */}
          {/* 
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-muted-foreground">Password change, preferences, etc.</p>
          </div>
          */}
        </CardContent>
      </Card>
      {/* Removed direct message display, relying on toast notifications 
      {updateMessage && (
        <div className={`p-4 rounded-md ${updateMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {updateMessage.text}
        </div>
      )} 
      */}
    </div>
  );
}
