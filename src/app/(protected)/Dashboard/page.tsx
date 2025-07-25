import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { Redirect } from "expo-router";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category?: string;
  expense_date: string;
}

const { width, height } = Dimensions.get("window");

export default function DashboardScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        return <Redirect href="/Auth/page" />;
      }
      setLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(sessionError?.message || "Usuário não autenticado.");
        }

        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, name")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          throw new Error(
            profileError?.message || "Perfil do usuário não encontrado."
          );
        }

        setUserName(profile.name || "");

        let expensesData: Transaction[] = [];

        if (profile.role === "admin") {
          const { data: children, error: childrenError } = await supabase
            .from("children")
            .select("id")
            .eq("parent_id", userId);

          if (childrenError || !children) {
            throw new Error(childrenError?.message || "Erro ao buscar filhos.");
          }

          const childrenIds = children.map((child) => child.id);

          const { data: familyExpenses, error: expensesError } = await supabase
            .from("expenses")
            .select("*")
            .in("child_id", childrenIds)
            .order("created_at", { ascending: false });

          if (expensesError) {
            throw new Error(expensesError.message);
          }
          expensesData = familyExpenses;
        } else {
          const { data: myExpenses, error: expensesError } = await supabase
            .from("expenses")
            .select("*")
            .eq("child_id", userId)
            .order("created_at", { ascending: false });

          if (expensesError) {
            throw new Error(expensesError.message);
          }
          expensesData = myExpenses;
        }

        const totalBalance = expensesData.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        setBalance(totalBalance);
        setTransactions(expensesData.slice(0, 5));
      } catch (error: any) {
        Alert.alert("Erro", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Carregando dados...
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleTheme}>
              <Ionicons
                name={theme.dark ? "sunny" : "moon"}
                size={theme.fontSizes.large}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            {userName ? (
              <Text style={[styles.headerText, { color: theme.colors.text }]}>
                Olá, {userName}!
              </Text>
            ) : null}
            <TouchableOpacity>
              <Ionicons
                name="notifications-outline"
                size={theme.fontSizes.large}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceSection}>
            <Text
              style={[styles.balanceTitle, { color: theme.colors.secondary }]}
            >
              Família Financeira
            </Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              {balance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Text>
            <Text
              style={[
                styles.balanceSubtitle,
                { color: theme.colors.secondary },
              ]}
            >
              Saldo Total
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsScrollViewContent}
          >
            <View
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.m,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={theme.fontSizes.xLarge}
                color={theme.colors.text}
              />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Adicionar Gasto
              </Text>
            </View>
            <View
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.m,
                },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={theme.fontSizes.xLarge}
                color={theme.colors.text}
              />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Metas
              </Text>
            </View>
            <View
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.m,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={theme.fontSizes.xLarge}
                color={theme.colors.text}
              />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Definir para
              </Text>
            </View>
            <View
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.m,
                },
              ]}
            >
              <Ionicons
                name="bar-chart-outline"
                size={theme.fontSizes.xLarge}
                color={theme.colors.text}
              />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Orçamento
              </Text>
            </View>
          </ScrollView>

          <View style={styles.transactionsSection}>
            <Text
              style={[styles.transactionsTitle, { color: theme.colors.text }]}
            >
              Transações Recentes
            </Text>
            <View style={styles.transactionList}>
              {transactions.map((transaction) => (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionItem,
                    { borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.transactionIconContainer,
                      { backgroundColor: theme.colors.card },
                    ]}
                  >
                    <Ionicons
                      name="bag-handle-outline"
                      size={theme.fontSizes.medium}
                      color={theme.colors.text}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text
                      style={[
                        styles.transactionDescription,
                        { color: theme.colors.text },
                      ]}
                    >
                      {transaction.description}
                    </Text>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: theme.colors.text },
                      ]}
                    >
                      {transaction.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
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
  loadingText: {
    marginTop: 10,
    fontSize: width * 0.04,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.025,
    alignItems: "center",
  },
  headerText: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  balanceSection: {
    marginBottom: height * 0.04,
  },
  balanceTitle: {
    fontSize: width * 0.04,
  },
  balanceAmount: {
    fontSize: width * 0.1,
    fontWeight: "bold",
    marginVertical: height * 0.005,
  },
  balanceSubtitle: {
    fontSize: width * 0.035,
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
  },
  actionText: {
    marginTop: height * 0.005,
    fontSize: width * 0.03,
    textAlign: "center",
  },
  transactionsSection: {
    flex: 1,
    marginTop: height * 0.02,
  },
  transactionsTitle: {
    fontSize: width * 0.045,
    fontWeight: "bold",
    marginBottom: height * 0.015,
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: height * 0.015,
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
  },
  transactionAmount: {
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: "center",
  },
});
