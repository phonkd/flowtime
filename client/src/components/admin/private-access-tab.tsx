import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Music } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";

// Schema for track access form
const trackAccessSchema = z.object({
  userId: z.string().min(1, "User is required"),
  audioTrackId: z.string().min(1, "Audio track is required"),
});

type TrackAccessFormValues = z.infer<typeof trackAccessSchema>;

export function PrivateAccessTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  
  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
  });
  
  // Fetch all tracks
  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['/api/tracks'],
  });
  
  // Fetch users with access to selected track
  const { 
    data: usersWithAccess, 
    isLoading: isLoadingAccess,
    refetch: refetchUsersWithAccess 
  } = useQuery({
    queryKey: ['/api/track-access', selectedTrack, 'users'],
    queryFn: async () => {
      if (!selectedTrack) return [];
      const res = await fetch(`/api/track-access/${selectedTrack}/users`);
      if (!res.ok) throw new Error('Failed to fetch users with access');
      return res.json();
    },
    enabled: !!selectedTrack,
  });
  
  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (values: TrackAccessFormValues) => {
      const data = {
        userId: parseInt(values.userId),
        audioTrackId: parseInt(values.audioTrackId),
      };
      
      const res = await apiRequest("POST", "/api/track-access", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Access granted successfully",
      });
      refetchUsersWithAccess();
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
  
  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ userId, audioTrackId }: { userId: number; audioTrackId: number }) => {
      await apiRequest("DELETE", `/api/track-access/${userId}/${audioTrackId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Access revoked successfully",
      });
      refetchUsersWithAccess();
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
  const form = useForm<TrackAccessFormValues>({
    resolver: zodResolver(trackAccessSchema),
    defaultValues: {
      userId: "",
      audioTrackId: selectedTrack?.toString() || "",
    },
  });
  
  // Update the audioTrackId field when selectedTrack changes
  React.useEffect(() => {
    if (selectedTrack) {
      form.setValue("audioTrackId", selectedTrack.toString());
    }
  }, [selectedTrack, form]);
  
  // Handle form submission
  const onSubmit = (values: TrackAccessFormValues) => {
    grantAccessMutation.mutate(values);
  };
  
  // Handle track selection
  const handleTrackSelect = (trackId: string) => {
    setSelectedTrack(parseInt(trackId));
    form.setValue("audioTrackId", trackId);
  };
  
  // Filter out users that already have access to the selected track
  const getAvailableUsers = () => {
    if (!users || !usersWithAccess) return [];
    
    const userIdsWithAccess = usersWithAccess.map((user: any) => user.id);
    return users.filter((user: any) => !userIdsWithAccess.includes(user.id));
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Private Track Access</CardTitle>
          <CardDescription>
            Grant or revoke user access to specific audio tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="mb-2">
              <Label htmlFor="track-select">Select a Track to Manage Access</Label>
            </div>
            <Select onValueChange={handleTrackSelect} value={selectedTrack?.toString() || ""}>
              <SelectTrigger id="track-select" className="w-full">
                <SelectValue placeholder="Select a track" />
              </SelectTrigger>
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
          </div>
          
          {selectedTrack && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Grant Access to a User</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="user-select">Select User</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger id="user-select">
                                <SelectValue placeholder="Select a user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingUsers ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : getAvailableUsers().length > 0 ? (
                                getAvailableUsers().map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.username} {user.fullName ? `(${user.fullName})` : ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1 text-sm">No users available</div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input type="hidden" {...form.register("audioTrackId")} />
                    <Button
                      type="submit"
                      disabled={grantAccessMutation.isPending || !form.formState.isValid}
                    >
                      {grantAccessMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Grant Access
                    </Button>
                  </form>
                </Form>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Users with Access</h3>
                {isLoadingAccess ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : usersWithAccess && usersWithAccess.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersWithAccess.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.fullName || '-'}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to revoke access for {user.username}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => 
                                      revokeAccessMutation.mutate({ 
                                        userId: user.id, 
                                        audioTrackId: selectedTrack 
                                      })
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {revokeAccessMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      "Revoke Access"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No users have access to this track yet.
                  </div>
                )}
              </div>
            </>
          )}
          
          {!selectedTrack && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a track from the dropdown above to manage user access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}