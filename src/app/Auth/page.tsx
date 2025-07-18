import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, Button, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/supabaseClient';
import { AuthResponse } from '@supabase/supabase-js';

export default function AuthPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const router = useRouter();

  async function signInWithEmail(): Promise<void> {
    setLoading(true);
    const { error }: AuthResponse = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      router.replace('/Auth/page');
    }
    setLoading(false);
  }

  async function signUpWithEmail(): Promise<void> {
    setLoading(true);
    const { data: { session }, error }: AuthResponse = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
    }
    
    if (session) {
      Alert.alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
      // Redireciona para a tela de login após o cadastro
      setIsLoginView(true);
    } else if (error) {
        Alert.alert(error.message);
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLoginView ? 'Entrar' : 'Cadastre-se'}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="E-mail"
          autoCapitalize={'none'}
        />
        <TextInput
          style={styles.input}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Senha"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.buttonContainer}>
        {isLoginView ? (
          <Button
            title="Entrar"
            onPress={() => signInWithEmail()}
            disabled={loading}
          />
        ) : (
          <Button
            title="Cadastrar"
            onPress={() => signUpWithEmail()}
            disabled={loading}
          />
        )}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
      </View>
      <Text
        style={styles.switchText}
        onPress={() => setIsLoginView(!isLoginView)}
      >
        {isLoginView
          ? 'Não tem uma conta? Cadastre-se'
          : 'Já tem uma conta? Entrar'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  switchText: {
    color: 'blue',
    textAlign: 'center',
  },
});