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

const LAST_EMAIL_KEY = "last_logged_in_email";

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
  ) => Promise<{ success: boolean; error?: string }>;
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

  const fetchUnreadNotificationsCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        throw error;
      }
      setUnreadNotifications(count ?? 0);
    } catch (error: any) {
      console.error("Error fetching unread notifications:", error.message);
    }
  };

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);

      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUnreadNotificationsCount(session.user.id);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUnreadNotificationsCount(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, role, created_at")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(error.message);
      } else if (error && error.code === "PGRST116") {
        setProfile(null);
        return;
      }
      setProfile(data as UserProfile);
    } catch (error: any) {
      console.error("Erro ao buscar perfil do usuário:", error.message);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      await fetchUserProfile(data.user.id);
    }
    setLoading(false);
    return { success: true, session: data.session };
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    const {
      data: { user, session },
      error: authError,
    } = await supabase.auth.signUp({ email, password });

    if (authError || !user) {
      setLoading(false);
      return {
        success: false,
        error: authError?.message || "Erro ao registrar usuário.",
      };
    }

    if (session && user) {
      setSession(session);
      setUser(user);
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: user.id, role: "admin", email: user.email, name: name });

      if (profileError) {
        setLoading(false);
        return {
          success: false,
          error: profileError.message || "Ocorreu um erro ao criar seu perfil.",
        };
      }
      await fetchUserProfile(user.id);

      setLoading(false);
      return { success: true };
    } else {
      Alert.alert(
        "Aviso",
        "Sua conta foi criada, faça o login para continuar."
      );
      setLoading(false);
      return { success: true };
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Erro ao sair", error.message);
    }
    await SecureStore.deleteItemAsync(LAST_EMAIL_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
    router.replace("/Auth/page");
    setLoading(false);
  };

  const markNotificationsAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setUnreadNotifications(0);
    } catch (error: any) {
      console.error("Error marking notifications as read:", error.message);
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