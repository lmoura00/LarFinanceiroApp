import React, { useState, useEffect } from "react";
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/Hooks/AuthContext";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const { width, height } = Dimensions.get("window");

const BIOMETRIC_KEY = "supabase_refresh_token_biometric";

export default function AuthScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometricEnrolled, setHasBiometricEnrolled] = useState(false);
  const [isBiometricEnabledForApp, setIsBiometricEnabledForApp] =
    useState(false);

  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp, loading, session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace("/(protected)/Dashboard/page");
    }
  }, [session]);

  useEffect(() => {
    checkBiometricsAvailability();
  }, []);

  const checkBiometricsAvailability = async () => {
    const compatible = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const storedToken = await SecureStore.getItemAsync(BIOMETRIC_KEY);

    console.log("Biometria - Compatível:", compatible);
    console.log("Biometria - Cadastrada no Dispositivo:", enrolled);
    console.log("Biometria - Habilitada no App (token salvo):", !!storedToken);

    setIsBiometricSupported(Boolean(compatible));
    setHasBiometricEnrolled(enrolled);
    setIsBiometricEnabledForApp(!!storedToken);
  };

  const handleSignInSuccess = async (
    userEmail: string,
    userPassword: string
  ) => {
    if (
      isBiometricSupported &&
      hasBiometricEnrolled &&
      !isBiometricEnabledForApp
    ) {
      Alert.alert(
        "Login Biométrico",
        "Deseja habilitar o login rápido por biometria para futuras entradas?",
        [
          { text: "Não", style: "cancel" },
          {
            text: "Sim",
            onPress: () => enableBiometricsForApp(userEmail, userPassword),
          },
        ],
        { cancelable: false }
      );
    }
  };

  const enableBiometricsForApp = async (
    userEmail: string,
    userPassword: string
  ) => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para habilitar login biométrico",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        const { data } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: userPassword,
        });
        if (data.session?.refresh_token) {
          await SecureStore.setItemAsync(
            BIOMETRIC_KEY,
            data.session.refresh_token
          );
          setIsBiometricEnabledForApp(true);
          Alert.alert("Sucesso", "Login biométrico habilitado!");
        } else {
          Alert.alert(
            "Erro",
            "Não foi possível obter o token de sessão para login biométrico."
          );
        }
      } else {
        Alert.alert(
          "Falha",
          "Autenticação biométrica falhou ou foi cancelada."
        );
      }
    } catch (error: any) {
      console.error("Erro ao habilitar biometria:", error.message);
      Alert.alert("Erro", "Ocorreu um erro ao tentar habilitar a biometria.");
    }
  };

  const handleBiometricLogin = async () => {
    if (
      !isBiometricSupported ||
      !hasBiometricEnrolled ||
      !isBiometricEnabledForApp
    ) {
      Alert.alert(
        "Erro",
        "Login biométrico não configurado ou não disponível."
      );
      return;
    }

    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para fazer login",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        const refreshToken = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        if (refreshToken) {
          Alert.alert(
            "Login",
            "Autenticação biométrica bem-sucedida. A entrar..."
          );
          const { data, error } = await supabase.auth.setSession({
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
          if (data.session) {
            Alert.alert("Sucesso", "Login com biometria realizado!");
          } else {
            Alert.alert(
              "Erro",
              "Token de sessão inválido. Por favor, faça login com e-mail e senha."
            );
            await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
            setIsBiometricEnabledForApp(false);
          }
        } else {
          Alert.alert(
            "Erro",
            "Token de sessão não encontrado. Por favor, faça login com e-mail e senha."
          );
          setIsBiometricEnabledForApp(false);
        }
      } else {
        Alert.alert(
          "Falha",
          "Autenticação biométrica falhou ou foi cancelada."
        );
      }
    } catch (error: any) {
      console.error("Erro no login biométrico:", error.message);
      Alert.alert("Erro", "Ocorreu um erro ao tentar o login biométrico.");
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      setIsBiometricEnabledForApp(false);
    }
  };

  async function handleSignIn(): Promise<void> {
    const { success, error } = await signIn(email, password);
    if (!success) {
      Alert.alert("Erro no Login", error || "Ocorreu um erro desconhecido.");
    } else {
      handleSignInSuccess(email, password);
    }
  }

  async function handleSignUp(): Promise<void> {
    const { success, error } = await signUp(email, password, name);
    if (!success) {
      Alert.alert("Erro no Cadastro", error || "Ocorreu um erro desconhecido.");
    } else {
      setIsLoginView(true);
    }
  }

  async function handlePasswordRecovery(): Promise<void> {
    if (!email.trim()) {
      Alert.alert(
        "Erro",
        "Por favor, insira seu e-mail para recuperar a senha."
      );
      return;
    }
    Alert.alert(
      "Recuperação de Senha",
      "Um e-mail de recuperação de senha será enviado se o endereço estiver registado. Verifique a sua caixa de entrada."
    );
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error("Erro ao enviar e-mail de recuperação:", error.message);
      Alert.alert("Erro na Recuperação", error.message);
    } else {
      Alert.alert(
        "Sucesso",
        "Um e-mail de recuperação de senha foi enviado. Por favor, verifique a sua caixa de entrada."
      );
      setShowPasswordRecovery(false);
      setEmail("");
    }
  }

  if (session) {
    return null;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.themeToggleContainer}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons
            name={theme.dark ? "sunny" : "moon"}
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>
      {theme.dark ? (
        <Image
          source={require("../../../assets/images/splash-icon-dark.png")}
          style={styles.logo}
        />
      ) : (
        <Image
          source={require("../../../assets/images/splash-icon-light.png")}
          style={styles.logo}
        />
      )}

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {showPasswordRecovery
          ? "Recuperar Senha"
          : isLoginView
          ? "Bem-vindo(a) de volta!"
          : "Criar sua conta"}
      </Text>
      <View style={styles.inputContainer}>
        {!isLoginView && !showPasswordRecovery && (
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderRadius: theme.borderRadius.m,
              },
            ]}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="Nome Completo"
            placeholderTextColor={theme.colors.secondary}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderRadius: theme.borderRadius.m,
            },
          ]}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="E-mail"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {!showPasswordRecovery && (
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderRadius: theme.borderRadius.m,
              },
            ]}
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="Senha"
            placeholderTextColor={theme.colors.secondary}
            autoCapitalize="none"
          />
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.m,
          },
        ]}
        onPress={
          showPasswordRecovery
            ? handlePasswordRecovery
            : isLoginView
            ? handleSignIn
            : handleSignUp
        }
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {showPasswordRecovery
            ? "Enviar Link de Recuperação"
            : isLoginView
            ? "Entrar"
            : "Cadastrar"}
        </Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          size="large"
          color={theme.colors.text}
          style={styles.loading}
        />
      )}

      {isLoginView &&
        !showPasswordRecovery &&
        isBiometricSupported &&
        hasBiometricEnrolled &&
        isBiometricEnabledForApp && (
          <TouchableOpacity
            style={[
              styles.biometricButton,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.borderRadius.m,
              },
            ]}
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Ionicons
              name="finger-print-outline"
              size={theme.fontSizes.large}
              color="#fff"
            />
            <Text style={[styles.buttonText, { marginLeft: width * 0.02 }]}>
              Login com Biometria
            </Text>
          </TouchableOpacity>
        )}

      {!showPasswordRecovery && (
        <TouchableOpacity onPress={() => setIsLoginView(!isLoginView)}>
          <Text style={[styles.switchText, { color: theme.colors.secondary }]}>
            {isLoginView
              ? "Não tem uma conta? Cadastre-se"
              : "Já tem uma conta? Faça login"}
          </Text>
        </TouchableOpacity>
      )}

      {isLoginView && !showPasswordRecovery && (
        <TouchableOpacity onPress={() => setShowPasswordRecovery(true)}>
          <Text
            style={[
              styles.switchText,
              { color: theme.colors.secondary, marginTop: height * 0.01 },
            ]}
          >
            Esqueceu a senha?
          </Text>
        </TouchableOpacity>
      )}

      {showPasswordRecovery && (
        <TouchableOpacity onPress={() => setShowPasswordRecovery(false)}>
          <Text
            style={[
              styles.switchText,
              { color: theme.colors.secondary, marginTop: height * 0.01 },
            ]}
          >
            Voltar para o Login
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: width * 0.06,
  },
  themeToggleContainer: {
    position: "absolute",
    top: height * 0.06,
    right: width * 0.05,
    zIndex: 1,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    marginBottom: height * 0.04,
    textAlign: "center",
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
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  buttonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  loading: {
    marginTop: height * 0.025,
  },
  switchText: {
    textAlign: "center",
    marginTop: height * 0.025,
    fontSize: width * 0.038,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    alignSelf: "center",
    marginBottom: height * 0.04,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    marginBottom: height * 0.025,
  },
});
