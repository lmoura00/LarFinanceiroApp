import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { supabase } from '@/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { useRouter, Redirect } from 'expo-router';

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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);

      if (session) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };

    
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        if (session) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    fetchSessionAndProfile();

    return () => {
      
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, role, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      setProfile(data as UserProfile);
    } catch (error: any) {
      console.error('Erro ao buscar perfil do usuário:', error.message);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
    setLoading(false);
    return { success: true };
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError || !user) {
      setLoading(false);
      return { success: false, error: authError?.message || 'Erro ao registrar usuário.' };
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: 'admin', email: user.email, name: name });

    if (profileError) {
      setLoading(false);
      return { success: false, error: profileError.message || 'Ocorreu um erro ao criar seu perfil.' };
    }

    Alert.alert('Verifique seu e-mail', 'Seu cadastro foi realizado. Por favor, confirme seu e-mail para continuar.');
    setLoading(false);
    return { success: true };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erro ao sair', error.message);
    } else {
      setSession(null);
      setUser(null);
      setProfile(null);
      router.replace('/Auth/page');
    }
    setLoading(false);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};