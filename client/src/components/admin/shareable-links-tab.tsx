import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Trash, 
  Link2, 
  FileAudio, 
  Copy, 
  CheckCircle2, 
  XCircle 
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function ShareableLinksTab() {
  const { toast } = useToast();
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Query for shareable links
  const { data: shareableLinks, isLoading } = useQuery({
    queryKey: ['/api/admin/shareable-links'],
  });

  // Delete shareable link mutation
  const deleteShareableLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/shareable-links/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete shareable link");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shareable-links'] });
      setConfirmDeleteOpen(false);
      setSelectedLink(null);
      toast({
        title: "Link deleted",
        description: "The shareable link has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting link",
        description: error.message || "There was an error deleting the link.",
        variant: "destructive",
      });
    },
  });

  // Toggle link active status mutation
  const toggleLinkActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/shareable-links/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shareable-links'] });
      toast({
        title: "Link status updated",
        description: "The link status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating link status",
        description: error.message || "There was an error updating the link status.",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = (linkId: string) => {
    const shareableUrl = `${window.location.origin}/shared/${linkId}`;
    navigator.clipboard.writeText(shareableUrl);
    toast({
      title: "Link copied",
      description: "The shareable link has been copied to your clipboard.",
    });
  };

  const handleDeleteLink = (link: any) => {
    setSelectedLink(link);
    setConfirmDeleteOpen(true);
  };

  const handleToggleStatus = (link: any) => {
    toggleLinkActiveMutation.mutate({ 
      id: link.id, 
      isActive: !link.isActive 
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shareable Links</CardTitle>
        <CardDescription>Manage private shareable links for your audio content</CardDescription>
      </CardHeader>
      <CardContent>
        {shareableLinks && shareableLinks.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareableLinks.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{link.audioTrack.title}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(link.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {link.expiresAt 
                        ? format(new Date(link.expiresAt), 'MMM d, yyyy')
                        : "Never expires"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={link.isActive ? "default" : "destructive"}
                        className="justify-center"
                      >
                        {link.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyLink(link.linkId)}
                          title="Copy Shareable Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={link.isActive ? "outline" : "default"}
                          size="icon"
                          onClick={() => handleToggleStatus(link)}
                          title={link.isActive ? "Deactivate Link" : "Activate Link"}
                        >
                          {link.isActive ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteLink(link)}
                          className="text-destructive"
                          title="Delete Link"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Link2 className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="mt-4 text-lg font-medium">No shareable links found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create shareable links from the Tracks tab to give private access to specific audio content.
            </p>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shareable Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shareable link for "{selectedLink?.audioTrack?.title}"? 
              This action cannot be undone and anyone with this link will no longer be able to access the content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteShareableLinkMutation.mutate(selectedLink?.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteShareableLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}