import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { AudioGrid } from "@/components/ui/audio-grid";
import { AudioPlayer } from "@/components/ui/audio-player";
import { AudioTrackWithDetails, Category } from "@shared/schema";

export default function CategoryPage() {
  const [, params] = useRoute("/category/:id");
  const categoryId = params ? parseInt(params.id) : null;
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch category details
  const {
    data: category,
    isLoading: isCategoryLoading,
  } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!categoryId,
  });
  
  // Fetch tracks for this category
  const { 
    data: tracks, 
    isLoading: isTracksLoading 
  } = useQuery<AudioTrackWithDetails[]>({
    queryKey: [`/api/categories/${categoryId}/tracks`],
    enabled: !!categoryId,
  });
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  // Filter tracks based on search query
  const filteredTracks = searchQuery && tracks
    ? tracks.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tracks;
  
  if (!categoryId) {
    return <div>Invalid category</div>;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={handleSearch} />
      
      <div className="flex-grow flex overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:block w-64 border-r border-neutral-200 bg-white overflow-y-auto">
          <Sidebar />
        </aside>
        
        {/* Main content */}
        <main className="flex-grow overflow-y-auto pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Category header */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-neutral-900">
                {isCategoryLoading ? "Loading..." : category?.name}
              </h2>
              <p className="text-neutral-600 text-sm">
                {isCategoryLoading ? "..." : category?.description}
              </p>
            </div>
            
            {/* Audio grid */}
            <AudioGrid 
              tracks={filteredTracks || []} 
              isLoading={isTracksLoading || isCategoryLoading} 
              emptyMessage={
                searchQuery 
                  ? `No tracks found matching "${searchQuery}" in this category`
                  : "No audio tracks available in this category"
              }
            />
          </div>
        </main>
      </div>
      
      {/* Audio player */}
      <AudioPlayer />
    </div>
  );
}
