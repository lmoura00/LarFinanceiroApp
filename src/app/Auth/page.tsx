import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/supabaseClient';
import { AuthResponse } from '@supabase/supabase-js';
import { useTheme } from '@/Hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
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

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: 'admin', email: user.email, name: name });

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
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {isLoginView ? 'Bem-vindo(a) de volta!' : 'Criar sua conta'}
      </Text>
      <View style={styles.inputContainer}>
        {!isLoginView && (
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="Nome Completo"
            placeholderTextColor={theme.colors.secondary}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="E-mail"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Senha"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
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
    padding: width * 0.06,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: height * 0.06,
    right: width * 0.05,
    zIndex: 1,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginBottom: height * 0.04,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: height * 0.025,
  },
  input: {
    height: height * 0.06,
    borderWidth: 1,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.04,
  },
  button: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
  loading: {
    marginTop: height * 0.025,
  },
  switchText: {
    textAlign: 'center',
    marginTop: height * 0.025,
    fontSize: width * 0.038,
  },
});