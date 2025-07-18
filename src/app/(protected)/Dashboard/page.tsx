// DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/supabaseClient';

// Tipagem para os dados de transações
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        // Passo 1: Obter a sessão do usuário logado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(sessionError?.message || "Usuário não autenticado.");
        }

        const userId = session.user.id;

        // Passo 2: Obter o perfil do usuário para verificar a função (admin ou comum)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          throw new Error(profileError?.message || "Perfil do usuário não encontrado.");
        }

        // Passo 3: Buscar dados com base na função do usuário
        let expensesData: Transaction[] = [];

        if (profile.role === 'admin') {
          // Se for admin, busca os gastos de todos os filhos ligados a ele
          [cite_start]// Conforme a regra de que "cada usuário só pode gerenciar seus próprios registros" [cite: 14]
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
          // Se for comum (filho), busca apenas os próprios gastos
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

        // Calcular o saldo total e exibir as transações recentes
        const totalBalance = expensesData.reduce((sum, item) => sum + item.amount, 0);
        setBalance(totalBalance);
        setTransactions(expensesData.slice(0, 5)); // Exibe apenas as 5 mais recentes

      } catch (error: any) {
        Alert.alert("Erro", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          [cite_start]{/* Seção de Saldo - Conforme o tema "organização financeira familiar" [cite: 24] */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceTitle}>Família Financeira</Text>
            <Text style={styles.balanceAmount}>$ {balance.toFixed(2)}</Text>
            <Text style={styles.balanceSubtitle}>Saldo Total</Text>
          </View>

          [cite_start]{/* Ações Rápidas - Implementação das funcionalidades obrigatórias [cite: 5] */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScrollView}>
            <View style={styles.actionCard}>
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={styles.actionText}>Adicionar Gasto</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="wallet-outline" size={32} color="#fff" />
              <Text style={styles.actionText}>Metas</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#fff" />
              <Text style={styles.actionText}>Definir para</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="bar-chart-outline" size={32} color="#fff" />
              <Text style={styles.actionText}>Orçamento</Text>
            </View>
          </ScrollView>

          [cite_start]{/* Transações Recentes - "Listagem e visualização detalhada" do CRUD principal [cite: 9, 8] */}
          <View style={styles.transactionsSection}>
            <Text style={styles.transactionsTitle}>Transações Recentes</Text>
            <View style={styles.transactionList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIconContainer}>
                    <Ionicons name="bag-handle-outline" size={24} color="#fff" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionAmount}>$ {transaction.amount.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          
          {/* Barra de Navegação Inferior (mock) */}
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="home" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="person-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="wallet-outline" size={24} color="#fff" />
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
    backgroundColor: '#121212',
    padding: 20,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
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
    color: '#aaa',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 5,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  actionsScrollView: {
    marginBottom: 20,
  },
  actionCard: {
    width: 100,
    height: 100,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
  transactionsSection: {
    flex: 1,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    borderBottomColor: '#2a2a2a',
  },
  transactionIconContainer: {
    backgroundColor: '#1e1e1e',
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
    color: '#fff',
    fontSize: 16,
  },
  transactionAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#121212',
  },
  navItem: {
    alignItems: 'center',
  },
});