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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  PlusCircle, 
  Edit, 
  Trash, 
  MoreHorizontal, 
  Eye,
  EyeOff,
  Link,
  FileAudio
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function TracksTab() {
  const { toast } = useToast();
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Query for tracks
  const { data: tracks, isLoading: isTracksLoading } = useQuery({
    queryKey: ['/api/tracks'],
  });

  // Query for categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Query for tags
  const { data: tags, isLoading: isTagsLoading } = useQuery({
    queryKey: ['/api/tags'],
  });

  // Toggle track visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/tracks/${id}/visibility`, { isPublic });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      toast({
        title: "Track visibility updated",
        description: "The track visibility has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating track visibility",
        description: error.message || "There was an error updating the track visibility.",
        variant: "destructive",
      });
    },
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/tracks/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete track");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      setConfirmDeleteOpen(false);
      setSelectedTrack(null);
      toast({
        title: "Track deleted",
        description: "The audio track has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting track",
        description: error.message || "There was an error deleting the track.",
        variant: "destructive",
      });
    },
  });

  // Create shareable link mutation
  const createShareableLinkMutation = useMutation({
    mutationFn: async ({ audioTrackId, expiresAt }: { audioTrackId: number; expiresAt?: string }) => {
      const response = await apiRequest("POST", "/api/admin/share", { 
        audioTrackId,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined 
      });
      return response.json();
    },
    onSuccess: (data) => {
      navigator.clipboard.writeText(`${window.location.origin}/shared/${data.linkId}`);
      setShareDialogOpen(false);
      setSelectedTrack(null);
      toast({
        title: "Shareable link created",
        description: "The link has been created and copied to your clipboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating shareable link",
        description: error.message || "There was an error creating the shareable link.",
        variant: "destructive",
      });
    },
  });

  const handleCreateShareableLink = (trackId: number, expiresAt?: string) => {
    createShareableLinkMutation.mutate({ audioTrackId: trackId, expiresAt });
  };

  const handleToggleVisibility = (track: any) => {
    toggleVisibilityMutation.mutate({ 
      id: track.id, 
      isPublic: !track.isPublic 
    });
  };

  const handleDeleteTrack = (track: any) => {
    setSelectedTrack(track);
    setConfirmDeleteOpen(true);
  };

  const handleShareTrack = (track: any) => {
    setSelectedTrack(track);
    setShareDialogOpen(true);
  };

  const isLoading = isTracksLoading || isCategoriesLoading || isTagsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Audio Tracks</CardTitle>
          <CardDescription>Manage your hypnosis audio tracks</CardDescription>
        </div>
        <Button asChild className="gap-1">
          <a href="/upload">
            <PlusCircle className="h-4 w-4" />
            <span>Upload Track</span>
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {tracks && tracks.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-center">Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track: any) => (
                  <TableRow key={track.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{track.title}</span>
                    </TableCell>
                    <TableCell>{track.category.name}</TableCell>
                    <TableCell>
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {track.tags && track.tags.map((tag: any) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                        {(!track.tags || track.tags.length === 0) && (
                          <span className="text-muted-foreground text-xs">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={track.isPublic}
                        onCheckedChange={() => handleToggleVisibility(track)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleShareTrack(track)}>
                            <Link className="h-4 w-4 mr-2" /> Create Shareable Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleVisibility(track)}>
                            {track.isPublic ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" /> Make Private
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" /> Make Public
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={`/admin/tracks/${track.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteTrack(track)}
                          >
                            <Trash className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileAudio className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="mt-4 text-lg font-medium">No audio tracks found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your first hypnosis audio track to get started.
            </p>
            <Button asChild className="mt-4">
              <a href="/upload">Upload Track</a>
            </Button>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audio Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTrack?.title}"? This action cannot be undone
              and all data associated with this track will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTrackMutation.mutate(selectedTrack?.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTrackMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shareable Link</DialogTitle>
            <DialogDescription>
              Create a shareable link for "{selectedTrack?.title}" that can be shared with specific users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="expiration">Link Expiration (Optional)</Label>
              <Input
                id="expiration"
                type="datetime-local"
                min={new Date().toISOString().slice(0, -8)}
              />
              <p className="text-sm text-muted-foreground">
                Leave blank for a link that never expires
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const expiration = (document.getElementById('expiration') as HTMLInputElement)?.value;
                handleCreateShareableLink(selectedTrack?.id, expiration);
              }}
              disabled={createShareableLinkMutation.isPending}
            >
              {createShareableLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create and Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}