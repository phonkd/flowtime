import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Users, Tag, FolderOpen, Share2, Lock } from "lucide-react";
import { UsersTab } from "@/components/admin/users-tab";
import { CategoriesTab } from "@/components/admin/categories-tab";
import { TagsTab } from "@/components/admin/tags-tab";
import { TracksTab } from "@/components/admin/tracks-tab";
import { ShareableLinksTab } from "@/components/admin/shareable-links-tab";
import { PrivateAccessTab } from "@/components/admin/private-access-tab";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("tracks");
  
  // Query for authentication state and admin check
  const { data: user, isLoading: isAuthLoading } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Check if user is authenticated and is admin
  const isAdmin = user && user.role === 'admin';
  
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please contact an administrator if you believe you should have access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your hypnosis audio content, users, and access controls.
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="tracks" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Tracks</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden md:inline">Tags</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="shared-links" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Shared Links</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden md:inline">Access</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tracks" className="space-y-4">
          <TracksTab />
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <CategoriesTab />
        </TabsContent>
        
        <TabsContent value="tags" className="space-y-4">
          <TagsTab />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>
        
        <TabsContent value="shared-links" className="space-y-4">
          <ShareableLinksTab />
        </TabsContent>
        
        <TabsContent value="access" className="space-y-4">
          <PrivateAccessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}