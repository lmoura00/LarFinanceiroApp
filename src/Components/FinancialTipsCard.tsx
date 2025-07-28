import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { supabase } from '@/supabaseClient';

export default function FinancialTipsCard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTips = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {

        const { data: transactions, error: fetchError } = await supabase
          .from('expenses')
          .select('description,amount,category,type')
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false })
          .limit(20);
  
        if (fetchError) throw fetchError;


        const { data, error: functionError } = await supabase.functions.invoke('generate-financial-tips', {
          body: { transactions },
        });
        console.log(data, error);
        if (functionError) throw functionError;

        if (data.tips) {
          setTips(data.tips);
        }

      } catch (e: any) {
        setError('Não foi possível carregar as dicas. Tente mais tarde.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchTips();
  }, [user]);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>💡 Dicas Financeiras</Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : error ? (
        <Text style={[styles.tipText, { color: theme.colors.secondary }]}>{error}</Text>
      ) : (
        tips.map((tip, index) => (
          <Text key={index} style={[styles.tipText, { color: theme.colors.text }]}>
            • {tip}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
});