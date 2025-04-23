import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Form validation schema
const uploadSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }).max(100),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }).max(500),
  categoryId: z.string({ required_error: 'Please select a category' }),
  tags: z.array(z.string()).optional(),
  audioFile: z.any()
    .refine(file => file instanceof FileList && file.length > 0, {
      message: 'Audio file is required',
    }),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Fetch categories
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    retry: 1,
  });

  // Fetch tags
  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['/api/tags'],
    retry: 1,
  });

  // Form definition
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      tags: [],
      audioFile: undefined,
    },
  });

  // Handle file selection and duration calculation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Update form value
    form.setValue('audioFile', event.target.files);

    // Create a preview URL for the audio
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }
    const url = URL.createObjectURL(file);
    setPreviewURL(url);

    // Calculate duration when audio metadata is loaded
    setIsCalculatingDuration(true);
    const audio = audioRef.current;
    if (audio) {
      audio.src = url;
      audio.onloadedmetadata = () => {
        setAudioDuration(Math.round(audio.duration));
        setIsCalculatingDuration(false);
      };
      audio.onerror = () => {
        toast({
          title: 'Error',
          description: 'Could not load audio file. Please try a different file.',
          variant: 'destructive',
        });
        setIsCalculatingDuration(false);
      };
    }
  };

  // Upload audio mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await apiRequest('/api/uploads/audio', {
          method: 'POST',
          body: data,
        } as RequestInit);
        return response;
      } catch (error: any) {
        console.error('Upload error:', error);
        // Throw a more detailed error for better debugging
        if (error instanceof Error) {
          throw new Error(`Upload failed: ${error.message}`);
        } else if (typeof error === 'object' && error !== null) {
          throw new Error(`Upload failed: ${JSON.stringify(error)}`);
        } else {
          throw new Error('Upload failed: Unknown error');
        }
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({
        title: 'Success!',
        description: 'Your audio has been uploaded.',
      });
      
      // Redirect to home page
      setLocation('/');
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload audio. Please try again with a smaller file or check your network connection.',
        variant: 'destructive',
      });
    },
  });

  // Custom upload function with progress tracking
  const uploadWithProgress = async (formData: FormData) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Setup promise to handle response
      const promise = new Promise<any>((resolve, reject) => {
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        // Handle response
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        };
        
        // Handle network errors
        xhr.onerror = () => {
          reject(new Error('Network error occurred during upload'));
        };
        
        // Handle timeout
        xhr.ontimeout = () => {
          reject(new Error('Upload timed out'));
        };
      });
      
      // Open and send the request
      xhr.open('POST', '/api/uploads/audio', true);
      xhr.timeout = 3600000; // 1 hour timeout for large files
      xhr.send(formData);
      
      return promise;
    } finally {
      // Cleanup
      setIsUploading(false);
    }
  };

  // Form submission handler
  const onSubmit = (values: UploadFormValues) => {
    try {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('categoryId', values.categoryId);
      
      // Add duration if calculated
      if (audioDuration) {
        formData.append('duration', audioDuration.toString());
      }
      
      // Add tags if selected
      if (values.tags && values.tags.length > 0) {
        values.tags.forEach(tag => {
          formData.append('tags', tag);
        });
      }
      
      // Add audio file
      if (values.audioFile && values.audioFile[0]) {
        const file = values.audioFile[0];
        
        // Show a toast notification for large files
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: 'Large File',
            description: 'Your file is very large. Upload may take some time to complete.',
            duration: 5000,
          });
        }
        
        formData.append('audioFile', file);
        
        // Display upload starting toast
        toast({
          title: 'Upload Started',
          description: 'Your audio file is being uploaded. Please wait...',
          duration: 3000,
        });
        
        // Use custom upload with progress
        setIsUploading(true);
        uploadWithProgress(formData)
          .then((response) => {
            // Handle success
            queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
            
            toast({
              title: 'Success!',
              description: 'Your audio has been uploaded.',
            });
            
            // Redirect to home page
            setLocation('/');
          })
          .catch((error) => {
            console.error('Upload error:', error);
            
            toast({
              title: 'Upload Failed',
              description: error.message || 'Failed to upload audio. Please try again with a smaller file or check your network connection.',
              variant: 'destructive',
            });
          })
          .finally(() => {
            setIsUploading(false);
          });
      } else {
        toast({
          title: 'Missing File',
          description: 'Please select an audio file to upload.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <audio ref={audioRef} className="hidden" />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upload Hypnosis Audio</CardTitle>
          <CardDescription>
            Share your hypnosis recordings with the community
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your audio" {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title that indicates what the audio is about
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a detailed description" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what listeners will experience and any instructions or guidance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Category Field */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the most appropriate category for your audio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Tags Field */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Optional)</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags?.map((tag: any) => (
                        <div key={tag.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`tag-${tag.id}`}
                            value={tag.id}
                            className="mr-2"
                            onChange={(e) => {
                              const value = tag.id.toString();
                              const newValues = e.target.checked
                                ? [...(field.value || []), value]
                                : (field.value || []).filter((v) => v !== value);
                              field.onChange(newValues);
                            }}
                            checked={(field.value || []).includes(tag.id.toString())}
                          />
                          <Label htmlFor={`tag-${tag.id}`}>{tag.name}</Label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select tags to help users find your audio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Audio File Upload */}
              <FormField
                control={form.control}
                name="audioFile"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Audio File</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-4">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            handleFileChange(e);
                          }}
                          {...rest}
                        />
                        
                        {previewURL && (
                          <div className="bg-muted p-4 rounded-md">
                            <p className="mb-2 font-medium">Preview:</p>
                            <audio controls className="w-full" src={previewURL} />
                            {isCalculatingDuration ? (
                              <p className="text-sm mt-2 text-muted-foreground flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Calculating duration...
                              </p>
                            ) : audioDuration ? (
                              <p className="text-sm mt-2 text-muted-foreground">
                                Duration: {Math.floor(audioDuration / 60)}:{String(audioDuration % 60).padStart(2, '0')}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload an MP3, WAV, or OGG file (max 150MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Uploading...</span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Please wait while your audio file is being uploaded. This may take several minutes for large files.
                  </p>
                </div>
              )}
              
              {/* Form Actions */}
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation('/')}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="submit" 
                        disabled={isUploading || isCalculatingDuration}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Audio
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload your audio file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}