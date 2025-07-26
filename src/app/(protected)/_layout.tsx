import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/Hooks/ThemeContext'; // Importe o hook de tema

export default function ProtectedLayout() {
  const { theme } = useTheme(); // Use o tema

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Oculta o cabeçalho padrão para as telas dentro das tabs
        tabBarActiveTintColor: theme.colors.primary, // Cor do ícone e texto ativos
        tabBarInactiveTintColor: theme.colors.secondary, // Cor do ícone e texto inativos
        tabBarStyle: {
          backgroundColor: theme.colors.card, // Cor de fundo da barra de tabs
          borderTopColor: theme.colors.border, // Cor da borda superior da barra de tabs
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSizes.small, // Tamanho da fonte do rótulo
        },
      }}
    >
      <Tabs.Screen
        name="Dashboard/page"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Goals/page"
        options={{
          title: 'Metas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile/page"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}