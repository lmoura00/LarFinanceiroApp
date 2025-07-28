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

const { width, height } = Dimensions.get("window");

const LAST_EMAIL_KEY = "last_logged_in_email";
const getBiometricKey = (email: string) => `supabase_refresh_token_biometric_${email}`;

export default function AuthScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometricEnrolled, setHasBiometricEnrolled] = useState(false);
  const [isBiometricEnabledForApp, setIsBiometricEnabledForApp] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp, loading, session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace("/(protected)/Dashboard/page");
    }
  }, [session]);

  useEffect(() => {
    initializeAuthScreen();
  }, []);
  
  const initializeAuthScreen = async () => {
    const lastUserEmail = await SecureStore.getItemAsync(LAST_EMAIL_KEY);
    setLastEmail(lastUserEmail);

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    
    setIsBiometricSupported(compatible);
    setHasBiometricEnrolled(enrolled);

    if (compatible && enrolled && lastUserEmail) {
      const biometricToken = await SecureStore.getItemAsync(getBiometricKey(lastUserEmail));
      setIsBiometricEnabledForApp(!!biometricToken);
    }
  };

  const handleSignInSuccess = async (refreshToken: string, userEmail: string) => {
    if (
      isBiometricSupported &&
      hasBiometricEnrolled
    ) {
      const currentToken = await SecureStore.getItemAsync(getBiometricKey(userEmail));
      if (!currentToken) {
        Alert.alert(
          "Login Biométrico",
          "Deseja habilitar o login rápido por biometria para futuras entradas?",
          [
            { text: "Não", style: "cancel" },
            {
              text: "Sim",
              onPress: () => enableBiometricsForApp(refreshToken, userEmail),
            },
          ],
          { cancelable: false }
        );
      }
    }
  };

  const enableBiometricsForApp = async (refreshToken: string, userEmail: string) => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para habilitar login biométrico",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        await SecureStore.setItemAsync(getBiometricKey(userEmail), refreshToken);
        setIsBiometricEnabledForApp(true);
        Alert.alert("Sucesso", "Login biométrico habilitado!");
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
    if (!lastEmail) {
      Alert.alert("Erro", "Nenhum usuário recente encontrado para login biométrico.");
      return;
    }
    
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para fazer login",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        const refreshToken = await SecureStore.getItemAsync(getBiometricKey(lastEmail));
        if (refreshToken) {
          Alert.alert(
            "Login",
            "Autenticação biométrica bem-sucedida. A entrar..."
          );
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (error) throw error;

          if (!data.session) {
             Alert.alert(
              "Erro",
              "Token de sessão inválido. Por favor, faça login com e-mail e senha."
            );
            await SecureStore.deleteItemAsync(getBiometricKey(lastEmail));
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
      Alert.alert("Erro", "Ocorreu um erro ao tentar o login biométrico: " + error.message);
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
        handleSignInSuccess(session.refresh_token, email);
      }
    }
  }

  async function handleSignUp(): Promise<void> {
    const { success, error } = await signUp(email, password, name);
    if (!success) {
      Alert.alert("Erro no Cadastro", error || "Ocorreu um erro desconhecido.");
    } else {
      Alert.alert("Sucesso", "Conta criada com sucesso! Faça o login para continuar.");
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
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://192.168.100.4:8081'
    });

    if (error) {
      console.error("Erro ao enviar e-mail de recuperação:", error.message);
      Alert.alert("Erro na Recuperação", error.message);
    } else {
      Alert.alert(
        "Verifique seu E-mail",
        "Um e-mail de recuperação de senha foi enviado. Por favor, verifique sua caixa de entrada e spam."
      );
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

        {isLoginView &&
          !showPasswordRecovery &&
          isBiometricSupported &&
          hasBiometricEnrolled &&
          isBiometricEnabledForApp && (
            <TouchableOpacity
              style={[
                styles.biometricButton,
                {
                  backgroundColor: theme.colors.primary,
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
    fontWeight: 'bold',
    marginBottom: height * 0.05,
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    marginBottom: height * 0.03,
    shadowColor: '#000',
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