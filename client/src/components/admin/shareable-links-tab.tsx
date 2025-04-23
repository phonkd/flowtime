import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Trash2, 
  Copy, 
  Check,
  Link2,
  ToggleLeft,
  ToggleRight 
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

// Schema for shareable link form
const shareableLinkSchema = z.object({
  audioTrackId: z.string().min(1, "Track is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  expiresAt: z.string().optional(),
});

type ShareableLinkFormValues = z.infer<typeof shareableLinkSchema>;

export function ShareableLinksTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Fetch shareable links
  const { data: links, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['/api/shareable-links'],
  });
  
  // Fetch all tracks
  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['/api/tracks'],
  });
  
  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (data: ShareableLinkFormValues) => {
      const formattedData = {
        audioTrackId: parseInt(data.audioTrackId),
        name: data.name,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      };
      
      const res = await apiRequest("POST", "/api/shareable-links", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shareable link created successfully",
      });
      queryClient.invalidateQueries({queryKey: ['/api/shareable-links']});
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle link active state mutation
  const toggleLinkMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/shareable-links/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Link status updated successfully",
      });
      queryClient.invalidateQueries({queryKey: ['/api/shareable-links']});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shareable-links/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
      queryClient.invalidateQueries({queryKey: ['/api/shareable-links']});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form setup
  const form = useForm<ShareableLinkFormValues>({
    resolver: zodResolver(shareableLinkSchema),
    defaultValues: {
      audioTrackId: "",
      name: "",
      expiresAt: "",
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ShareableLinkFormValues) => {
    createLinkMutation.mutate(data);
  };
  
  // Handle copy link
  const copyLink = (linkId: string) => {
    const linkUrl = `${window.location.origin}/shared/${linkId}`;
    navigator.clipboard.writeText(linkUrl);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
    
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Shareable Link</CardTitle>
          <CardDescription>
            Create a link to share an audio track with others. You can set an expiration date or disable the link later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="audioTrackId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Track</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a track" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingTracks ? (
                          <div className="flex justify-center items-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : tracks && tracks.length > 0 ? (
                          tracks.map((track: any) => (
                            <SelectItem key={track.id} value={track.id.toString()}>
                              {track.title}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1 text-sm">No tracks available</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a descriptive name for this link" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                disabled={createLinkMutation.isPending}
              >
                {createLinkMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Link
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Shareable Links</CardTitle>
          <CardDescription>View, activate/deactivate, or delete shareable links</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLinks ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : links && links.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell>
                      {tracks?.find((track: any) => track.id === link.audioTrackId)?.title || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {link.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.createdAt ? format(new Date(link.createdAt), 'PPP') : '-'}
                    </TableCell>
                    <TableCell>
                      {link.expiresAt ? format(new Date(link.expiresAt), 'PPP') : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(link.linkId)}
                          title="Copy link"
                        >
                          {copiedLink === link.linkId ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => 
                            toggleLinkMutation.mutate({ 
                              id: link.id, 
                              isActive: !link.isActive 
                            })
                          }
                          title={link.isActive ? "Deactivate link" : "Activate link"}
                        >
                          {link.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Shareable Link
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the link "{link.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteLinkMutation.mutate(link.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteLinkMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p>No shareable links found. Create your first link using the form above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}