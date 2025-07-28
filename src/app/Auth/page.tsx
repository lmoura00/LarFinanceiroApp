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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/Hooks/AuthContext";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";

const { width, height } = Dimensions.get("window");

const LAST_EMAIL_KEY = "last_logged_in_email";
const getBiometricKey = (email: string) =>
  `supabase_refresh_token_biometric_${email}`;

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
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricData, setBiometricData] = useState<{
    refreshToken: string;
    userEmail: string;
  } | null>(null);

  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp, loading, session, profile } = useAuth();

  useEffect(() => {
    if (session && profile) {
      const timer = setTimeout(() => {
        router.replace("/(protected)/Dashboard/page");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, profile]);

  useEffect(() => {
    initializeAuthScreen();
  }, []);

  useEffect(() => {
    if (showBiometricPrompt && biometricData) {
      Alert.alert(
        "Login Biométrico",
        "Deseja habilitar o login rápido por biometria para futuras entradas?",
        [
          {
            text: "Não",
            style: "cancel",
            onPress: () => {
              setShowBiometricPrompt(false);
              setBiometricData(null);
            },
          },
          {
            text: "Sim",
            onPress: () => {
              enableBiometricsForApp(
                biometricData.refreshToken,
                biometricData.userEmail
              );
              setShowBiometricPrompt(false);
              setBiometricData(null);
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [showBiometricPrompt, biometricData]);

  const initializeAuthScreen = async () => {
    const lastUserEmail = await SecureStore.getItemAsync(LAST_EMAIL_KEY);
    setLastEmail(lastUserEmail);

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    setIsBiometricSupported(compatible);
    setHasBiometricEnrolled(enrolled);

    if (compatible && enrolled && lastUserEmail) {
      const biometricToken = await SecureStore.getItemAsync(
        getBiometricKey(lastUserEmail)
      );
      setIsBiometricEnabledForApp(!!biometricToken);
    }
  };

  const handleSignInSuccess = async (
    refreshToken: string,
    userEmail: string
  ) => {
    if (isBiometricSupported && hasBiometricEnrolled) {
      const currentToken = await SecureStore.getItemAsync(
        getBiometricKey(userEmail)
      );
      if (!currentToken) {
        setBiometricData({ refreshToken, userEmail });
        setShowBiometricPrompt(true);
      }
    }
  };

  const enableBiometricsForApp = async (
    refreshToken: string,
    userEmail: string
  ) => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para habilitar login biométrico",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        await SecureStore.setItemAsync(
          getBiometricKey(userEmail),
          refreshToken
        );
        setIsBiometricEnabledForApp(true);
      }
    } catch (error) {
      console.error("Erro ao habilitar biometria:", error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!lastEmail) return;

    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para fazer login",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        const refreshToken = await SecureStore.getItemAsync(
          getBiometricKey(lastEmail)
        );
        if (refreshToken) {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (error) throw error;
          if (!data.session) {
            await SecureStore.deleteItemAsync(getBiometricKey(lastEmail));
            setIsBiometricEnabledForApp(false);
          }
        }
      }
    } catch (error) {
      await SecureStore.deleteItemAsync(getBiometricKey(lastEmail));
      setIsBiometricEnabledForApp(false);
    }
  };

  async function handleSignIn(): Promise<void> {
    const { success, error, session } = await signIn(email, password);
    if (!success || !session) {
      Alert.alert("Erro no Login", error || "Ocorreu um erro desconhecido.");
    } else {
      await SecureStore.setItemAsync(LAST_EMAIL_KEY, email);
      setLastEmail(email);
      if (session.refresh_token) {
        await handleSignInSuccess(session.refresh_token, email);
      }
    }
  }

  async function handleSignUp(): Promise<void> {
    const { success, error, session } = await signUp(email, password, name);
    if (!success) {
      Alert.alert("Erro no Cadastro", error || "Ocorreu um erro desconhecido.");
    } else {
      if (session && session.refresh_token) {
        await SecureStore.setItemAsync(LAST_EMAIL_KEY, email);
        setLastEmail(email);
        handleSignInSuccess(session.refresh_token, email);
      } else {
        setIsLoginView(true);
      }
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

    const redirectUrl = Linking.createURL("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      Alert.alert("Erro na Recuperação", error.message);
    } else {
      setShowPasswordRecovery(false);
    }
  }

  if (session) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled={Platform.OS === "ios"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
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

        {/* {isLoginView &&
          !showPasswordRecovery &&
          isBiometricSupported &&
          hasBiometricEnrolled && (
            <TouchableOpacity
              style={[
                styles.biometricButton,
                {
                  backgroundColor: isBiometricEnabledForApp
                    ? theme.colors.primary
                    : theme.colors.secondary,
                  borderRadius: theme.borderRadius.m,
                },
              ]}
              onPress={
                isBiometricEnabledForApp
                  ? handleBiometricLogin
                  : () =>
                      Alert.alert(
                        "Biometria disponível",
                        "Habilite o login biométrico após fazer login com e-mail e senha."
                      )
              }
              disabled={loading}
            >
              <Ionicons
                name="finger-print-outline"
                size={theme.fontSizes.large}
                color="#fff"
              />
              <Text style={[styles.buttonText, { marginLeft: width * 0.02 }]}>
                {isBiometricEnabledForApp
                  ? "Login com Biometria"
                  : "Habilitar Biometria"}
              </Text>
            </TouchableOpacity>
          )} */}

        {!showPasswordRecovery && (
          <TouchableOpacity onPress={() => setIsLoginView(!isLoginView)}>
            <Text
              style={[styles.switchText, { color: theme.colors.secondary }]}
            >
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: width * 0.08,
  },
  themeToggleContainer: {
    position: "absolute",
    top: height * 0.06,
    right: width * 0.05,
    zIndex: 1,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: "bold",
    marginBottom: height * 0.05,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: height * 0.03,
  },
  input: {
    height: height * 0.07,
    borderWidth: 1.5,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.05,
    fontSize: width * 0.04,
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    paddingVertical: height * 0.02,
    alignItems: "center",
    marginBottom: height * 0.03,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
