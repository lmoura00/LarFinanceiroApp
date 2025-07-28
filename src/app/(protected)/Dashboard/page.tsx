import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { Redirect, useRouter, useFocusEffect } from "expo-router";

// --- Interfaces ---
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  expense_date: string;
}

interface UserDetails {
  id: string;
  name: string;
  balance: number;
  transactions: Transaction[];
}

interface ChildDetails extends UserDetails {
  saved_in_goals: number;
}

// CORREÇÃO 1: Ajustar a interface para corresponder aos dados do Supabase
interface Medal {
  id: string;
  name: string;
  achieved_at: string;
  children: { name: string }[] | null; // Alterado para um array de objetos
}

// --- Dimensions & Colors ---
const { width, height } = Dimensions.get("window");
const childColors = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#9b59b6",
  "#f1c40f",
  "#1abc9c",
  "#e67e22",
];
const parentColor = "#34495e";

// --- Helper Functions ---
const getCategoryIcon = (category: string | undefined) => {
  switch (category?.toLowerCase()) {
    case "salário":
      return "cash-outline";
    case "comida":
      return "fast-food-outline";
    case "transporte":
      return "bus-outline";
    case "lazer":
      return "game-controller-outline";
    case "poupança meta":
      return "star-outline";
    case "prêmio":
      return "trophy-outline";
    case "liberação de meta":
      return "archive-outline";
    default:
      return "wallet-outline";
  }
};

const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups = transactions.reduce((acc, tx) => {
    const date = new Date(tx.expense_date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  const formattedGroups: Record<string, Transaction[]> = {};
  for (const date in groups) {
    if (date === today) {
      formattedGroups["Hoje"] = groups[date];
    } else if (date === yesterday) {
      formattedGroups["Ontem"] = groups[date];
    } else {
      formattedGroups[date] = groups[date];
    }
  }
  return formattedGroups;
};

export default function DashboardScreen() {
  const [currentUserDetails, setCurrentUserDetails] =
    useState<UserDetails | null>(null);
  const [childrenDetails, setChildrenDetails] = useState<ChildDetails[]>([]);
  const [familyMedals, setFamilyMedals] = useState<Medal[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, session } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(
    async (isRefreshing = false) => {
      if (!user || !profile) return;
      if (isRefreshing) setRefreshing(true);

      try {
        const isParent =
          profile.role === "admin" || profile.role === "responsible";
        let parentIdForMedalFetch = user.id;

        if (isParent) {
          const { data: parentTransactions, error: parentTxError } =
            await supabase.from("expenses").select("*").eq("user_id", user.id);
          if (parentTxError) throw parentTxError;

          const parentIncome =
            parentTransactions
              ?.filter((tx) => tx.type === "income")
              .reduce((sum, tx) => sum + tx.amount, 0) || 0;
          const parentExpenses =
            parentTransactions
              ?.filter((tx) => tx.type === "expense")
              .reduce((sum, tx) => sum + tx.amount, 0) || 0;

          const { data: children, error: childrenError } = await supabase
            .from("children")
            .select("id, name, allowance_amount")
            .eq("parent_id", user.id);
          if (childrenError) throw childrenError;

          const totalAllowancePaid =
            children?.reduce(
              (sum, child) => sum + (child.allowance_amount || 0),
              0
            ) || 0;
          const parentFinalBalance =
            parentIncome - parentExpenses - totalAllowancePaid;

          setCurrentUserDetails({
            id: user.id,
            name: profile.name || "Responsável",
            balance: parentFinalBalance,
            transactions: parentTransactions || [],
          });

          if (!children || children.length === 0) {
            setChildrenDetails([]);
          } else {
            const childrenIds = children.map((c) => c.id);
            const { data: allChildTransactions, error: expensesError } =
              await supabase
                .from("expenses")
                .select("*")
                .in("user_id", childrenIds);
            if (expensesError) throw expensesError;

            const { data: allChildGoals, error: goalsError } = await supabase
              .from("goals")
              .select("child_id, current_amount")
              .in("child_id", childrenIds);
            if (goalsError) throw goalsError;

            const childDetailsData = children.map((child) => {
              const transactions =
                allChildTransactions?.filter((e) => e.user_id === child.id) ||
                [];
              const income = transactions
                .filter((tx) => tx.type === "income")
                .reduce((sum, tx) => sum + tx.amount, 0);
              const expenses = transactions
                .filter((tx) => tx.type === "expense")
                .reduce((sum, tx) => sum + tx.amount, 0);
              const savedInGoals =
                allChildGoals
                  ?.filter((g) => g.child_id === child.id)
                  .reduce((sum, goal) => sum + goal.current_amount, 0) || 0;
              const childBalance =
                (child.allowance_amount || 0) + income - expenses;
              return {
                id: child.id,
                name: child.name,
                balance: childBalance,
                transactions,
                saved_in_goals: savedInGoals,
              };
            });
            setChildrenDetails(childDetailsData);
          }
        } else {
          const { data: childInfo, error: childError } = await supabase
            .from("children")
            .select("allowance_amount, parent_id")
            .eq("id", user.id)
            .single();
          if (childError && childError.code !== "PGRST116") throw childError;

          parentIdForMedalFetch = childInfo?.parent_id || "";
          const allowance = childInfo?.allowance_amount || 0;

          const { data: childTransactions, error: txError } = await supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id);
          if (txError) throw txError;

          const income =
            childTransactions
              ?.filter((tx) => tx.type === "income")
              .reduce((sum, tx) => sum + tx.amount, 0) || 0;
          const expenses =
            childTransactions
              ?.filter((tx) => tx.type === "expense")
              .reduce((sum, tx) => sum + tx.amount, 0) || 0;
          const childBalance = allowance + income - expenses;

          setCurrentUserDetails({
            id: user.id,
            name: profile.name,
            balance: childBalance,
            transactions: childTransactions || [],
          });
          setChildrenDetails([]);
        }

        if (parentIdForMedalFetch) {
          const { data: familyChildren, error: familyChildrenError } =
            await supabase
              .from("children")
              .select("id")
              .eq("parent_id", parentIdForMedalFetch);
          if (familyChildrenError) throw familyChildrenError;

          const familyIds = familyChildren.map((c) => c.id);
          if (familyIds.length > 0) {
            const { data: medalsData, error: medalsError } = await supabase
              .from("medals")
              .select("id, name, achieved_at, children(name)")
              .in("child_id", familyIds)
              .order("achieved_at", { ascending: false })
              .limit(5);
            if (medalsError) throw medalsError;
            setFamilyMedals((medalsData as any) || []);
          }
        }
      } catch (error: any) {
        Alert.alert("Erro ao buscar dados", error.message);
      } finally {
        if (isRefreshing) setRefreshing(false);
      }
    },
    [user, profile]
  );

  useFocusEffect(
    useCallback(() => {
      if (user && profile) {
        fetchData();
      }
    }, [user, profile, fetchData])
  );
  const onRefresh = () => {
    fetchData(true);
  };
  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalVisible(true);
  };
  const handleAddExpensePress = () => {
    router.push("/(protected)/AddExpense/page");
  };

  if (loading && !refreshing) {
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

  if (!session) {
    return <Redirect href="/Auth/page" />;
  }

  const isParent = profile?.role === "admin" || profile?.role === "responsible";
  const mainBalance = currentUserDetails?.balance ?? 0;
  const mainBalanceTitle = isParent ? "Meu Saldo" : "Saldo da Mesada";
  const groupedUserTransactions = groupTransactionsByDate(
    currentUserDetails?.transactions || []
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
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
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Olá, {profile?.name}!
        </Text>
        <TouchableOpacity>
          <Ionicons
            name="notifications-outline"
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>
      <View
        style={[styles.balanceSection, { backgroundColor: theme.colors.card }]}
      >
        <Text style={[styles.balanceTitle, { color: theme.colors.secondary }]}>
          {mainBalanceTitle}
        </Text>
        <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
          {mainBalance.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsScrollViewContent}
      >
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
          onPress={handleAddExpensePress}
        >
          <Ionicons
            name="add-circle-outline"
            size={theme.fontSizes.xLarge}
            color={theme.colors.text}
          />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            Adicionar Transação
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push("/(protected)/Goals/page")}
        >
          <Ionicons
            name="wallet-outline"
            size={theme.fontSizes.xLarge}
            color={theme.colors.text}
          />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            Metas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push("/(protected)/Awards/page")}
        >
          <Ionicons
            name="medal-outline"
            size={theme.fontSizes.xLarge}
            color={theme.colors.text}
          />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            Prêmios
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push("/(protected)/Budget/page")}
        >
          <Ionicons
            name="bar-chart-outline"
            size={theme.fontSizes.xLarge}
            color={theme.colors.text}
          />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            Orçamento
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {familyMedals.length > 0 && (
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Mural de Conquistas
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.medalsScrollViewContent}
          >
            {familyMedals.map((medal) => (
              <View
                key={medal.id}
                style={[
                  styles.medalCard,
                  { backgroundColor: theme.colors.card },
                ]}
              >
                <Ionicons name="medal" size={30} color="#FFD700" />
                <View style={styles.medalInfo}>
                  <Text
                    style={[styles.medalTitle, { color: theme.colors.text }]}
                  >
                    {medal.name}
                  </Text>
                  <Text
                    style={[
                      styles.medalChild,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    por {medal.children?.name || "Dependente"}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {isParent && (
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Saldos dos Dependentes
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.balancesScrollViewContent}
          >
            {childrenDetails.map((child, index) => (
              <View
                key={child.id}
                style={[
                  styles.balanceCard,
                  { backgroundColor: childColors[index % childColors.length] },
                ]}
              >
                <Text style={styles.balanceCardName}>{child.name}</Text>
                <Text style={styles.balanceCardLabel}>Disponível:</Text>
                <Text style={styles.balanceCardAmount}>
                  {child.balance.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>
                {child.saved_in_goals > 0 && (
                  <Text style={styles.balanceCardSaved}>
                    Em metas:{" "}
                    {child.saved_in_goals.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.transactionsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Transações Recentes
        </Text>
        {Object.keys(groupedUserTransactions).length > 0 ? (
          Object.entries(groupedUserTransactions).map(
            ([date, transactions]) => (
              <View key={date} style={styles.transactionGroup}>
                <Text
                  style={[
                    styles.transactionDate,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {date}
                </Text>
                {transactions.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    style={[
                      styles.transactionItem,
                      { backgroundColor: theme.colors.card },
                    ]}
                    onPress={() => handleTransactionPress(tx)}
                  >
                    <View
                      style={[
                        styles.transactionIconContainer,
                        {
                          backgroundColor: theme.dark
                            ? theme.colors.background
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(tx.category)}
                        size={theme.fontSizes.medium}
                        color={
                          tx.type === "income"
                            ? theme.colors.primary
                            : theme.colors.text
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text
                        style={[
                          styles.transactionDescription,
                          { color: theme.colors.text },
                        ]}
                      >
                        {tx.description}
                      </Text>
                      <Text
                        style={[
                          styles.transactionCategory,
                          { color: theme.colors.secondary },
                        ]}
                      >
                        {tx.category}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        {
                          color:
                            tx.type === "income"
                              ? theme.colors.primary
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {tx.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )
        ) : (
          <Text
            style={[
              styles.noTransactionsText,
              { color: theme.colors.secondary },
            ]}
          >
            Nenhuma transação recente.
          </Text>
        )}
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Detalhes da Transação
            </Text>
            {selectedTransaction && (
              <>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>
                  Descrição: {selectedTransaction.description}
                </Text>
                <Text
                  style={[
                    styles.modalText,
                    {
                      color:
                        selectedTransaction.type === "income"
                          ? theme.colors.primary
                          : "#c0392b",
                    },
                  ]}
                >
                  Valor:{" "}
                  {selectedTransaction.amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>
                  Tipo:{" "}
                  {selectedTransaction.type === "income" ? "Entrada" : "Saída"}
                </Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>
                  Categoria: {selectedTransaction.category || "N/A"}
                </Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>
                  Data:{" "}
                  {new Date(
                    selectedTransaction.expense_date
                  ).toLocaleDateString("pt-BR")}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: height * 0.01,
  },
  headerText: { fontSize: width * 0.045, fontWeight: "bold" },
  balanceSection: {
    alignItems: 'center',
    marginBottom: height * 0.03,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceTitle: { fontSize: width * 0.04 },
  balanceAmount: {
    fontSize: width * 0.12, 
    fontWeight: 'bold',
  },
  actionsScrollViewContent: { paddingVertical: height * 0.01 },
  actionCard: {
    width: width * 0.28,
    height: width * 0.28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: width * 0.025,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    borderRadius: 10,
  },
  actionText: {
    marginTop: height * 0.01,
    fontSize: width * 0.03,
    textAlign: "center",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: height * 0.015,
  },
  transactionsSection: { marginTop: height * 0.025 },
  medalsScrollViewContent: { paddingBottom: 10 },
  medalCard: {
    flexDirection: "row",
    width: width * 0.5,
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
  },
  medalInfo: { marginLeft: 10, flex: 1 },
  medalTitle: { fontSize: width * 0.035, fontWeight: "bold" },
  medalChild: { fontSize: width * 0.03, fontStyle: "italic", marginTop: 2 },
  balancesScrollViewContent: { paddingBottom: 10 },
  balanceCard: {
    width: width * 0.45,
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    justifyContent: "space-between",
    elevation: 3,
  },
  balanceCardName: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
    marginBottom: 10,
  },
  balanceCardLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: width * 0.03,
  },
  balanceCardAmount: {
    color: "#fff",
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: 5,
  },
  balanceCardSaved: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: width * 0.035,
    fontWeight: "500",
    marginTop: 5,
  },
  transactionGroup: { marginBottom: height * 0.02 },
  transactionDate: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: { flex: 1 },
  transactionDescription: { fontSize: width * 0.04, fontWeight: "bold" },
  transactionCategory: { fontSize: width * 0.035, color: "#888", marginTop: 2 },
  transactionAmount: { fontSize: width * 0.04, fontWeight: "bold" },
  noTransactionsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: width * 0.04,
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: width * 0.85,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: { fontSize: width * 0.05, fontWeight: "bold", marginBottom: 20 },
  modalText: {
    fontSize: width * 0.04,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
});
