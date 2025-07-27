import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { supabase } from "@/supabaseClient";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as SecureStore from "expo-secure-store";
import MapView, { Marker } from 'react-native-maps';
import { BarChart } from "react-native-chart-kit";

const { width, height } = Dimensions.get("window");

const BIOMETRIC_KEY = "supabase_refresh_token_biometric";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface Child {
  id: string;
  name: string;
  allowance_amount: number | null;
  allowance_frequency: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  location_coords: LocationCoords | null;
  created_at: string;
}

interface ChildDetail extends Child {
  email: string | null;
  expenses: Expense[];
  categorySummary: { [key: string]: number };
}

export default function DependentsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading: authLoading } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [newChildName, setNewChildName] = useState("");
  const [newChildEmail, setNewChildEmail] = useState("");
  const [newChildAllowanceAmount, setNewChildAllowanceAmount] = useState("");
  const [newChildAllowanceFrequency, setNewChildAllowanceFrequency] = useState<
    string | null
  >(null);
  const [fetchingChildren, setFetchingChildren] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null);
  const [showChildDetails, setShowChildDetails] = useState(false);
  const [fetchingChildDetails, setFetchingChildDetails] = useState(false);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (user) {
      fetchChildren();
    } else {
      setFetchingChildren(false);
    }
  }, [user]);

  const fetchChildren = async () => {
    setFetchingChildren(true);
    if (!user) {
      setChildren([]);
      setFetchingChildren(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("children")
        .select("id, name, allowance_amount, allowance_frequency")
        .eq("parent_id", user.id);

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        "Não foi possível carregar os dependentes: " + error.message
      );
    } finally {
      setFetchingChildren(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim() || !newChildEmail.trim()) {
      Alert.alert("Erro", "O nome e o e-mail do dependente são obrigatórios.");
      return;
    }
    if (!user) {
      Alert.alert("Erro", "Você precisa estar logado para adicionar um dependente.");
      return;
    }

    setAddingChild(true);
    let originalSessionData: { access_token: string; refresh_token: string } | null = null;

    try {
      const { data: { session: currentParentSession }, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError || !currentParentSession) {
        throw new Error(getSessionError?.message || "Não foi possível obter a sessão do responsável.");
      }
      originalSessionData = {
        access_token: currentParentSession.access_token,
        refresh_token: currentParentSession.refresh_token,
      };

      const fixedInitialPassword = "123456";

      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: newChildEmail,
        password: fixedInitialPassword,
      });

      if (authError || !userData?.user) {
        throw new Error(authError?.message || "Erro ao criar conta de usuário para o dependente.");
      }
      const childUserId = userData.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: childUserId,
        role: "child",
        email: newChildEmail,
        name: newChildName,
      });
      if (profileError) throw new Error(profileError.message);

      let amountToAdd: number | null = null;
      if (newChildAllowanceAmount.trim()) {
        amountToAdd = parseFloat(newChildAllowanceAmount.replace(",", "."));
      }

      const { data: childData, error: childError } = await supabase
        .from("children")
        .insert({
          id: childUserId,
          parent_id: user.id,
          name: newChildName,
          allowance_amount: amountToAdd,
          allowance_frequency: newChildAllowanceFrequency,
        })
        .select()
        .single();
      if (childError) throw childError;

      setChildren((prev) => [...prev, childData]);
      setNewChildName("");
      setNewChildEmail("");
      setNewChildAllowanceAmount("");
      setNewChildAllowanceFrequency(null);

      Alert.alert(
        "Dependente Adicionado!",
        `A conta de ${newChildName} foi criada. A senha padrão é "123456". O dependente deve alterar a senha no primeiro login.`
      );
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível adicionar o dependente: " + error.message);
    } finally {
      if (originalSessionData) {
        const { error: setSessionError } = await supabase.auth.setSession(originalSessionData);
        if (setSessionError) {
          console.error("Erro ao restaurar a sessão do responsável:", setSessionError.message);
          await supabase.auth.signOut();
        } else {
          const { data: { session: newParentSession } } = await supabase.auth.getSession();
          if (newParentSession?.refresh_token) {
            const isBiometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
            if (isBiometricEnabled) {
              await SecureStore.setItemAsync(BIOMETRIC_KEY, newParentSession.refresh_token);
            }
          }
        }
      }
      setAddingChild(false);
    }
  };
  
  const generateAndShareLoginPdf = async (childName: string | null, childEmail: string | null) => {
    if (!childName || !childEmail) {
      Alert.alert("Erro", "Nome ou e-mail do dependente não disponível para gerar PDF.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Dados de Acesso - Lar Financeiro App</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { font-size: 30px; font-weight: bold; color: #007AFF; margin-bottom: 10px; }
          .app-name { font-size: 20px; color: #555; }
          .details { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          .detail-row { margin-bottom: 10px; }
          .label { font-weight: bold; }
          .instructions { margin-top: 30px; padding: 15px; border: 1px solid #ffcc00; background-color: #fffacd; border-radius: 5px; color: #856404; }
          .security-note { font-size: 14px; font-style: italic; color: #777; margin-top: 15px; text-align: center; }
          .logo-img { width: 80px; height: 80px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.ibb.co/mVS7hpKZ/splash-icon-dark.png" class="logo-img" alt="Lar Financeiro Logo" />
            <div class="logo">Lar Financeiro</div>
            <div class="app-name">Seu aplicativo de finanças familiares</div>
          </div>
          <div class="details">
            <h2 style="text-align: center; color: #007AFF;">Dados de Acesso do Dependente</h2>
            <div class="detail-row"><span class="label">Nome do Dependente:</span> ${childName}</div>
            <div class="detail-row"><span class="label">E-mail de Acesso:</span> ${childEmail}</div>
            <div class="detail-row"><span class="label">Senha de Acesso Padrão:</span> 123456</div>
          </div>
          <div class="instructions">
            <h3>Instruções para o Primeiro Acesso:</h3>
            <p>A conta de ${childName} foi criada com sucesso!</p>
            <p>Para o primeiro acesso à aplicação, o dependente deverá seguir estes passos:</p>
            <ol>
              <li>Na tela de login do aplicativo, insira o e-mail: <strong>${childEmail}</strong>.</li>
              <li>Em seguida, insira a senha: <strong>123456</strong>.</li>
              <li>Clique no botão "Entrar".</li>
              <li>Depois de entrar, o dependente deverá criar uma nova senha segura.</li>
              <li>Após definir a nova senha, o dependente poderá fazer login normalmente com o e-mail e a senha recém-criada.</li>
            </ol>
          </div>
          <p class="security-note">* Por motivos de segurança, você deverá alterar a senha de acesso exibida neste documento. O dependente deve criar a sua própria senha segura após o primeiro acesso.</p>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      if (Platform.OS === "web") {
        window.open(uri, "_blank");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Dados de Acesso - ${childName}`, UTI: "com.adobe.pdf" });
      } else {
        Alert.alert("Erro", "A funcionalidade de partilha de PDF não está disponível neste dispositivo.");
      }
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível gerar ou partilhar o PDF.");
    }
  };

  const fetchChildDetails = async (child: Child) => {
    setFetchingChildDetails(true);
    try {
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("email").eq("id", child.id).single();
      if (profileError && profileError.code !== "PGRST116") throw profileError;
      const childEmail = profileData ? profileData.email : null;

      const { data: expensesData, error: expensesError } = await supabase.from("expenses").select("*").eq("user_id", child.id).order("expense_date", { ascending: false });
      if (expensesError) throw expensesError;

      const categorySummary: { [key: string]: number } = {};
      expensesData?.forEach((expense) => {
        const categoryName = expense.category || "Outros";
        categorySummary[categoryName] = (categorySummary[categoryName] || 0) + expense.amount;
      });

      setSelectedChild({ ...child, email: childEmail, expenses: expensesData || [], categorySummary });
      setShowChildDetails(true);
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar os detalhes do dependente: " + error.message);
    } finally {
      setFetchingChildDetails(false);
    }
  };

  if (authLoading || fetchingChildren) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={{ color: theme.colors.text, marginTop: theme.spacing.m }}>Carregando dependentes...</Text>
      </View>
    );
  }

  if (profile?.role !== "admin" && profile?.role !== "responsible") {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Acesso Negado</Text>
        <Text style={[styles.subtitle, { color: theme.colors.secondary, textAlign: "center" }]}>
          Somente usuários com perfil de responsável podem gerenciar dependentes.
        </Text>
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
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Meus Dependentes</Text>
        <View style={{ width: theme.fontSizes.large }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Adicionar Novo Dependente</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setNewChildName}
          value={newChildName}
          placeholder="Nome do Dependente"
          placeholderTextColor={theme.colors.secondary}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setNewChildEmail}
          value={newChildEmail}
          placeholder="E-mail do Dependente"
          placeholderTextColor={theme.colors.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
          onChangeText={setNewChildAllowanceAmount}
          value={newChildAllowanceAmount}
          placeholder="Valor da mesada (opcional)"
          placeholderTextColor={theme.colors.secondary}
          keyboardType="numeric"
        />
        <View style={styles.frequencyContainer}>
          <Text style={[styles.frequencyLabel, { color: theme.colors.text }]}>Frequência da Mesada (opcional):</Text>
          <View style={styles.frequencyButtons}>
            <TouchableOpacity
              style={[styles.frequencyButton, { backgroundColor: newChildAllowanceFrequency === "Semanal" ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.s }]}
              onPress={() => setNewChildAllowanceFrequency("Semanal")}
            >
              <Text style={[styles.frequencyButtonText, { color: newChildAllowanceFrequency === "Semanal" ? "#fff" : theme.colors.text }]}>Semanal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.frequencyButton, { backgroundColor: newChildAllowanceFrequency === "Mensal" ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.s }]}
              onPress={() => setNewChildAllowanceFrequency("Mensal")}
            >
              <Text style={[styles.frequencyButtonText, { color: newChildAllowanceFrequency === "Mensal" ? "#fff" : theme.colors.text }]}>Mensal</Text>
            </TouchableOpacity>
            {newChildAllowanceFrequency && (
              <TouchableOpacity
                style={[styles.clearFrequencyButton, { borderColor: theme.colors.border, borderRadius: theme.borderRadius.s }]}
                onPress={() => setNewChildAllowanceFrequency(null)}
              >
                <Ionicons name="close-circle-outline" size={theme.fontSizes.medium} color={theme.colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
          onPress={handleAddChild}
          disabled={addingChild}
        >
          {addingChild ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Adicionar Dependente</Text>}
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text, marginTop: height * 0.04 }]}>Dependentes Existentes</Text>
        {children.length === 0 ? (
          <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>Nenhum dependente adicionado ainda.</Text>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}
              onPress={() => fetchChildDetails(child)}
              disabled={fetchingChildDetails}
            >
              <Ionicons name="person-circle-outline" size={theme.fontSizes.xLarge} color={theme.colors.text} style={styles.childIcon} />
              <View style={styles.childDetails}>
                <Text style={[styles.childName, { color: theme.colors.text }]}>{child.name}</Text>
                {child.allowance_amount !== null && (
                  <Text style={[styles.childAllowance, { color: theme.colors.secondary }]}>
                    Mesada: {child.allowance_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} {child.allowance_frequency}
                  </Text>
                )}
              </View>
              {fetchingChildDetails && selectedChild?.id === child.id ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="chevron-forward-outline" size={theme.fontSizes.medium} color={theme.colors.secondary} />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
      <Modal animationType="slide" transparent={false} visible={showChildDetails} onRequestClose={() => setShowChildDetails(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChildDetails(false)}>
              <Ionicons name="arrow-back" size={theme.fontSizes.large} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes de {selectedChild?.name}</Text>
            <TouchableOpacity onPress={() => generateAndShareLoginPdf(selectedChild?.name, selectedChild?.email)}>
              <Ionicons name="document-text-outline" size={theme.fontSizes.large} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedChild && (
              <>
                <Text style={[styles.detailLabel, { color: theme.colors.secondary }]}>Nome:</Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>{selectedChild.name}</Text>
                <Text style={[styles.detailLabel, { color: theme.colors.secondary }]}>Email da Conta:</Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>{selectedChild.email || "N/A"}</Text>
                <Text style={[styles.securityNote, { color: theme.colors.secondary }]}>
                  * A senha padrão é "123456". O dependente deve acessar a conta e definir uma nova senha.
                </Text>
                <Text style={[styles.detailLabel, { color: theme.colors.secondary }]}>Mesada:</Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {selectedChild.allowance_amount !== null ? selectedChild.allowance_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não definida"}
                  {selectedChild.allowance_frequency ? ` (${selectedChild.allowance_frequency})` : ""}
                </Text>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Últimos Gastos</Text>
                {selectedChild.expenses.length === 0 ? (
                  <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>Nenhum gasto registrado.</Text>
                ) : (
                  selectedChild.expenses.map((expense) => (
                    <View key={expense.id} style={[styles.expenseItem, { borderColor: theme.colors.border }]}>
                      <View style={styles.expenseDetails}>
                        <Text style={[styles.expenseDescription, { color: theme.colors.text }]}>{expense.description}</Text>
                        <Text style={[styles.expenseAmount, { color: theme.colors.text }]}>
                          {expense.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Text>
                      </View>
                      <Text style={[styles.expenseCategory, { color: theme.colors.secondary }]}>Categoria: {expense.category || "N/A"}</Text>
                      {expense.location_coords && (
                        <>
                           <MapView
                              ref={mapRef}
                              style={styles.map}
                              initialRegion={{
                                  latitude: expense.location_coords.latitude,
                                  longitude: expense.location_coords.longitude,
                                  latitudeDelta: 0.01,
                                  longitudeDelta: 0.01,
                              }}
                              onMapReady={() => {
                                  mapRef.current?.animateCamera({
                                      pitch: 60,
                                      center: {
                                          latitude: expense.location_coords.latitude,
                                          longitude: expense.location_coords.longitude,
                                      },
                                      zoom: 16
                                  }, { duration: 1500 });
                              }}
                          >
                              <Marker
                                  coordinate={{
                                      latitude: expense.location_coords.latitude,
                                      longitude: expense.location_coords.longitude,
                                  }}
                                  title={expense.description}
                              />
                          </MapView>
                        </>
                      )}
                      <Text style={[styles.expenseDate, { color: theme.colors.secondary }]}>
                        Data: {new Date(expense.expense_date).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                  ))
                )}
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: height * 0.03 }]}>
                  Gastos por Categoria
                </Text>
                {selectedChild && Object.keys(selectedChild.categorySummary).length > 0 ? (
                    <View>
                        <BarChart
                            data={{
                                labels: Object.keys(selectedChild.categorySummary),
                                datasets: [{ data: Object.values(selectedChild.categorySummary) }],
                            }}
                            width={width * 0.9}
                            height={250}
                            yAxisLabel="R$"
                            chartConfig={{
                                backgroundColor: theme.colors.card,
                                backgroundGradientFrom: theme.colors.card,
                                backgroundGradientTo: theme.colors.card,
                                decimalPlaces: 2,
                                color: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                    borderRadius: 16,
                                },
                                propsForBackgroundLines: {
                                    stroke: theme.colors.border,
                                },
                                propsForLabels: {
                                    fontSize: 10,
                                }
                            }}
                            verticalLabelRotation={30}
                            fromZero={true}
                            style={{
                                marginVertical: 8,
                                borderRadius: 16,
                            }}
                        />
                    </View>
                ) : (
                  <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>Nenhum dado de categoria disponível.</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  headerText: {
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    marginBottom: height * 0.01,
    textAlign: "center",
    width: "100%",
  },
  subtitle: {
    fontSize: width * 0.04,
    textAlign: "center",
    marginBottom: height * 0.04,
  },
  input: {
    height: height * 0.06,
    borderWidth: 1,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.04,
    width: "100%",
  },
  button: {
    paddingVertical: height * 0.02,
    alignItems: "center",
    marginBottom: height * 0.025,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  frequencyContainer: {
    width: "100%",
    marginBottom: height * 0.02,
  },
  frequencyLabel: {
    fontSize: width * 0.04,
    marginBottom: height * 0.01,
  },
  frequencyButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: height * 0.015,
    borderWidth: 1,
    alignItems: "center",
    marginHorizontal: width * 0.01,
  },
  frequencyButtonText: {
    fontSize: width * 0.038,
    fontWeight: "bold",
  },
  clearFrequencyButton: {
    padding: width * 0.02,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: width * 0.01,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: width * 0.04,
    borderWidth: 1,
    marginBottom: height * 0.015,
  },
  childIcon: {
    marginRight: width * 0.04,
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  childAllowance: {
    fontSize: width * 0.035,
  },
  modalContainer: {
    flex: 1,
    padding: width * 0.05,
    paddingTop: height * 0.06,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: width * 0.038,
    fontWeight: "bold",
    marginTop: height * 0.015,
  },
  detailText: {
    fontSize: width * 0.045,
    marginBottom: height * 0.01,
  },
  securityNote: {
    fontSize: width * 0.03,
    fontStyle: "italic",
    marginBottom: height * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.055,
    fontWeight: "bold",
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
  },
  expenseItem: {
    paddingVertical: height * 0.015,
    borderBottomWidth: 1,
    marginBottom: height * 0.01,
  },
  expenseDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.005,
  },
  expenseDescription: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    flexShrink: 1,
  },
  expenseAmount: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    marginLeft: width * 0.02,
  },
  expenseCategory: {
    fontSize: width * 0.035,
  },
  expenseLocation: {
    fontSize: width * 0.035,
  },
  expenseDate: {
    fontSize: width * 0.035,
    marginTop: 5,
  },
  chartDataItem: {
    fontSize: width * 0.04,
    marginBottom: height * 0.005,
  },
  map: {
    width: '100%',
    height: height * 0.2,
    borderRadius: 8,
    marginTop: height * 0.01,
    marginBottom: height * 0.01,
  },
});