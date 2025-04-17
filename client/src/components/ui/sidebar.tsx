import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { CategoryWithCount, TagWithCount } from "@shared/schema";

interface SidebarProps {
  isMobile?: boolean;
  onCategorySelect?: () => void;
}

export function Sidebar({ isMobile = false, onCategorySelect }: SidebarProps) {
  const [location, navigate] = useLocation();
  const isHomePage = location === "/";
  
  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch tags
  const { data: tags, isLoading: isTagsLoading } = useQuery<TagWithCount[]>({
    queryKey: ["/api/tags"],
  });
  
  // Extract current category from URL
  const categoryFromUrl = location.startsWith("/category/") 
    ? parseInt(location.split("/category/")[1]) 
    : null;
  
  const handleCategoryClick = (categoryId: number) => {
    navigate(`/category/${categoryId}`);
    if (onCategorySelect && isMobile) {
      onCategorySelect();
    }
  };
  
  const handleAllRecordingsClick = () => {
    navigate("/");
    if (onCategorySelect && isMobile) {
      onCategorySelect();
    }
  };
  
  const handleDurationChange = (value: string) => {
    // Implementation would depend on your filter state management
    console.log("Duration filter changed:", value);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Categories</h2>
      
      {/* Categories list */}
      <div className="space-y-1 mb-8">
        <Button
          variant="ghost"
          className="w-full justify-between items-center px-3 py-2 text-left rounded hover:bg-neutral-100 font-medium text-sm"
          onClick={handleAllRecordingsClick}
        >
          <span className="flex items-center">
            <span>All Recordings</span>
          </span>
          <span className={`text-xs rounded-full px-2 py-0.5 ${isHomePage ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-700'}`}>
            {categories?.reduce((sum, cat) => sum + cat.count, 0) || "..."}
          </span>
        </Button>
        
        {isCategoriesLoading ? (
          // Loading state
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-3 py-2">
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </>
        ) : (
          // Categories list
          <>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className="w-full justify-between items-center px-3 py-2 text-left rounded hover:bg-neutral-100 font-medium text-sm"
                onClick={() => handleCategoryClick(category.id)}
              >
                <span className="flex items-center">
                  <span>{category.name}</span>
                </span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${categoryFromUrl === category.id ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {category.count}
                </span>
              </Button>
            ))}
          </>
        )}
      </div>
      
      {/* Filters section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
        
        {/* Duration filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Duration
          </label>
          <Select onValueChange={handleDurationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any length" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="any">Any length</SelectItem>
                <SelectItem value="short">Short (&lt; 10 min)</SelectItem>
                <SelectItem value="medium">Medium (10-20 min)</SelectItem>
                <SelectItem value="long">Long (&gt; 20 min)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Tags filter */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Tags
          </label>
          
          {isTagsLoading ? (
            // Loading state
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          ) : (
            // Tags list
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <Button
                  key={tag.id}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-6 px-2 bg-white hover:bg-neutral-100"
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
