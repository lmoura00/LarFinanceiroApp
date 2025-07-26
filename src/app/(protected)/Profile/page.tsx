import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext';
import { supabase } from '@/supabaseClient';
import { Redirect, useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [memberSince, setMemberSince] = useState<string>('');

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(sessionError?.message || "Usuário não autenticado.");
        }

    
        const userId = session.user.id;
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, email, role, created_at')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          throw new Error(profileError?.message || "Perfil do usuário não encontrado.");
        }

        setUserName(profile.name || 'Nome do Usuário');
        setUserEmail(profile.email || 'email@exemplo.com');
        setUserRole(profile.role || 'Membro');
        setMemberSince(profile.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'Data Indisponível');

      } catch (error: any) {
        Alert.alert("Erro ao carregar perfil", error.message);
        console.error("Erro ao buscar dados do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    // const { error } = await supabase.auth.signOut();
    // if (error) {
    //   Alert.alert('Erro ao sair', error.message);
    // }
  };
  

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={{ color: theme.colors.text, marginTop: theme.spacing.m }}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Meu Perfil</Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Ionicons name="person-circle-outline" size={width * 0.3} color={theme.colors.primary} style={styles.profileIcon} />

        <Text style={[styles.userName, { color: theme.colors.text }]}>{userName}</Text>
        <Text style={[styles.userEmail, { color: theme.colors.secondary }]}>{userEmail}</Text>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Função:</Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>{userRole}</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Membro desde:</Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>{memberSince}</Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width * 0.05,
    paddingTop: height * 0.06,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  headerText: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: height * 0.025,
  },
  profileIcon: {
    marginBottom: height * 0.025,
  },
  userName: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    marginBottom: height * 0.005,
  },
  userEmail: {
    fontSize: width * 0.04,
    marginBottom: height * 0.04,
  },
  infoCard: {
    width: '100%',
    padding: width * 0.04,
    borderWidth: 1,
    marginBottom: height * 0.015,
  },
  infoTitle: {
    fontSize: width * 0.04,
    fontWeight: 'bold',
    marginBottom: height * 0.005,
  },
  infoText: {
    fontSize: width * 0.035,
  },
  logoutButton: {
    marginTop: height * 0.04,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.06,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: 'bold',
  },
});