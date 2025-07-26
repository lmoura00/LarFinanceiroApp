import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext';

export default function GoalsScreen() {
  const { theme, toggleTheme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Minhas Metas</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Metas Financeiras</Text>
        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Aqui você pode acompanhar suas metas de economia e gastos.
        </Text>
        
        {/* Placeholder para uma meta */}
        <View style={[styles.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>Viagem dos Sonhos</Text>
          <Text style={[styles.goalDetails, { color: theme.colors.secondary }]}>
            Progresso: R$ 500,00 de R$ 2.000,00
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '25%', backgroundColor: theme.colors.primary }]} />
          </View>
        </View>

        {/* Outro placeholder de meta */}
        <View style={[styles.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>Comprar um Jogo Novo</Text>
          <Text style={[styles.goalDetails, { color: theme.colors.secondary }]}>
            Progresso: R$ 80,00 de R$ 150,00
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '53%', backgroundColor: theme.colors.primary }]} />
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  goalCard: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  goalDetails: {
    fontSize: 14,
    marginBottom: 10,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0', // Light grey for the bar background
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
});