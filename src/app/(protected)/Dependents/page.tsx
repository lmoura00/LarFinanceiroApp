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
import { BarChart } from "react-native-chart-kit";

const { width, height } = Dimensions.get("window");

const BIOMETRIC_KEY = "supabase_refresh_token_biometric";

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
  created_at: string;
  type: "income" | "expense";
}

interface ChildDetail extends Child {
  email: string | null;
  expenses: Expense[];
  categorySummary: { [key: string]: number };
}

export default function DependentsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [fetchingChildren, setFetchingChildren] = useState(true);

  const [newChildName, setNewChildName] = useState("");
  const [newChildEmail, setNewChildEmail] = useState("");
  const [newChildAllowanceAmount, setNewChildAllowanceAmount] = useState("");
  const [newChildAllowanceFrequency, setNewChildAllowanceFrequency] = useState<
    string | null
  >(null);
  const [addingChild, setAddingChild] = useState(false);

  const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fetchingChildDetails, setFetchingChildDetails] = useState(false);

  const [editingName, setEditingName] = useState("");
  const [editingAllowanceAmount, setEditingAllowanceAmount] = useState("");
  const [editingAllowanceFrequency, setEditingAllowanceFrequency] = useState<
    string | null
  >("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferComment, setTransferComment] = useState("");

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

  const fetchChildDetails = async (child: Child) => {
    setFetchingChildDetails(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", child.id)
        .single();
      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", child.id)
        .order("expense_date", { ascending: false });
      if (expensesError) throw expensesError;

      const categorySummary: { [key: string]: number } = {};
      expensesData?.forEach((expense) => {
        if (expense.type === "expense") {
          const categoryName = expense.category || "Outros";
          categorySummary[categoryName] =
            (categorySummary[categoryName] || 0) + expense.amount;
        }
      });

      setSelectedChild({
        ...child,
        email: profileData?.email || null,
        expenses: expensesData || [],
        categorySummary,
      });
      setShowDetailsModal(true);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        "Não foi possível carregar os detalhes do dependente: " + error.message
      );
    } finally {
      setFetchingChildDetails(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim() || !newChildEmail.trim()) {
      Alert.alert("Erro", "O nome e o e-mail do dependente são obrigatórios.");
      return;
    }
    if (!user) {
      Alert.alert(
        "Erro",
        "Você precisa estar logado para adicionar um dependente."
      );
      return;
    }
    setAddingChild(true);
    let originalSessionData: any = null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão do responsável não encontrada.");
      originalSessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      };

      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: newChildEmail,
        password: "123456",
      });
      if (authError || !userData?.user)
        throw new Error(
          authError?.message || "Erro ao criar conta para o dependente."
        );

      const childUserId = userData.user.id;
      const { error: profileError } = await supabase.from("profiles").insert({
        id: childUserId,
        role: "child",
        email: newChildEmail,
        name: newChildName,
      });
      if (profileError) throw profileError;

      const amountToAdd = newChildAllowanceAmount.trim()
        ? parseFloat(newChildAllowanceAmount.replace(",", "."))
        : null;
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
        `A conta de ${newChildName} foi criada com a senha padrão "123456".`
      );
    } catch (error: any) {
      Alert.alert("Erro ao Adicionar", error.message);
    } finally {
      await signOut();
      setAddingChild(false);
    }
  };

  const openEditModal = (child: ChildDetail) => {
    setShowDetailsModal(false);
    setSelectedChild(child);
    setEditingName(child.name);
    setEditingAllowanceAmount(
      child.allowance_amount?.toString().replace(".", ",") || ""
    );
    setEditingAllowanceFrequency(child.allowance_frequency || null);
    setShowEditModal(true);
  };

  const handleUpdateChild = async () => {
    if (!selectedChild || !editingName.trim()) {
      Alert.alert("Erro", "O nome não pode ficar em branco.");
      return;
    }
    setIsUpdating(true);
    try {
      const amountToUpdate = editingAllowanceAmount.trim()
        ? parseFloat(editingAllowanceAmount.replace(",", "."))
        : null;

      const { error: childError } = await supabase
        .from("children")
        .update({
          name: editingName,
          allowance_amount: amountToUpdate,
          allowance_frequency: editingAllowanceFrequency,
        })
        .eq("id", selectedChild.id);
      if (childError) throw childError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: editingName })
        .eq("id", selectedChild.id);
      if (profileError) throw profileError;

      Alert.alert("Sucesso", "Dependente atualizado com sucesso!");
      setShowEditModal(false);
      fetchChildren();
    } catch (error: any) {
      Alert.alert("Erro ao Atualizar", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChild = async (child: ChildDetail) => {
    setShowDetailsModal(false);
    Alert.alert(
      "Confirmar Exclusão",
      `Tem certeza que deseja excluir ${child.name}? Esta ação é irreversível e irá apagar a conta e todos os dados associados a ela.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => setShowDetailsModal(true),
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc(
                "delete_user_and_data",
                { user_id_to_delete: child.id }
              );
              if (error) throw error;

              Alert.alert("Sucesso", `${child.name} foi excluído.`);
              fetchChildren();
            } catch (error: any) {
              Alert.alert(
                "Erro ao Excluir",
                "Não foi possível remover o dependente. Tente novamente."
              );
            }
          },
        },
      ]
    );
  };

  const openTransferModal = () => {
    setShowDetailsModal(false);
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!selectedChild) return;

    const amount = parseFloat(transferAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        "Erro",
        "Por favor, insira um valor de transferência válido."
      );
      return;
    }

    setIsTransferring(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: selectedChild.id,
        amount: amount,
        description: transferComment.trim() || "Transferência do responsável",
        category: "Transferência",
        type: "income",
        expense_date: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        "Sucesso!",
        `Você transferiu ${amount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} para ${selectedChild.name}.`
      );

      setShowTransferModal(false);
      setTransferAmount("");
      setTransferComment("");
      fetchChildren();
    } catch (error: any) {
      Alert.alert(
        "Erro na Transferência",
        "Não foi possível completar a operação. " + error.message
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const generateAndShareLoginPdf = async (
    childName: string | null,
    childEmail: string | null
  ) => {
    if (!childName || !childEmail) {
      Alert.alert("Erro", "Dados do dependente indisponíveis para gerar PDF.");
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
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Dados de Acesso - ${childName}`,
      });
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível gerar ou compartilhar o PDF de login."
      );
    }
  };

  const generateAndShareExpensesPdf = async (child: ChildDetail | null) => {
    if (!child) return;
    const expensesHtml = child.expenses
      .map(
        (expense) => `
        <tr>
            <td>${expense.description}</td>
            <td>${expense.category || "N/A"}</td>
            <td>${new Date(expense.expense_date).toLocaleDateString(
              "pt-BR"
            )}</td>
            <td style="text-align: right; color: ${
              expense.type === "income" ? "green" : "red"
            };">
                ${
                  expense.type === "income" ? "+ " : "- "
                }${expense.amount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
            </td>
        </tr>
    `
      )
      .join("");

    const totalExpenses = child.expenses
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = child.expenses
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório de Gastos - ${
      child.name
    }</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}.container{max-width:800px;margin:0 auto;border:1px solid #eee;padding:20px;box-shadow:0 0 10px rgba(0,0,0,.1)}.header{text-align:center;margin-bottom:20px}.logo{font-size:30px;font-weight:700;color:#007aff;margin-bottom:10px}.app-name{font-size:20px;color:#555}h2{text-align:center;color:#007aff}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}.summary{margin-top:20px;padding-top:10px;border-top:2px solid #333;text-align:right}.summary p{font-size:16px;font-weight:700}</style></head><body><div class="container"><div class="header"><div class="logo">Lar Financeiro</div><div class="app-name">Relatório de Transações</div></div><h2>Transações de ${
      child.name
    }</h2><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th style="text-align:right">Valor</th></tr></thead><tbody>${expensesHtml}</tbody></table><div class="summary"><p style="color:red">Total de Despesas: ${totalExpenses.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    )}</p><p style="color:green">Total de Receitas: ${totalIncomes.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    )}</p></div></div></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Relatório de Gastos - ${child.name}`,
      });
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível gerar ou compartilhar o PDF de despesas."
      );
    }
  };

  if (authLoading || fetchingChildren) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons
            name={theme.dark ? "sunny" : "moon"}
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Meus Dependentes
        </Text>
        <View style={{ width: theme.fontSizes.large }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Adicionar Novo Dependente
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            },
          ]}
          onChangeText={setNewChildName}
          value={newChildName}
          placeholder="Nome do Dependente"
          placeholderTextColor={theme.colors.secondary}
        />
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            },
          ]}
          onChangeText={setNewChildEmail}
          value={newChildEmail}
          placeholder="E-mail do Dependente"
          placeholderTextColor={theme.colors.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            },
          ]}
          onChangeText={setNewChildAllowanceAmount}
          value={newChildAllowanceAmount}
          placeholder="Valor da mesada (opcional)"
          placeholderTextColor={theme.colors.secondary}
          keyboardType="numeric"
        />
        <View style={styles.frequencyContainer}>
          <Text style={[styles.frequencyLabel, { color: theme.colors.text }]}>
            Frequência da Mesada (opcional):
          </Text>
          <View style={styles.frequencyButtons}>
            {["Semanal", "Mensal"].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor:
                      newChildAllowanceFrequency === freq
                        ? theme.colors.primary
                        : theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setNewChildAllowanceFrequency(freq)}
              >
                <Text
                  style={{
                    color:
                      newChildAllowanceFrequency === freq
                        ? "#fff"
                        : theme.colors.text,
                  }}
                >
                  {freq}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.clearFrequencyButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setNewChildAllowanceFrequency(null)}
            >
              <Ionicons
                name="close-circle-outline"
                size={24}
                color={theme.colors.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddChild}
          disabled={addingChild}
        >
          {addingChild ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Adicionar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, marginTop: height * 0.04 },
          ]}
        >
          Dependentes
        </Text>
        {children.length === 0 ? (
          <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
            Nenhum dependente adicionado.
          </Text>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => fetchChildDetails(child)}
              disabled={fetchingChildDetails}
            >
              <Ionicons
                name="person-circle-outline"
                size={theme.fontSizes.xLarge}
                color={theme.colors.text}
                style={styles.childIcon}
              />
              <View style={styles.childDetails}>
                <Text style={[styles.childName, { color: theme.colors.text }]}>
                  {child.name}
                </Text>
                {child.allowance_amount !== null && (
                  <Text
                    style={[
                      styles.childAllowance,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Mesada:{" "}
                    {child.allowance_amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    {child.allowance_frequency}
                  </Text>
                )}
              </View>
              {fetchingChildDetails && selectedChild?.id === child.id ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name="chevron-forward-outline"
                  size={theme.fontSizes.medium}
                  color={theme.colors.secondary}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedChild && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showDetailsModal}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons
                  name="arrow-back"
                  size={theme.fontSizes.large}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedChild.name}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => openEditModal(selectedChild)}>
                  <Ionicons
                    name="pencil-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openTransferModal()}
                  style={{ marginLeft: 20 }}
                >
                  <Ionicons
                    name="cash-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteChild(selectedChild)}
                  style={{ marginLeft: 20 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={theme.colors.danger || "red"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    generateAndShareLoginPdf(
                      selectedChild.name,
                      selectedChild.email
                    )
                  }
                  style={{ marginLeft: 20 }}
                >
                  <Ionicons
                    name="share-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => generateAndShareExpensesPdf(selectedChild)}
                  style={{ marginLeft: 20 }}
                >
                  <Ionicons
                    name="download-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: theme.colors.card },
                ]}
              >
                <View style={styles.detailRow}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.detailIcon}
                  />
                  <View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.secondary },
                      ]}
                    >
                      Nome
                    </Text>
                    <Text
                      style={[styles.detailText, { color: theme.colors.text }]}
                    >
                      {selectedChild.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.detailIcon}
                  />
                  <View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.secondary },
                      ]}
                    >
                      Email da Conta
                    </Text>
                    <Text
                      style={[styles.detailText, { color: theme.colors.text }]}
                    >
                      {selectedChild.email || "N/A"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.detailRow, { marginBottom: 0 }]}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.detailIcon}
                  />
                  <View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.secondary },
                      ]}
                    >
                      Mesada
                    </Text>
                    <Text
                      style={[styles.detailText, { color: theme.colors.text }]}
                    >
                      {selectedChild.allowance_amount !== null
                        ? selectedChild.allowance_amount.toLocaleString(
                            "pt-BR",
                            { style: "currency", currency: "BRL" }
                          )
                        : "Não definida"}
                      {selectedChild.allowance_frequency
                        ? ` (${selectedChild.allowance_frequency})`
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: theme.colors.card, marginTop: 20 },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  Últimas Transações
                </Text>
                {selectedChild.expenses.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyMessage,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Nenhuma transação registrada.
                  </Text>
                ) : (
                  selectedChild.expenses.map((expense, index) => (
                    <View
                      key={expense.id}
                      style={[
                        styles.expenseItem,
                        index !== selectedChild.expenses.length - 1 && {
                          borderBottomColor: theme.colors.border,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.expenseDetails}>
                        <Text
                          style={[
                            styles.expenseDescription,
                            { color: theme.colors.text },
                          ]}
                        >
                          {expense.description}
                        </Text>
                        <Text
                          style={[
                            styles.expenseAmount,
                            {
                              color:
                                expense.type === "income"
                                  ? theme.colors.primary
                                  : "red",
                            },
                          ]}
                        >
                          {expense.type === "income" ? "+ " : "- "}
                          {expense.amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.expenseCategory,
                          { color: theme.colors.secondary },
                        ]}
                      >
                        Categoria: {expense.category || "N/A"}
                      </Text>
                    </View>
                  ))
                )}
              </View>
              {Object.keys(selectedChild.categorySummary).length > 0 && (
                <View
                  style={[
                    styles.detailsCard,
                    {
                      backgroundColor: theme.colors.card,
                      marginTop: 20,
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                        alignSelf: "stretch",
                      },
                    ]}
                  >
                    Gastos por Categoria
                  </Text>
                  <BarChart
                    data={{
                      labels: Object.keys(selectedChild.categorySummary),
                      datasets: [
                        { data: Object.values(selectedChild.categorySummary) },
                      ],
                    }}
                    width={width * 0.8}
                    height={250}
                    yAxisLabel="R$"
                    chartConfig={{
                      backgroundColor: theme.colors.card,
                      backgroundGradientFrom: theme.colors.card,
                      backgroundGradientTo: theme.colors.card,
                      decimalPlaces: 2,
                      color: (opacity = 1) =>
                        theme.dark
                          ? `rgba(255, 255, 255, ${opacity})`
                          : `rgba(0, 0, 0, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        theme.dark
                          ? `rgba(255, 255, 255, ${opacity})`
                          : `rgba(0, 0, 0, ${opacity})`,
                      propsForBackgroundLines: { stroke: theme.colors.border },
                    }}
                    verticalLabelRotation={30}
                    fromZero={true}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {selectedChild && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showEditModal}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons
                  name="close"
                  size={theme.fontSizes.large}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Editar {selectedChild.name}
              </Text>
              <View style={{ width: theme.fontSizes.large }} />
            </View>
            <View style={[styles.content, { paddingHorizontal: width * 0.05 }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                onChangeText={setEditingName}
                value={editingName}
                placeholder="Nome do Dependente"
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                onChangeText={setEditingAllowanceAmount}
                value={editingAllowanceAmount}
                placeholder="Valor da Mesada (opcional)"
                keyboardType="numeric"
              />
              <View style={styles.frequencyContainer}>
                <Text
                  style={[styles.frequencyLabel, { color: theme.colors.text }]}
                >
                  Frequência da Mesada:
                </Text>
                <View style={styles.frequencyButtons}>
                  {["Semanal", "Mensal"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        {
                          backgroundColor:
                            editingAllowanceFrequency === freq
                              ? theme.colors.primary
                              : theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setEditingAllowanceFrequency(freq)}
                    >
                      <Text
                        style={{
                          color:
                            editingAllowanceFrequency === freq
                              ? "#fff"
                              : theme.colors.text,
                        }}
                      >
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.clearFrequencyButton,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setEditingAllowanceFrequency(null)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={24}
                      color={theme.colors.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary, marginTop: 20 },
                ]}
                onPress={handleUpdateChild}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Salvar Alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {selectedChild && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showTransferModal}
          onRequestClose={() => setShowTransferModal(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons
                  name="close"
                  size={theme.fontSizes.large}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Transferir para {selectedChild.name}
              </Text>
              <View style={{ width: theme.fontSizes.large }} />
            </View>
            <View style={[styles.content, { paddingHorizontal: width * 0.05 }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                onChangeText={setTransferAmount}
                value={transferAmount}
                placeholder="Valor da Transferência (Ex: 50,00)"
                placeholderTextColor={theme.colors.secondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                onChangeText={setTransferComment}
                value={transferComment}
                placeholder="Comentário (opcional)"
                placeholderTextColor={theme.colors.secondary}
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary, marginTop: 20 },
                ]}
                onPress={handleTransfer}
                disabled={isTransferring}
              >
                {isTransferring ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Confirmar Transferência</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: width * 0.05,
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
    paddingTop: height * 0.06,
    marginBottom: height * 0.025,
  },
  headerText: {
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  content: {
    alignItems: "center",
    paddingBottom: height * 0.05,
    width: "100%",
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    marginBottom: height * 0.02,
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: width * 0.04,
    textAlign: "center",
    marginBottom: height * 0.02,
  },
  input: {
    height: height * 0.065,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.04,
    width: "100%",
  },
  button: {
    paddingVertical: height * 0.02,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: width * 0.04,
    marginBottom: height * 0.015,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    paddingTop: height * 0.06,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.05,
    marginBottom: height * 0.03,
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalContent: {
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.05,
  },
  detailsCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  detailIcon: {
    marginRight: 15,
  },
  detailLabel: {
    fontSize: width * 0.035,
  },
  detailText: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: height * 0.015,
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  expenseItem: {
    paddingVertical: height * 0.015,
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
  emptyMessage: {
    fontSize: width * 0.04,
    textAlign: "center",
    marginVertical: 20,
  },
  frequencyContainer: {
    width: "100%",
    marginBottom: height * 0.02,
  },
  frequencyLabel: {
    fontSize: width * 0.04,
    marginBottom: height * 0.01,
    alignSelf: "flex-start",
  },
  frequencyButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  clearFrequencyButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
});
