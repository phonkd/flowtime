import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import { UsersTab } from "@/components/admin/users-tab";
import { CategoriesTab } from "@/components/admin/categories-tab";
import { TagsTab } from "@/components/admin/tags-tab";
import { TracksTab } from "@/components/admin/tracks-tab";
import { ShareableLinksTab } from "@/components/admin/shareable-links-tab";
import { PrivateAccessTab } from "@/components/admin/private-access-tab";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("categories");

  // Get user data
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  
  // Check if user is authenticated and admin
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return <Redirect to="/login" />;
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 bg-card min-h-screen my-8 rounded-lg shadow-sm">
      <h1 className="text-3xl font-bold mb-6 gradient-text">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="shareable-links">Shareable Links</TabsTrigger>
          <TabsTrigger value="private-access">Private Access</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        
        <TabsContent value="tags">
          <TagsTab />
        </TabsContent>
        
        <TabsContent value="tracks">
          <TracksTab />
        </TabsContent>
        
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        
        <TabsContent value="shareable-links">
          <ShareableLinksTab />
        </TabsContent>
        
        <TabsContent value="private-access">
          <PrivateAccessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}