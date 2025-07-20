import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/supabaseClient';
import { useTheme } from '@/Hooks/ThemeContext';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category?: string;
  expense_date: string;
}

export default function DashboardScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(sessionError?.message || "Usuário não autenticado.");
        }

        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          throw new Error(profileError?.message || "Perfil do usuário não encontrado.");
        }

        let expensesData: Transaction[] = [];

        if (profile.role === 'admin') {
          const { data: children, error: childrenError } = await supabase
            .from('children')
            .select('id')
            .eq('parent_id', userId);

          if (childrenError || !children) {
            throw new Error(childrenError?.message || "Erro ao buscar filhos.");
          }
          
          const childrenIds = children.map(child => child.id);

          const { data: familyExpenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .in('child_id', childrenIds)
            .order('created_at', { ascending: false });
          
          if (expensesError) {
              throw new Error(expensesError.message);
          }
          expensesData = familyExpenses;

        } else {
          const { data: myExpenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('child_id', userId)
            .order('created_at', { ascending: false });

          if (expensesError) {
              throw new Error(expensesError.message);
          }
          expensesData = myExpenses;
        }

        const totalBalance = expensesData.reduce((sum, item) => sum + item.amount, 0);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Carregando dados...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleTheme}>
              <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceSection}>
            <Text style={[styles.balanceTitle, { color: theme.colors.secondary }]}>Família Financeira</Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>$ {balance.toFixed(2)}</Text>
            <Text style={[styles.balanceSubtitle, { color: theme.colors.secondary }]}>Saldo Total</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScrollView}>
            <View style={[styles.actionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="add-circle-outline" size={32} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Adicionar Gasto</Text>
            </View>
            <View style={[styles.actionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="wallet-outline" size={32} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Metas</Text>
            </View>
            <View style={[styles.actionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Definir para</Text>
            </View>
            <View style={[styles.actionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="bar-chart-outline" size={32} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Orçamento</Text>
            </View>
          </ScrollView>

          <View style={styles.transactionsSection}>
            <Text style={[styles.transactionsTitle, { color: theme.colors.text }]}>Transações Recentes</Text>
            <View style={styles.transactionList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.transactionIconContainer, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="bag-handle-outline" size={24} color={theme.colors.text} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>{transaction.description}</Text>
                    <Text style={[styles.transactionAmount, { color: theme.colors.text }]}>$ {transaction.amount.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          
          <View style={[styles.bottomNav, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="home" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="person-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="wallet-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceSection: {
    marginBottom: 30,
  },
  balanceTitle: {
    fontSize: 16,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  balanceSubtitle: {
    fontSize: 14,
  },
  actionsScrollView: {
    marginBottom: 20,
  },
  actionCard: {
    width: 100,
    height: 100,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
  },
  transactionsSection: {
    flex: 1,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  transactionIconContainer: {
    padding: 10,
    borderRadius: 25,
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDescription: {
    fontSize: 16,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: 'center',
  },
});