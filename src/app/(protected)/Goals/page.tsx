import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { useFocusEffect } from "expo-router";
import { Picker } from "@react-native-picker/picker";

// --- Interfaces ---
interface Goal {
  id: string;
  child_id: string;
  parent_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  status: string;
  is_approved: boolean;
}

interface Child {
  id: string;
  name: string;
}

// --- Dimensions & Components ---
const { width, height } = Dimensions.get("window");

const ProgressBar = ({
  current,
  target,
  color,
  isCompleted,
}: {
  current: number;
  target: number;
  color: string;
  isCompleted?: boolean;
}) => {
  const progress = target > 0 ? (current / target) * 100 : 0;
  const progressWidth = progress > 100 ? 100 : progress;
  const barColor = isCompleted ? "#2ecc71" : color;

  return (
    <View style={styles.progressBarBackground}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${progressWidth}%`, backgroundColor: barColor },
        ]}
      />
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );
};

export default function GoalsScreen() {
  const [approvedGoals, setApprovedGoals] = useState<Goal[]>([]);
  const [pendingGoals, setPendingGoals] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [selectedChild, setSelectedChild] = useState("all");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [amountToSave, setAmountToSave] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const isParent = profile?.role === "admin" || profile?.role === "responsible";

  const fetchData = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      let goalsData: Goal[] = [];
      if (isParent) {
        const { data: childrenData, error: childrenError } = await supabase
          .from("children")
          .select("id, name")
          .eq("parent_id", user.id);
        if (childrenError) throw childrenError;
        setChildren(childrenData || []);

        const { data, error: goalsError } = await supabase
          .from("goals")
          .select("*")
          .eq("parent_id", user.id)
          .order("created_at", { ascending: false });
        if (goalsError) throw goalsError;
        goalsData = data || [];
      } else {
        const { data, error: goalsError } = await supabase
          .from("goals")
          .select("*")
          .eq("child_id", user.id)
          .order("created_at", { ascending: false });
        if (goalsError) throw goalsError;
        goalsData = data || [];
      }

      setApprovedGoals(goalsData.filter((g) => g.is_approved));
      setPendingGoals(goalsData.filter((g) => !g.is_approved));
    } catch (error: any) {
      Alert.alert("Erro ao buscar metas", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, profile, isParent]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalTarget.trim()) {
      Alert.alert("Erro", "Preencha o título e o valor da meta.");
      return;
    }
    if (!user) return;

    const targetAmount = parseFloat(newGoalTarget);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert("Erro", "O valor da meta deve ser um número positivo.");
      return;
    }

    const isApproved = isParent;
    const parentId = isParent
      ? user.id
      : (
          await supabase
            .from("children")
            .select("parent_id")
            .eq("id", user.id)
            .single()
        ).data?.parent_id;
    if (!parentId) {
      Alert.alert(
        "Erro",
        "Não foi possível encontrar um responsável associado."
      );
      return;
    }

    let goalsToInsert = [];
    if (isParent && selectedChild === "all") {
      goalsToInsert = children.map((child) => ({
        parent_id: parentId,
        child_id: child.id,
        title: newGoalTitle,
        target_amount: targetAmount,
        is_approved: isApproved,
      }));
    } else {
      goalsToInsert.push({
        parent_id: parentId,
        child_id: isParent ? selectedChild : user.id,
        title: newGoalTitle,
        target_amount: targetAmount,
        is_approved: isApproved,
      });
    }

    const { error } = await supabase.from("goals").insert(goalsToInsert);
    if (error) {
      Alert.alert("Erro ao criar meta", error.message);
    } else {
      Alert.alert(
        "Sucesso",
        isParent
          ? "Meta(s) criada(s) com sucesso!"
          : "Meta enviada para aprovação do seu responsável!"
      );
      setShowCreateModal(false);
      setNewGoalTitle("");
      setNewGoalTarget("");
      fetchData();
    }
  };

  const handleApproveGoal = async (goalId: string) => {
    const { error } = await supabase
      .from("goals")
      .update({ is_approved: true })
      .eq("id", goalId);
    if (error) {
      Alert.alert("Erro", "Não foi possível aprovar a meta.");
    } else {
      Alert.alert("Sucesso", "Meta aprovada e agora está ativa!");
      fetchData();
    }
  };

  const handleSaveForGoal = async () => {
    if (!selectedGoal || !amountToSave.trim()) {
      Alert.alert("Erro", "Insira um valor para poupar.");
      return;
    }
    const value = parseFloat(amountToSave);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Erro", "O valor deve ser um número positivo.");
      return;
    }

    const { error: expenseError } = await supabase.from("expenses").insert({
      user_id: selectedGoal.child_id,
      description: `Poupança para a meta: ${selectedGoal.title}`,
      amount: value,
      type: "expense",
      category: "Poupança Meta",
      goal_id: selectedGoal.id,
      expense_date: new Date().toISOString(),
    });

    if (expenseError) {
      Alert.alert("Erro ao salvar para a meta", expenseError.message);
      return;
    }

    const newCurrentAmount = selectedGoal.current_amount + value;
    const newStatus =
      newCurrentAmount >= selectedGoal.target_amount
        ? "completed"
        : selectedGoal.status;

    const { data, error: updateError } = await supabase
      .from("goals")
      .update({ current_amount: newCurrentAmount, status: newStatus })
      .eq("id", selectedGoal.id)
      .select()
      .single();

    if (updateError) {
      Alert.alert("Erro", "Não foi possível atualizar o progresso da meta.");
    } else {
      if (
        data &&
        data.status === "completed" &&
        selectedGoal.status !== "completed"
      ) {
        Alert.alert(
          "Parabéns!",
          `A meta "${data.title}" foi concluída! Um prêmio foi gerado.`
        );
      }
      setShowUpdateModal(false);
      setAmountToSave("");
      setSelectedGoal(null);
      fetchData();
    }
  };

  const handleReleaseFunds = async (goal: Goal) => {
    if (goal.current_amount <= 0) {
      Alert.alert("Aviso", "Não há fundos para liberar nesta meta.");
      return;
    }
    Alert.alert(
      "Liberar Fundos",
      `Deseja devolver ${goal.current_amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} ao saldo principal do dependente?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const { error: incomeError } = await supabase
              .from("expenses")
              .insert({
                user_id: goal.child_id,
                description: `Fundos liberados da meta: ${goal.title}`,
                amount: goal.current_amount,
                type: "income",
                category: "Liberação de Meta",
                expense_date: new Date().toISOString(),
              });

            if (incomeError) {
              Alert.alert(
                "Erro",
                "Não foi possível criar a transação de devolução."
              );
              return;
            }

            const { error: updateError } = await supabase
              .from("goals")
              .update({ current_amount: 0, status: "completed" })
              .eq("id", goal.id);
            if (updateError) {
              Alert.alert(
                "Erro",
                "Não foi possível concluir a meta após liberar os fundos."
              );
            } else {
              Alert.alert(
                "Sucesso",
                "Fundos liberados e devolvidos ao saldo principal!"
              );
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Você tem certeza que deseja apagar esta meta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("goals")
              .delete()
              .eq("id", goalId);
            if (error) {
              Alert.alert("Erro", "Não foi possível apagar a meta.");
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleShareGoal = async (goal: Goal) => {
    try {
      const message = `Estou tentando alcançar minha meta de '${
        goal.title
      }'! Já juntei ${goal.current_amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} de ${goal.target_amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}. Você pode me ajudar a completar? 😊`;
      await Share.share({
        message: message,
        title: `Me ajude com a minha meta: ${goal.title}`,
      });
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível compartilhar a meta.");
    }
  };

  const openUpdateModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowUpdateModal(true);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderGoalCard = (goal: Goal) => {
    const childName = children.find((c) => c.id === goal.child_id)?.name;
    const isCompleted = goal.status === "completed";

    return (
      <View
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: theme.colors.card }]}
      >
        {isParent && (
          <Text style={[styles.childName, { color: theme.colors.secondary }]}>
            {childName}
          </Text>
        )}
        <View style={styles.goalTitleContainer}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
            {goal.title}
          </Text>
          {isCompleted && (
            <Ionicons name="checkmark-circle" size={28} color="#2ecc71" />
          )}
          {!goal.is_approved && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pendente</Text>
            </View>
          )}
        </View>

        <ProgressBar
          current={goal.current_amount}
          target={goal.target_amount}
          color={theme.colors.primary}
          isCompleted={isCompleted}
        />
        <Text style={[styles.amountText, { color: theme.colors.text }]}>
          {goal.current_amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}{" "}
          /{" "}
          {goal.target_amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Text>

        <View style={styles.buttonContainer}>
          {user?.id === goal.child_id && !isCompleted && goal.is_approved && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openUpdateModal(goal)}
              >
                <Ionicons name="add-circle-outline" size={32} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShareGoal(goal)}
              >
                <Ionicons name="share-social-outline" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
          {isParent && (
            <>
              {!goal.is_approved && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleApproveGoal(goal.id)}
                >
                  <Ionicons name="checkmark-done-outline" size={28} color="#2ecc71" />
                </TouchableOpacity>
              )}
              {goal.is_approved && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleReleaseFunds(goal)}
                >
                   <Ionicons name="archive-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteGoal(goal.id)}
              >
                <Ionicons name="trash-outline" size={28} color="#e74c3c" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons
            name={theme.dark ? "sunny" : "moon"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Metas
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={30} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isParent && pendingGoals.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Pendente de Aprovação
          </Text>
          {pendingGoals.map(renderGoalCard)}
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Metas Ativas e Concluídas
        </Text>
        {approvedGoals.length === 0 && pendingGoals.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="file-tray-outline" size={60} color={theme.colors.secondary} />
            <Text style={[styles.noDataText, { color: theme.colors.secondary }]}>
              Nenhuma meta por aqui ainda.
            </Text>
          </View>
        ) : approvedGoals.length === 0 && isParent ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="file-tray-outline" size={60} color={theme.colors.secondary} />
              <Text style={[styles.noDataText, { color: theme.colors.secondary }]}>
                Nenhuma meta ativa encontrada.
              </Text>
            </View>
        ) : (
          approvedGoals.map(renderGoalCard)
        )}
      </View>

      <Modal visible={showCreateModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalBackdrop}
        >
            <View style={[styles.modalContent, {backgroundColor: theme.colors.card}]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, {color: theme.colors.text}]}>Nova Meta</Text>
                    <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                        <Ionicons name="close-circle" size={30} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, {backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}>
                    <Ionicons name="trophy-outline" size={24} color={theme.colors.secondary} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Título da Meta"
                      value={newGoalTitle}
                      onChangeText={setNewGoalTitle}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholderTextColor={theme.colors.secondary}
                    />
                </View>

                <View style={[styles.inputContainer, {backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}>
                    <Ionicons name="cash-outline" size={24} color={theme.colors.secondary} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Valor da Meta"
                      value={newGoalTarget}
                      onChangeText={setNewGoalTarget}
                      keyboardType="numeric"
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholderTextColor={theme.colors.secondary}
                    />
                </View>
                
                {isParent && (
                  <>
                    <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>Atribuir para:</Text>
                    <View style={[styles.pickerContainer, { borderColor: theme.colors.border, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                      <Picker selectedValue={selectedChild} onValueChange={(itemValue) => setSelectedChild(itemValue)} style={{ color: theme.colors.text }} dropdownIconColor={theme.colors.text}>
                        <Picker.Item label="Todos os Dependentes" value="all" />
                        {children.map((child) => (<Picker.Item key={child.id} label={child.name} value={child.id} />))}
                      </Picker>
                    </View>
                  </>
                )}
                <TouchableOpacity onPress={handleCreateGoal} style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.modalButtonText}>Criar Meta</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showUpdateModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalBackdrop}
        >
            <View style={[styles.modalContent, {backgroundColor: theme.colors.card}]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, {color: theme.colors.text}]}>Poupar para a Meta</Text>
                    <TouchableOpacity onPress={() => { setShowUpdateModal(false); setAmountToSave(""); }}>
                        <Ionicons name="close-circle" size={30} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>
                <Text style={{color: theme.colors.text, marginBottom: 15, textAlign: 'center', fontSize: width * 0.04}}>Meta: {selectedGoal?.title}</Text>
                
                <View style={[styles.inputContainer, {backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}>
                    <Ionicons name="add-circle-outline" size={24} color={theme.colors.secondary} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Valor a poupar"
                      value={amountToSave}
                      onChangeText={setAmountToSave}
                      keyboardType="numeric"
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholderTextColor={theme.colors.secondary}
                    />
                </View>
                
                <TouchableOpacity onPress={handleSaveForGoal} style={[styles.modalButton, {backgroundColor: theme.colors.primary}]}>
                    <Text style={styles.modalButtonText}>Poupar</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: width * 0.05 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: height * 0.06,
    marginBottom: height * 0.03,
  },
  headerText: { fontSize: width * 0.08, fontWeight: "bold" },
  addButton: { padding: 5 },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120, 120, 128, 0.1)",
    paddingBottom: 10,
  },
  goalCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  childName: {
    fontSize: width * 0.035,
    marginBottom: 5,
    fontWeight: "500",
    opacity: 0.8,
  },
  goalTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  goalTitle: { fontSize: width * 0.05, fontWeight: "bold", flex: 1 },
  amountText: {
    fontSize: width * 0.04,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  progressBarBackground: {
    height: 25,
    width: "100%",
    backgroundColor: "rgba(120, 120, 128, 0.16)",
    borderRadius: 15,
    justifyContent: "center",
  },
  progressBarFill: { height: "100%", borderRadius: 15 },
  progressText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(120, 120, 128, 0.1)",
    paddingTop: 15,
  },
  actionButton: { marginLeft: 25 },
  actionButtonText: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    color: "#007AFF",
  },
  emptyStateContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  noDataText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: width * 0.04,
    fontStyle: "italic",
  },
  pendingBadge: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  pendingText: { color: "#fff", fontWeight: "bold", fontSize: width * 0.03 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { width: "90%", padding: 20, borderRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    marginLeft: 30, // to center the title
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: width * 0.04,
    borderWidth: 0,
  },
  pickerLabel: {
    alignSelf: "flex-start",
    marginBottom: 8,
    fontSize: width * 0.04,
    fontWeight: '500'
  },
  pickerContainer: {
    width: "100%",
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: "center",
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: width * 0.04, height:150},
});