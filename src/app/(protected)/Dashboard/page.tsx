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
  Modal,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { BlurView } from "expo-blur"; // Importar BlurView
import FinancialTipsCard from "@/Components/FinancialTipsCard";


interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  expense_date: string;
  receipt_image_url?: string | null;
  location_coords?: Coordinates | null;
}
interface UserDetails {
  id: string;
  name: string;
  balance: number;
  transactions: Transaction[];
}
interface Coordinates {
  latitude: number;
  longitude: number;
}
interface ChildDetails extends UserDetails {
  saved_in_goals: number;
}
interface Medal {
  id: string;
  name: string;
  achieved_at: string;
  children: { name: string }[] | null;
}

// Constantes
const { width, height } = Dimensions.get("window");
const SPACING = 20;
const childColors = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#9b59b6",
  "#f1c40f",
  "#1abc9c",
  "#e67e22",
];

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
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, session, unreadNotifications } = useAuth();
  const router = useRouter();

  const [currentUserDetails, setCurrentUserDetails] =
    useState<UserDetails | null>(null);
  const [childrenDetails, setChildrenDetails] = useState<ChildDetails[]>([]);
  const [familyMedals, setFamilyMedals] = useState<Medal[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


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
  const onRefresh = () => fetchData(true);
  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalVisible(true);
  };

  if (loading && !refreshing) {
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

  if (!session) {
    return <Redirect href="/Auth/page" />;
  }

  const isParent = profile?.role === "admin" || profile?.role === "responsible";
  const mainBalance = currentUserDetails?.balance ?? 0;
  const groupedUserTransactions = groupTransactionsByDate(
    currentUserDetails?.transactions || []
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >

        <View style={styles.header}>
          <View>
            <Text
              style={[styles.headerGreeting, { color: theme.colors.secondary }]}
            >
              Bem-vindo(a),
            </Text>
            <Text style={[styles.headerName, { color: theme.colors.text }]}>
              {profile?.name}!
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Ionicons
                name={theme.dark ? "sunny" : "moon"}
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(protected)/Notifications/page")}
              style={styles.iconButton}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.text}
              />
              {/* <NotificationBadge count={unreadNotifications} /> */}
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceContainer}>
          <BlurView
            intensity={30}
            tint={theme.dark ? "dark" : "light"}
            style={styles.balanceCard}
          >
            <Text
              style={[styles.balanceTitle, { color: theme.colors.secondary }]}
            >
              {isParent ? "Meu Saldo" : "Saldo da Mesada"}
            </Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              {mainBalance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Text>
          </BlurView>
        </View>

        {/* Actions Grid */}
        <View style={styles.actionsGrid}>
          <ActionItem
            icon="add"
            label="Adicionar"
            onPress={() => router.push("/(protected)/AddExpense/page")}
            theme={theme}
          />
          <ActionItem
            icon="star-outline"
            label="Metas"
            onPress={() => router.push("/(protected)/Goals/page")}
            theme={theme}
          />
          <ActionItem
            icon="medal-outline"
            label="Prêmios"
            onPress={() => router.push("/(protected)/Awards/page")}
            theme={theme}
          />
          <ActionItem
            icon="bar-chart-outline"
            label="Orçamento"
            onPress={() => router.push("/(protected)/Budget/page")}
            theme={theme}
          />
        </View>

        {profile?.role === "child" && <FinancialTipsCard />}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Transações Recentes
          </Text>
          {Object.keys(groupedUserTransactions).length > 0 ? (
            Object.entries(groupedUserTransactions).map(
              ([date, transactions]) => (
                <View key={date} style={{ marginBottom: SPACING }}>
                  <Text
                    style={[
                      styles.transactionDate,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    {date}
                  </Text>
                  {transactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      tx={tx}
                      onPress={() => handleTransactionPress(tx)}
                      theme={theme}
                    />
                  ))}
                </View>
              )
            )
          ) : (
            <Text
              style={[styles.noItemsText, { color: theme.colors.secondary }]}
            >
              Nenhuma transação recente.
            </Text>
          )}
        </View>
      </ScrollView>

      <TransactionDetailModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        transaction={selectedTransaction}
        theme={theme}
      />
    </View>
  );
}

const ActionItem = ({ icon, label, onPress, theme }) => (
  <TouchableOpacity
    style={[styles.actionItem, { backgroundColor: theme.colors.card }]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={28} color={theme.colors.primary} />
    <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const TransactionItem = ({ tx, onPress, theme }) => (
  <TouchableOpacity
    style={[styles.transactionItem, { backgroundColor: theme.colors.card }]}
    onPress={onPress}
  >
    <View
      style={[
        styles.transactionIconContainer,
        {
          backgroundColor:
            tx.type === "income"
              ? theme.colors.primary + "33"
              : theme.colors.secondary + "33",
        },
      ]}
    >
      <Ionicons
        name={getCategoryIcon(tx.category)}
        size={22}
        color={
          tx.type === "income" ? theme.colors.primary : theme.colors.secondary
        }
      />
    </View>
    <View style={styles.transactionDetails}>
      <Text
        style={[styles.transactionDescription, { color: theme.colors.text }]}
      >
        {tx.description}
      </Text>
      <Text
        style={[styles.transactionCategory, { color: theme.colors.secondary }]}
      >
        {tx.category}
      </Text>
    </View>
    <Text
      style={[
        styles.transactionAmount,
        {
          color:
            tx.type === "income" ? theme.colors.primary : theme.colors.danger,
        },
      ]}
    >
      {tx.type === "income" ? "+" : "-"}{" "}
      {tx.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
    </Text>
  </TouchableOpacity>
);

const TransactionDetailModal = ({ isVisible, onClose, transaction, theme }) => {
  if (!transaction) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView
        intensity={20}
        tint={theme.dark ? "dark" : "light"}
        style={styles.modalBackdrop}
      >
        <View
          style={[styles.bottomSheet, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.handle} />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close-circle"
              size={32}
              color={theme.colors.secondary}
            />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              style={[
                styles.modalAmount,
                {
                  color:
                    transaction.type === "income"
                      ? theme.colors.primary
                      : theme.colors.danger,
                },
              ]}
            >
              {transaction.type === "income" ? "+" : "-"}{" "}
              {transaction.amount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Text>
            <Text
              style={[styles.modalDescription, { color: theme.colors.text }]}
            >
              {transaction.description}
            </Text>
            <Text style={[styles.modalDate, { color: theme.colors.secondary }]}>
              {new Date(transaction.expense_date).toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {transaction.receipt_image_url && (
              <View style={styles.modalSection}>
                <Text
                  style={[styles.modalSubTitle, { color: theme.colors.text }]}
                >
                  Comprovante
                </Text>
                <Image
                  source={{ uri: transaction.receipt_image_url }}
                  style={styles.modalImage}
                />
              </View>
            )}

            {transaction.location_coords && (
              <View style={styles.modalSection}>
                <Text
                  style={[styles.modalSubTitle, { color: theme.colors.text }]}
                >
                  Localização
                </Text>
                <MapView
                  style={styles.modalMap}
                  initialRegion={{
                    latitude: transaction.location_coords.latitude,
                    longitude: transaction.location_coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                >
                  <Marker coordinate={transaction.location_coords} />
                </MapView>
              </View>
            )}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING,
    paddingTop: (StatusBar.currentHeight || 0) + SPACING,
  },
  headerGreeting: { fontSize: 16, opacity: 0.8 },
  headerName: { fontSize: 24, fontWeight: "bold" },
  iconButton: { padding: 8, marginLeft: 8 },
  balanceContainer: { paddingHorizontal: SPACING },
  balanceCard: {
    padding: SPACING,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  balanceTitle: { fontSize: 16, fontWeight: "500", opacity: 0.8 },
  balanceAmount: { fontSize: 40, fontWeight: "bold", marginTop: 8 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: SPACING,
  },
  actionItem: {
    width: "48%",
    padding: SPACING,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: SPACING / 2,
  },
  actionLabel: { marginTop: 8, fontWeight: "600" },
  sectionContainer: { paddingHorizontal: SPACING, marginTop: SPACING },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: SPACING },
  noItemsText: {
    textAlign: "center",
    opacity: 0.7,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING / 1.5,
    borderRadius: 15,
    marginBottom: 10,
  },
  transactionIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  transactionDetails: { flex: 1 },
  transactionDescription: { fontSize: 16, fontWeight: "600" },
  transactionCategory: { fontSize: 14, opacity: 0.7, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: "bold" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  bottomSheet: {
    height: height * 0.75,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: SPACING,
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: SPACING,
  },
  closeButton: {
    position: "absolute",
    top: SPACING,
    right: SPACING,
    zIndex: 1,
  },
  modalAmount: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  modalDate: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: SPACING,
  },
  modalSection: {
    marginVertical: SPACING / 2,
  },
  modalSubTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    backgroundColor: "#e0e0e0",
  },
  modalMap: {
    width: "100%",
    height: 200,
    borderRadius: 15,
  },
});
