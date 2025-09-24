import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string,
    avatarFile?: File
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      
      // Handle token refresh failures and expired sessions
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log("Token refresh failed, clearing auth state");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log("Session check failed:", error);
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string,
    avatarFile?: File
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          date_of_birth: dateOfBirth,
        },
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user && !data.session) {
      // This means the user already exists but email confirmation is required
      toast({
        title: "Check your email",
        description:
          "We've sent you a confirmation link to complete your registration.",
      });
    } else if (data.user && data.session) {
      // New user was created and auto-confirmed
      // If there's an avatar file, upload it
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split(".").pop();
          const fileName = `${data.user.id}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, avatarFile, {
              cacheControl: "3600",
              upsert: true,
            });

          if (!uploadError) {
            // Get public URL and update user profile
            const {
              data: { publicUrl },
            } = supabase.storage.from("avatars").getPublicUrl(fileName);

            // Update the user profile with avatar URL
            await supabase
              .from("users")
              .update({ avatar_url: publicUrl })
              .eq("user_id", data.user.id);
          }
        } catch (avatarError) {
          console.error("Avatar upload failed:", avatarError);
          // Don't show error to user as registration was successful
        }
      }
      toast({
        title: "Account created successfully",
        description: "Welcome! You can now complete your profile setup.",
      });
    } else {
      // Default case - send confirmation email
      // If there's an avatar file, try to upload it after user confirms
      if (avatarFile && data.user) {
        try {
          const fileExt = avatarFile.name.split(".").pop();
          const fileName = `${data.user.id}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, avatarFile, {
              cacheControl: "3600",
              upsert: true,
            });

          if (!uploadError) {
            // Get public URL and update user profile
            const {
              data: { publicUrl },
            } = supabase.storage.from("avatars").getPublicUrl(fileName);

            // Update the user profile with avatar URL
            await supabase
              .from("users")
              .update({ avatar_url: publicUrl })
              .eq("user_id", data.user.id);
          }
        } catch (avatarError) {
          console.error("Avatar upload failed:", avatarError);
          // Don't show error to user as registration was successful
        }
      }

      toast({
        title: "Check your email",
        description:
          "We've sent you a confirmation link to complete your registration.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    // Immediately clear local state regardless of error
    setUser(null);
    setSession(null);

    // Don't show error toast for "auth session missing" as it's expected
    // when user is already logged out or session expired
    if (error && !error.message.includes("auth session missing")) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    }

    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
