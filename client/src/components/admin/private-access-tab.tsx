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
import { 
  Loader2, 
  Trash, 
  UserPlus, 
  FileAudio,
  Users
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const grantAccessSchema = z.object({
  userId: z.string().min(1, { message: "Please select a user." }),
  audioTrackId: z.string().min(1, { message: "Please select an audio track." }),
});

type GrantAccessFormValues = z.infer<typeof grantAccessSchema>;

export function PrivateAccessTab() {
  const { toast } = useToast();
  const [selectedAccess, setSelectedAccess] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  
  // Query for user access permissions
  const { data: userAccess, isLoading: isAccessLoading } = useQuery({
    queryKey: ['/api/admin/user-access'],
  });

  // Query for users
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Query for private tracks
  const { data: tracks, isLoading: isTracksLoading } = useQuery({
    queryKey: ['/api/admin/tracks'],
  });

  // Grant user access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (values: { userId: number; audioTrackId: number }) => {
      const response = await apiRequest("POST", "/api/admin/user-access", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-access'] });
      setGrantDialogOpen(false);
      toast({
        title: "Access granted",
        description: "User access has been granted successfully.",
      });
      form.reset({
        userId: "",
        audioTrackId: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error granting access",
        description: error.message || "There was an error granting user access.",
        variant: "destructive",
      });
    },
  });

  // Revoke user access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ userId, audioTrackId }: { userId: number; audioTrackId: number }) => {
      const response = await apiRequest("DELETE", `/api/admin/user-access`, { userId, audioTrackId });
      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-access'] });
      setConfirmDeleteOpen(false);
      setSelectedAccess(null);
      toast({
        title: "Access revoked",
        description: "User access has been revoked successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error revoking access",
        description: error.message || "There was an error revoking user access.",
        variant: "destructive",
      });
    },
  });

  // Form for granting access
  const form = useForm<GrantAccessFormValues>({
    resolver: zodResolver(grantAccessSchema),
    defaultValues: {
      userId: "",
      audioTrackId: "",
    },
  });

  const onSubmit = (values: GrantAccessFormValues) => {
    grantAccessMutation.mutate({
      userId: parseInt(values.userId),
      audioTrackId: parseInt(values.audioTrackId),
    });
  };

  const handleRevokeAccess = (access: any) => {
    setSelectedAccess(access);
    setConfirmDeleteOpen(true);
  };

  const isLoading = isAccessLoading || isUsersLoading || isTracksLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter tracks to show only private ones
  const privateTracksOnly = tracks?.filter((track: any) => !track.isPublic) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Private Access</CardTitle>
          <CardDescription>Manage user access to private audio content</CardDescription>
        </div>
        <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Grant Access</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant User Access</DialogTitle>
              <DialogDescription>
                Give a user access to a private audio track.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users && users.length > 0 ? (
                            users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.username} {user.fullName ? `(${user.fullName})` : ''}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No users available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audioTrackId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audio Track</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a private track" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {privateTracksOnly && privateTracksOnly.length > 0 ? (
                            privateTracksOnly.map((track: any) => (
                              <SelectItem key={track.id} value={track.id.toString()}>
                                {track.title}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No private tracks available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only private tracks can be assigned for specific user access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={grantAccessMutation.isPending || privateTracksOnly.length === 0}
                  >
                    {grantAccessMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Grant Access
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {userAccess && userAccess.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Granted On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAccess.map((access: any) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">
                      {access.user.username}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                      {access.audioTrack.title}
                    </TableCell>
                    <TableCell>{access.grantedBy.username}</TableCell>
                    <TableCell>
                      {format(new Date(access.grantedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRevokeAccess(access)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="mt-4 text-lg font-medium">No private access permissions found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Grant users access to private audio content to see them here.
            </p>
            <Button 
              onClick={() => setGrantDialogOpen(true)} 
              className="mt-4"
              disabled={privateTracksOnly.length === 0}
            >
              Grant Access
            </Button>
            {privateTracksOnly.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                You need to have private tracks before you can grant access.
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke {selectedAccess?.user.username}'s access to "{selectedAccess?.audioTrack.title}"? 
              The user will no longer be able to access this audio track.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAccessMutation.mutate({
                userId: selectedAccess?.user.id,
                audioTrackId: selectedAccess?.audioTrack.id
              })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {revokeAccessMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}