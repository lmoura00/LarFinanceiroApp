import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function GoalsScreen() {
  const { theme, toggleTheme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Minhas Metas</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Metas Financeiras</Text>
        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Aqui você pode acompanhar suas metas de economia e gastos.
        </Text>

        <View style={[styles.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>Viagem dos Sonhos</Text>
          <Text style={[styles.goalDetails, { color: theme.colors.secondary }]}>
            Progresso: R$ 500,00 de R$ 2.000,00
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '25%', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.s }]} />
          </View>
        </View>

        <View style={[styles.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}>
          <Text style={[styles.goalTitle, { color: theme.colors.text }]}>Comprar um Jogo Novo</Text>
          <Text style={[styles.goalDetails, { color: theme.colors.secondary }]}>
            Progresso: R$ 80,00 de R$ 150,00
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '53%', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.s }]} />
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width * 0.05,
    paddingTop: height * 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  headerText: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    marginBottom: height * 0.01,
  },
  subtitle: {
    fontSize: width * 0.04,
    textAlign: 'center',
    marginBottom: height * 0.04,
  },
  goalCard: {
    width: '100%',
    padding: width * 0.04,
    borderWidth: 1,
    marginBottom: height * 0.02,
    alignItems: 'flex-start',
  },
  goalTitle: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    marginBottom: height * 0.005,
  },
  goalDetails: {
    fontSize: width * 0.035,
    marginBottom: height * 0.01,
  },
  progressBarContainer: {
    width: '100%',
    height: height * 0.01,
    backgroundColor: '#e0e0e0',
  },
  progressBar: {
    height: '100%',
  },
});