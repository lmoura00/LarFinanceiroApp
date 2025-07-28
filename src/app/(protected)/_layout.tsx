import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext"; // Verifique se o caminho está correto aqui
import { View } from "react-native";

export default function ProtectedLayout() {
  const { theme } = useTheme();
  const { session, loading, profile } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/Auth/page" />;
  }

  const isResponsibleUser =
    profile?.role === "admin" || profile?.role === "responsible";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSizes.small,
        },
      }}
    >
      <Tabs.Screen
        name="Dashboard/page"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Budget/page"
        options={{
          title: "Orçamento",
          href: null
        }}
      />
      <Tabs.Screen
        name="Goals/page"
        options={{
          title: "Metas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />

      {isResponsibleUser ? (
        <Tabs.Screen
          name="Dependents/page"
          options={{
            title: "Dependentes",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="Dependents/page"
          options={{
            title: "Dependentes",
            href: null,
          }}
        />
      )}
      <Tabs.Screen
        name="Profile/page"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="EditProfile/page"
        options={{
          href: null,
          headerShown: false,
        }}
      />
       <Tabs.Screen 
        name="AddExpense/page"
        options={{
          headerShown: false,
         href: null,
        }}
      />
       <Tabs.Screen 
        name="Awards/page"
        options={{
          headerShown: false,
         href: null,
        }}
      />
    </Tabs>
  );
}