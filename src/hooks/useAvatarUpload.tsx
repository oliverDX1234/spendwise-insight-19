import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAvatarUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("User not authenticated");

    setUploading(true);

    try {
      // Delete existing avatar if it exists
      const existingAvatarPath = `${user.id}/avatar`;
      await supabase.storage
        .from("avatars")
        .remove([existingAvatarPath]);

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const updateProfileAvatar = useMutation({
    mutationFn: async (file: File) => {
      const avatarUrl = await uploadAvatar(file);

      // Update user profile with new avatar URL
      const { error } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user?.id);

      if (error) throw error;

      return avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update avatar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateProfileAvatar,
    uploading: uploading || updateProfileAvatar.isPending,
  };
}

// Utility function to validate image file
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(file.type)) {
    return "Please select a valid image file (JPG, PNG, GIF, or WebP)";
  }

  if (file.size > maxSize) {
    return "Image size must be less than 2MB";
  }

  return null;
}