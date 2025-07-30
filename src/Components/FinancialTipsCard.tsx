import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { supabase } from '@/supabaseClient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export default function FinancialTipsCard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

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
        console.log("Response from generate-financial-tips:", data);
        if (functionError) throw functionError;

        if (data.tips && data.tips.length > 0) {
          setTips(data.tips);
        } else {
          setTips(["Continue usando o app para receber dicas!"]);
        }
      } catch (e: any) {
        setError('Não foi possível carregar as dicas no momento.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchTips();
  }, [user]);

 
  useEffect(() => {
    if (tips.length > 1) {
      const interval = setInterval(() => {
        const nextIndex = (activeIndex + 1) % tips.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setActiveIndex(nextIndex);
      }, 5000); 

      return () => clearInterval(interval);
    }
  }, [activeIndex, tips.length]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  const renderTip = ({ item }: { item: string }) => (
    <View style={styles.tipItemContainer}>
      <Text style={[styles.tipText, { color: theme.colors.text }]}>{item}</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />;
    }
    if (error) {
      return <Text style={[styles.tipText, { color: theme.colors.secondary, textAlign: 'center' }]}>{error}</Text>;
    }
    return (
      <>
        <FlatList
          ref={flatListRef}
          data={tips}
          renderItem={renderTip}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.flatList}
        />
        <View style={styles.paginationContainer}>
          {tips.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === activeIndex ? theme.colors.primary : theme.colors.border },
              ]}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>💡 Dicas Financeiras</Text>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  flatList: {
    width: CARD_WIDTH,
  },
  tipItemContainer: {
    width: CARD_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 100, 
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});