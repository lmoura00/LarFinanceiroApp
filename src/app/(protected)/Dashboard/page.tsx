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

export default function DashboardScreen() {
  const [currentUserDetails, setCurrentUserDetails] = useState<UserDetails | null>(null);
  const [childrenDetails, setChildrenDetails] = useState<UserDetails[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, session } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async (isRefreshing = false) => {
    if (!user || !profile) return;
    if (isRefreshing) setRefreshing(true);

    try {
      const isParent = profile.role === 'admin' || profile.role === 'responsible';

      if (isParent) {
        // --- LÓGICA DO RESPONSÁVEL ---
        const { data: parentTransactions, error: parentTxError } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id);

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
          return;
        }

        const childrenIds = children.map((c) => c.id);
        const { data: allChildTransactions, error: expensesError } = await supabase
          .from("expenses")
          .select("*")
          .in("user_id", childrenIds);

        if (expensesError) throw expensesError;

        const childDetailsData = children.map((child) => {
          const transactions =
            allChildTransactions?.filter((e) => e.user_id === child.id) || [];
          const income = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
          const expenses = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
          const childBalance = (child.allowance_amount || 0) + income - expenses;

          return {
            id: child.id,
            name: child.name,
            balance: childBalance,
            transactions: transactions,
          };
        });
        setChildrenDetails(childDetailsData);

      } else {
        // --- LÓGICA DO DEPENDENTE ---
        const { data: childData, error: childError } = await supabase
            .from('children')
            .select('allowance_amount')
            .eq('id', user.id)
            .single();

        if (childError && childError.code !== 'PGRST116') throw childError;
        
        const allowance = childData?.allowance_amount || 0;

        const { data: childTransactions, error: txError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id);

        if (txError) throw txError;
        
        const income = childTransactions?.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0) || 0;
        const expenses = childTransactions?.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0) || 0;
        const childBalance = allowance + income - expenses;

        setCurrentUserDetails({
            id: user.id,
            name: profile.name,
            balance: childBalance,
            transactions: childTransactions || []
        });
        setChildrenDetails([]); 
      }
    } catch (error: any) {
        Alert.alert("Erro ao buscar dados", error.message);
    } finally {
        if(isRefreshing) setRefreshing(false);
    }
  }, [user, profile]);

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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/Auth/page" />;
  }
  
  const isParent = profile?.role === 'admin' || profile?.role === 'responsible';
  const mainBalance = currentUserDetails?.balance ?? 0;
  const mainBalanceTitle = isParent ? "Meu Saldo" : "Saldo da Mesada";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Olá, {profile?.name}!</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceTitle, { color: theme.colors.secondary }]}>
          {mainBalanceTitle}
        </Text>
        <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
          {mainBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScrollViewContent}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]} onPress={handleAddExpensePress}>
          <Ionicons name="add-circle-outline" size={theme.fontSizes.xLarge} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Adicionar Transação</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]} onPress={() => router.push("/(protected)/Goals/page")}>
          <Ionicons name="wallet-outline" size={theme.fontSizes.xLarge} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Metas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]}>
          <Ionicons name="medal-outline" size={theme.fontSizes.xLarge} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Prêmios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]}>
          <Ionicons name="bar-chart-outline" size={theme.fontSizes.xLarge} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Orçamento</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {isParent && (
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Saldos dos Dependentes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balancesScrollViewContent}>
            {childrenDetails.map((child, index) => (
              <View key={child.id} style={[styles.balanceCard, { backgroundColor: childColors[index % childColors.length] }]}>
                <Text style={styles.balanceCardName}>{child.name}</Text>
                <Text style={styles.balanceCardAmount}>{child.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.transactionsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Transações Recentes</Text>
        {currentUserDetails && (
          <View style={styles.childTransactionSection}>
             {isParent && (
                <View style={[styles.childHeader, { borderLeftColor: parentColor }]}>
                    <Text style={[styles.childName, { color: theme.colors.text }]}>{currentUserDetails.name} (Você)</Text>
                </View>
             )}
            {currentUserDetails.transactions.length > 0 ? (
              currentUserDetails.transactions.slice(0, 5).map((tx) => (
                <TouchableOpacity key={tx.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleTransactionPress(tx)}>
                  <View style={[styles.transactionIconContainer, { backgroundColor: tx.type === "income" ? theme.colors.primary : "#c0392b" }]}>
                    <Ionicons name={tx.type === "income" ? "arrow-up-outline" : "arrow-down-outline"} size={theme.fontSizes.medium} color="#fff" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>{tx.description}</Text>
                    <Text style={[styles.transactionAmount, { color: tx.type === "income" ? theme.colors.primary : "#c0392b" }]}>{tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
                  </View>
                </TouchableOpacity>
              ))
             ) : (
                <Text style={[styles.noTransactionsText, { color: theme.colors.secondary }]}>Nenhuma transação.</Text>
             )}
          </View>
        )}
        {isParent && childrenDetails.map((child, index) => (
          <View key={`section-${child.id}`} style={styles.childTransactionSection}>
            <View style={[styles.childHeader, { borderLeftColor: childColors[index % childColors.length] }]}>
              <Text style={[styles.childName, { color: theme.colors.text }]}>{child.name}</Text>
            </View>
            {child.transactions.length > 0 ? (
              child.transactions.slice(0, 3).map((tx) => (
                <TouchableOpacity key={tx.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleTransactionPress(tx)}>
                  <View style={[styles.transactionIconContainer, { backgroundColor: tx.type === "income" ? theme.colors.primary : childColors[index % childColors.length] }]}>
                    <Ionicons name={tx.type === "income" ? "arrow-up-outline" : "arrow-down-outline"} size={theme.fontSizes.medium} color="#fff" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>{tx.description}</Text>
                    <Text style={[styles.transactionAmount, { color: tx.type === "income" ? theme.colors.primary : "#c0392b" }]}>{tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noTransactionsText, { color: theme.colors.secondary }]}>Nenhuma transação.</Text>
            )}
          </View>
        ))}
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes da Transação</Text>
            {selectedTransaction && (
              <>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>Descrição: {selectedTransaction.description}</Text>
                <Text style={[styles.modalText, { color: selectedTransaction.type === "income" ? theme.colors.primary : "#c0392b" }]}>Valor: {selectedTransaction.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>Tipo: {selectedTransaction.type === "income" ? "Entrada" : "Saída"}</Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>Categoria: {selectedTransaction.category || "N/A"}</Text>
                <Text style={[styles.modalText, { color: theme.colors.text }]}>Data: {new Date(selectedTransaction.expense_date).toLocaleDateString('pt-BR')}</Text>
              </>
            )}
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.colors.primary }]} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: height * 0.01,
  },
  headerText: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  balanceSection: {
    alignItems: "center",
    marginBottom: height * 0.015,
  },
  balanceTitle: {
    fontSize: width * 0.04,
  },
  balanceAmount: {
    fontSize: width * 0.1,
    fontWeight: "bold",
  },
  actionsScrollViewContent: {
    paddingVertical: height * 0.01,
  },
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
  transactionsSection: {
    marginTop: height * 0.025,
  },
  balancesScrollViewContent: {
    paddingBottom: 10,
  },
  balanceCard: {
    width: width * 0.4,
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    justifyContent: "center",
    elevation: 3,
  },
  balanceCardName: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
    marginBottom: 5,
  },
  balanceCardAmount: {
    color: "#fff",
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  childTransactionSection: {
    marginBottom: height * 0.02,
  },
  childHeader: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
  },
  childName: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: height * 0.01,
    borderBottomWidth: 1,
  },
  transactionIconContainer: {
    padding: width * 0.025,
    borderRadius: width * 0.06,
    marginRight: width * 0.04,
  },
  transactionDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionDescription: {
    fontSize: width * 0.04,
    flexShrink: 1,
  },
  transactionAmount: {
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
  noTransactionsText: {
    textAlign: "left",
    marginTop: 5,
    paddingBottom: 10,
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
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: 20,
  },
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