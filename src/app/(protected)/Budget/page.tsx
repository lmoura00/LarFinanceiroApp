import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/supabaseClient';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { useFocusEffect } from 'expo-router';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  expense_date: string;
}

const { width, height } = Dimensions.get('window');

const chartConfig = (theme: any) => ({
    backgroundColor: theme.colors.card,
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(${theme.dark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${theme.dark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  });


export default function BudgetScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [monthlySummary, setMonthlySummary] = useState<any>({});
    const [categorySummary, setCategorySummary] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
    const { theme, toggleTheme } = useTheme();
    const { user, profile } = useAuth();

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
    
        try {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('expense_date', { ascending: false });
    
          if (error) throw error;
          
          setTransactions(data || []);
          processChartData(data || []);
    
        } catch (error: any) {
          Alert.alert("Erro ao buscar dados de orçamento", error.message);
        } finally {
          setLoading(false);
        }
      }, [user, selectedMonth, selectedYear]);

      const processChartData = (data: Transaction[]) => {
        const monthly: { [key: string]: { income: number, expense: number } } = {};
        const categories: { [key: string]: number } = {};
    
        data.forEach(t => {
          const date = new Date(t.expense_date);
          const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
    
          if (!monthly[monthYear]) {
            monthly[monthYear] = { income: 0, expense: 0 };
          }
    
          if (t.type === 'income') {
            monthly[monthYear].income += t.amount;
          } else {
            monthly[monthYear].expense += t.amount;
          }
          
          if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && t.type === 'expense') {
            const categoryName = t.category || 'Outros';
            categories[categoryName] = (categories[categoryName] || 0) + t.amount;
          }
        });
    
        setMonthlySummary(monthly);
        setCategorySummary(categories);
      };
    
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

      if (loading) {
        return (
          <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        );
      }
    
      const lineChartData = {
        labels: Object.keys(monthlySummary).reverse(),
        datasets: [
          {
            data: Object.values(monthlySummary).map((d: any) => d.income).reverse(),
            color: (opacity = 1) => `rgba(72, 187, 120, ${opacity})`,
            strokeWidth: 2
          },
          {
            data: Object.values(monthlySummary).map((d: any) => d.expense).reverse(),
            color: (opacity = 1) => `rgba(229, 62, 62, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Receitas", "Despesas"]
      };
    
      const pieChartData = Object.keys(categorySummary).length > 0 ? Object.keys(categorySummary).map((key, index) => ({
        name: `${key} (R$ ${categorySummary[key].toFixed(2)})`,
        amount: categorySummary[key],
        color: ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#BD10E0', '#9013FE'][index % 6],
        legendFontColor: theme.colors.text,
        legendFontSize: 15
      })) : [{ name: 'Sem dados', amount: 1, color: theme.colors.border, legendFontColor: theme.colors.text, legendFontSize: 15 }];

      const filteredTransactions = transactions.filter(t => {
        const date = new Date(t.expense_date);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      })

  return (
    <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Orçamento</Text>
        <TouchableOpacity onPress={toggleTheme}>
            <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Receitas vs. Despesas</Text>
        <LineChart
            data={lineChartData}
            width={width * 0.9}
            height={220}
            chartConfig={chartConfig(theme)}
            bezier
            yAxisLabel="R$"
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gastos por Categoria</Text>
        <PieChart
            data={pieChartData}
            width={width * 0.8}
            height={220}
            chartConfig={chartConfig(theme)}
            accessor={"amount"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Transações do Mês</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Picker
                selectedValue={selectedMonth}
                style={{height: 50, width: 150, color: theme.colors.text}}
                onValueChange={(itemValue) => setSelectedMonth(itemValue)}>
                {[...Array(12).keys()].map(i => <Picker.Item key={i} label={new Date(0, i).toLocaleString('default', { month: 'long' })} value={i} />)}
            </Picker>
            <Picker
                selectedValue={selectedYear}
                style={{height: 50, width: 150, color: theme.colors.text}}
                onValueChange={(itemValue) => setSelectedYear(itemValue)}>
                {[...Array(5).keys()].map(i => <Picker.Item key={i} label={`${new Date().getFullYear() - i}`} value={new Date().getFullYear() - i} />)}
            </Picker>
        </View>
        {filteredTransactions.length > 0 ? filteredTransactions.map((tx) => (
            <View key={tx.id} style={[styles.transactionItem, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.transactionIconContainer, { backgroundColor: theme.dark ? theme.colors.background : theme.colors.border }]}>
                <Ionicons name={getCategoryIcon(tx.category)} size={24} color={tx.type === 'income' ? theme.colors.primary : theme.colors.text} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>{tx.description}</Text>
                <Text style={[styles.transactionCategory, { color: theme.colors.secondary }]}>{tx.category}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: tx.type === 'income' ? theme.colors.primary : theme.colors.text,},]}>
                {tx.type === "income" ? "+" : "-"}
                {tx.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
        )) : <Text style={{color: theme.colors.text, textAlign: 'center', marginTop: 20}}>Nenhuma transação neste mês.</Text>}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: width * 0.05 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: height * 0.06,
    marginBottom: height * 0.03,
  },
  headerText: { fontSize: width * 0.08, fontWeight: 'bold' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: { flex: 1 },
  transactionDescription: { fontSize: width * 0.04, fontWeight: 'bold' },
  transactionCategory: { fontSize: width * 0.035, color: '#888', marginTop: 2 },
  transactionAmount: { fontSize: width * 0.04, fontWeight: 'bold' },
});