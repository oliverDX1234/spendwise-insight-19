import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const avatarFile = formData.get("avatar") as File;

    if (!userId || !avatarFile) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or avatar file" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Uploading avatar for user ${userId}, file: ${avatarFile.name}`);

    // Get file extension
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    // Convert File to ArrayBuffer
    const fileBuffer = await avatarFile.arrayBuffer();

    // Upload to storage using service role (bypasses RLS)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: avatarFile.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

    console.log("Avatar uploaded successfully:", avatarUrlWithTimestamp);

    // Wait for user record to exist (with retry)
    let retries = 0;
    const maxRetries = 5;
    let userRecordExists = false;

    while (retries < maxRetries && !userRecordExists) {
      const { data: userRecord } = await supabaseAdmin
        .from("users")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (userRecord) {
        userRecordExists = true;
      } else {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 200 * retries));
      }
    }

    if (!userRecordExists) {
      console.error("User record not found after retries");
      return new Response(
        JSON.stringify({ error: "User record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update user profile with avatar URL
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ avatar_url: avatarUrlWithTimestamp })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update avatar URL:", updateError);
      throw updateError;
    }

    console.log("User profile updated with avatar URL");

    return new Response(
      JSON.stringify({ avatar_url: avatarUrlWithTimestamp }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in upload-registration-avatar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
