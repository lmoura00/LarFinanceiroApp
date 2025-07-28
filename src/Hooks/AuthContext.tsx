import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "@/supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export const LAST_EMAIL_KEY = "last_logged_in_email";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; session?: Session | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string; session?: Session | null }>;
  signOut: () => Promise<void>;
  unreadNotifications: number;
  markNotificationsAsRead: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const router = useRouter();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name, email, role, created_at")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfile(data as UserProfile);
    } else {
      setProfile(null);
    }
  };

  const fetchUnreadNotificationsCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setUnreadNotifications(count ?? 0);
    }
  };

  useEffect(() => {
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true);
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await fetchUnreadNotificationsCount(currentUser.id);
      } else {
        setProfile(null);
        setUnreadNotifications(0);
      }
      setLoading(false);
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadNotificationsCount(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

const signIn = async (email: string, password: string) => {
  setLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  console.log("Dados da sessão no AuthContext:", data);
  console.log("Refresh token no AuthContext:", data?.session?.refresh_token);
  
  setLoading(false);

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    await fetchUserProfile(data.user.id);
  }

  return { 
    success: true, 
    session: data.session,
    error: undefined 
  };
};

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      return { success: false, error: authError?.message || "Erro desconhecido." };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: authData.user.id, role: "admin", email, name });

    if (profileError) {
      setLoading(false);
      return { success: false, error: profileError.message };
    }

    const signInResult = await signIn(email, password);
    setLoading(false);
    return { ...signInResult };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(LAST_EMAIL_KEY);
    router.replace("/Auth/page");
    setLoading(false);
    if (error) {
      Alert.alert("Erro ao sair", error.message);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setUnreadNotifications(0);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    unreadNotifications,
    markNotificationsAsRead,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
