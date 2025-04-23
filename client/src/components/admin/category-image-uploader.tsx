import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CategoryImageUploaderProps {
  categoryId: number;
  categoryName: string;
  currentImageUrl: string | null;
  onSuccess: (imageUrl: string) => void;
}

export function CategoryImageUploader({ 
  categoryId, 
  categoryName,
  currentImageUrl,
  onSuccess 
}: CategoryImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);

    // Create a preview URL for the selected image
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    return;
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an image file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('imageFile', file);

      const response = await apiRequest(
        'POST', 
        `/api/admin/categories/${categoryId}/image`, 
        formData
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Image uploaded',
          description: 'Category image has been updated successfully',
        });
        onSuccess(data.imageUrl);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Update Category Image</CardTitle>
        <CardDescription>Upload a new image for {categoryName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {previewUrl && (
            <div className="relative w-full overflow-hidden rounded-md aspect-video bg-muted">
              <img 
                src={previewUrl} 
                alt={categoryName} 
                className="object-cover w-full h-full" 
              />
            </div>
          )}

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="image-upload">Image</Label>
            <Input 
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}