import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext';
import { supabase } from '@/supabaseClient';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erro ao sair', error.message);
    } else {
      router.replace('/Auth/page');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Meu Perfil</Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Ionicons name="person-circle-outline" size={120} color={theme.colors.primary} style={styles.profileIcon} />
        
        <Text style={[styles.userName, { color: theme.colors.text }]}>Nome do Usuário</Text>
        <Text style={[styles.userEmail, { color: theme.colors.secondary }]}>email@exemplo.com</Text>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Função:</Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>Administrador</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Membro desde:</Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>2024-01-01</Text>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.colors.primary }]}
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
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileIcon: {
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 30,
  },
  infoCard: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});