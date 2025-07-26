import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/supabaseClient';
import { AuthResponse } from '@supabase/supabase-js';
import { useTheme } from '@/Hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>(''); // Add state for name
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function signInWithEmail(): Promise<void> {
    setLoading(true);
    const { error }: AuthResponse = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erro no Login', error.message);
    } else {
      router.replace('/(protected)/Dashboard/page');
    }
    setLoading(false);
  }

  async function signUpWithEmail(): Promise<void> {
    setLoading(true);
    const { data: { user }, error: authError }: AuthResponse = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError || !user) {
      Alert.alert('Erro no Cadastro', authError?.message || 'Erro ao registrar usuário.');
      setLoading(false);
      return;
    }

    // Insert user profile with the new 'name' field
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: 'admin', email: user.email, name: name }); // Include 'name' here

    if (profileError) {
      Alert.alert('Erro no Cadastro', 'Ocorreu um erro ao criar seu perfil. Por favor, tente novamente.');
    } else {
      Alert.alert(
        'Verifique seu e-mail',
        'Seu cadastro foi realizado. Por favor, confirme seu e-mail para continuar.'
      );
      setIsLoginView(true);
    }

    setLoading(false);
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      <View style={styles.themeToggleContainer}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {isLoginView ? 'Bem-vindo(a) de volta!' : 'Criar sua conta'}
      </Text>
      <View style={styles.inputContainer}>
        {/* Add TextInput for Name in Sign Up View */}
        {!isLoginView && (
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text }]}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="Nome Completo"
            placeholderTextColor={theme.colors.secondary}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text }]}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="E-mail"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text }]}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Senha"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={isLoginView ? signInWithEmail : signUpWithEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {isLoginView ? 'Entrar' : 'Cadastrar'}
        </Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator size="large" color={theme.colors.text} style={styles.loading} />
      )}
      
      <TouchableOpacity onPress={() => setIsLoginView(!isLoginView)}>
        <Text style={[styles.switchText, { color: theme.colors.secondary }]}>
          {isLoginView
            ? 'Não tem uma conta? Cadastre-se'
            : 'Já tem uma conta? Faça login'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loading: {
    marginTop: 20,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 20,
  },
});