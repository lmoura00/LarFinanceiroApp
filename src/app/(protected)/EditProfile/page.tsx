// src/app/(protected)/EditProfile/page.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Dimensions, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { supabase } from '@/supabaseClient';

const { width, height } = Dimensions.get('window');

export default function EditProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState<string>(profile?.name || '');
  const [email, setEmail] = useState<string>(profile?.email || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) {
      Alert.alert('Erro', 'Utilizador não autenticado ou perfil não carregado.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode ser vazio.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message || 'Erro ao atualizar o nome do perfil.');
      }

      if (email.trim() !== profile.email) {
        const { error: emailUpdateError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (emailUpdateError) {
          throw new Error(emailUpdateError.message || 'Erro ao atualizar o e-mail.');
        }
        Alert.alert('Sucesso', 'E-mail atualizado! Por favor, verifique o seu novo e-mail para confirmá-lo.');
      }

      Alert.alert('Sucesso', 'Perfil atualizado!');

    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error.message);
      Alert.alert('Erro na Atualização', error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      Alert.alert('Erro', 'Utilizador não autenticado.');
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Erro', 'Por favor, preencha a nova palavra-passe e a confirmação.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'A nova palavra-passe e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao alterar a palavra-passe.');
      }

      Alert.alert('Sucesso', 'Palavra-passe alterada com sucesso!');
      setNewPassword('');
      setConfirmNewPassword('');
      router.back();

    } catch (error: any) {
      console.error('Erro ao alterar palavra-passe:', error.message);
      Alert.alert('Erro na Alteração de Palavra-Passe', error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={{ color: theme.colors.text, marginTop: theme.spacing.m }}>A carregar perfil para edição...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Editar Perfil</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Ionicons name="person-circle-outline" size={width * 0.3} color={theme.colors.primary} style={styles.profileIcon} />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Informações do Perfil</Text>
        <Text style={[styles.label, { color: theme.colors.text }]}>Nome:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setName}
          value={name}
          placeholder="O seu nome"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>E-mail:</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setEmail}
          value={email}
          placeholder="O seu e-mail"
          placeholderTextColor={theme.colors.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
          onPress={handleUpdateProfile}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar Informações</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: height * 0.04 }]}>Alterar Palavra-Passe</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setNewPassword}
          value={newPassword}
          secureTextEntry={true}
          placeholder="Nova Palavra-Passe"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setConfirmNewPassword}
          value={confirmNewPassword}
          secureTextEntry={true}
          placeholder="Confirmar Nova Palavra-Passe"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.button1, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
          onPress={handleChangePassword}
          disabled={isChangingPassword}
        >
          {isChangingPassword ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Alterar Palavra-Passe</Text>
          )}
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
  sectionTitle: {
    fontSize: width * 0.055,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: height * 0.02,
    marginTop: height * 0.02,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: height * 0.01,
  },
  input: {
    height: height * 0.06,
    borderWidth: 1,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.04,
    width: '100%',
  },
  button: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    marginTop: height * 0.02,
    width: '100%',

  },
  button1: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    marginTop: height * 0.02,
    width: '100%',
    marginBottom: 55,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
});