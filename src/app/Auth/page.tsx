import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/Hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/Hooks/AuthContext';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp, loading, session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace('/(protected)/Dashboard/page');
    }
  }, [session]); 

  async function handleSignIn(): Promise<void> {
    const { success, error } = await signIn(email, password);
    if (!success) {
      Alert.alert('Erro no Login', error || 'Ocorreu um erro desconhecido.');
    }
  }

  async function handleSignUp(): Promise<void> {
    const { success, error } = await signUp(email, password, name);
    if (!success) {
      Alert.alert('Erro no Cadastro', error || 'Ocorreu um erro desconhecido.');
    } else {
        setIsLoginView(true);
    }
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.themeToggleContainer}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      {
        theme.dark ? (
          <Image source={require('../../../assets/images/splash-icon-dark.png')} style={styles.logo} />
        ) : (
          <Image source={require('../../../assets/images/splash-icon-light.png')} style={styles.logo} />
        )
      }
      

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
        onPress={isLoginView ? handleSignIn : handleSignUp}
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
  logo:{
    width: width * 0.3,
    height: width * 0.3,
    alignSelf: 'center',
    marginBottom: height * 0.04,
  }
});