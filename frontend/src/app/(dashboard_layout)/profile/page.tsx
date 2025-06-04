"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user, getCompanyName } = useAuth();

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

          {/* Placeholder for other profile settings or actions */}
          {/* 
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-muted-foreground">Password change, preferences, etc.</p>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
