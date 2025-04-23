import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryImageUploader } from './category-image-uploader';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, AlertCircle, Loader2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Category {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  count: number;
}

interface CategoryFormData {
  name: string;
  description: string;
}

export function CategoriesTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCategoryForDeletion, setSelectedCategoryForDeletion] = useState<Category | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', description: '' });
  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  // Fetch all categories
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const res = await apiRequest('POST', '/api/admin/categories', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Category created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CategoryFormData> }) => {
      const res = await apiRequest('PUT', `/api/admin/categories/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Category updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/admin/categories/${id}`);
      if (res.status === 204) return true;
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Category deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsDeleteDialogOpen(false);
      setSelectedCategoryForDeletion(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCategory = () => {
    createCategoryMutation.mutate(formData);
  };

  const handleUpdateCategory = () => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({
        id: selectedCategory.id,
        data: formData,
      });
    }
  };

  const handleDeleteCategory = () => {
    if (selectedCategoryForDeletion) {
      deleteCategoryMutation.mutate(selectedCategoryForDeletion.id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategoryForDeletion(category);
    setIsDeleteDialogOpen(true);
  };

  const handleImageUploadSuccess = (categoryId: number, imageUrl: string) => {
    // Update the local state to show the new image immediately
    if (categories) {
      const updatedCategories = categories.map(cat => 
        cat.id === categoryId ? { ...cat, imageUrl } : cat
      );
      
      // Force a refresh of the categories data
      queryClient.setQueryData(['/api/categories'], updatedCategories);
      
      // Also invalidate to ensure we get the latest from the server
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({ 
        title: 'Image updated',
        description: 'Category image has been updated successfully'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categories Management</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>Tracks: {category.count}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteDialog(category)}
                      disabled={category.count > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  {category.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">No image</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Tabs 
                  value={selectedTab === `category-${category.id}` ? 'edit' : 'view'} 
                  className="w-full"
                  onValueChange={(value) => {
                    if (value === 'edit') {
                      setSelectedTab(`category-${category.id}`);
                    } else {
                      setSelectedTab(null);
                    }
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="view">View</TabsTrigger>
                    <TabsTrigger value="edit">Edit Image</TabsTrigger>
                  </TabsList>
                  <TabsContent value="view" className="pt-4">
                    <p className="text-sm text-center text-muted-foreground">
                      Switch to Edit Image tab to change the category image
                    </p>
                  </TabsContent>
                  <TabsContent value="edit" className="pt-4">
                    <CategoryImageUploader
                      categoryId={category.id}
                      categoryName={category.name}
                      currentImageUrl={category.imageUrl}
                      onSuccess={(imageUrl) => handleImageUploadSuccess(category.id, imageUrl)}
                    />
                  </TabsContent>
                </Tabs>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 p-6 bg-muted rounded-lg">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Categories Found</h3>
          <p className="text-center text-muted-foreground mb-4">
            You haven't created any categories yet. Create a category to organize your audio tracks.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Category
          </Button>
        </div>
      )}

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your audio tracks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Category description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!formData.name || !formData.description || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Category description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={!formData.name || !formData.description || updateCategoryMutation.isPending}
            >
              {updateCategoryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category{' '}
              <span className="font-semibold">{selectedCategoryForDeletion?.name}</span>.
              {selectedCategoryForDeletion?.count ? (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  This category contains {selectedCategoryForDeletion.count} tracks. You must move or delete these tracks
                  first.
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={
                selectedCategoryForDeletion?.count ? selectedCategoryForDeletion.count > 0 : false ||
                deleteCategoryMutation.isPending
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}