import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { supabase } from "@/supabaseClient";

const { width, height } = Dimensions.get("window");

const AchievementBadge = ({ medalName }: { medalName: string }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
      <Ionicons name="medal-outline" size={20} color="#fff" />
      <Text style={styles.badgeText}>{medalName}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, signOut, session } = useAuth();
  const [parentName, setParentName] = useState<string | null>(null);
  const [fetchingParentName, setFetchingParentName] = useState(false);
  const [medals, setMedals] = useState<any[]>([]);
  const [fetchingMedals, setFetchingMedals] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchParentNameAndMedals = async () => {
      if (profile?.role === "child" && user?.id) {
        setFetchingParentName(true);
        setFetchingMedals(true);
        try {
          const { data: childData, error: childError } = await supabase
            .from("children")
            .select("parent_id")
            .eq("id", user.id)
            .single();

          if (childError && childError.code !== "PGRST116") {
            throw childError;
          }

          if (childData?.parent_id) {
            const { data: parentProfileData, error: parentProfileError } =
              await supabase
                .from("profiles")
                .select("name")
                .eq("id", childData.parent_id)
                .single();

            if (parentProfileError && parentProfileError.code !== "PGRST116") {
              throw parentProfileError;
            }
            setParentName(parentProfileData?.name || null);
          }

          const { data: medalsData, error: medalsError } = await supabase
            .from("medals")
            .select("name, achieved_at")
            .eq("child_id", user.id);

          if (medalsError) {
            throw medalsError;
          }
          setMedals(medalsData || []);
        } catch (error: any) {
          console.error("Erro ao buscar dados do perfil:", error.message);
          Alert.alert("Erro", "Não foi possível carregar os dados do perfil.");
          setParentName(null);
        } finally {
          setFetchingParentName(false);
          setFetchingMedals(false);
        }
      }
    };

    fetchParentNameAndMedals();
  }, [profile, user]);

  if (loading || fetchingParentName || fetchingMedals) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={{ color: theme.colors.text, marginTop: theme.spacing.m }}>
          A carregar perfil...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/Auth/page" />;
  }

  const handleEditProfile = () => {
    router.push("/(protected)/EditProfile/page");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons
            name={theme.dark ? "sunny" : "moon"}
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          O meu Perfil
        </Text>
        <TouchableOpacity onPress={handleEditProfile}>
          <Ionicons
            name="create-outline"
            size={theme.fontSizes.large}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Ionicons
          name="person-circle-outline"
          size={width * 0.3}
          color={theme.colors.primary}
          style={styles.profileIcon}
        />

        <Text style={[styles.userName, { color: theme.colors.text }]}>
          {profile?.name || "Nome do Utilizador"}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.secondary }]}>
          {profile?.email || "email@exemplo.com"}
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.m,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Função:
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>
            {profile?.role === "child"
              ? "Filho"
              : profile?.role === "admin"
              ? "Responsável"
              : profile?.role || "Membro"}
          </Text>
        </View>

        {profile?.role === "child" && parentName && (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.m,
              },
            ]}
          >
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              Responsável:
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.secondary }]}>
              {parentName}
            </Text>
          </View>
        )}

        {profile?.role === "child" && (
          <View style={styles.achievementsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Conquistas
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {medals.map((medal, index) => (
                <AchievementBadge key={index} medalName={medal.name} />
              ))}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.m,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Membro desde:
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.secondary }]}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString("pt-BR")
              : "Data Indisponível"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.m,
            },
          ]}
          onPress={signOut}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  headerText: {
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingVertical: height * 0.025,
  },
  profileIcon: {
    marginBottom: height * 0.025,
  },
  userName: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    marginBottom: height * 0.005,
  },
  userEmail: {
    fontSize: width * 0.04,
    marginBottom: height * 0.04,
  },
  infoCard: {
    width: "100%",
    padding: width * 0.04,
    borderWidth: 1,
    marginBottom: height * 0.015,
  },
  infoTitle: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    marginBottom: height * 0.005,
  },
  infoText: {
    fontSize: width * 0.035,
  },
  logoutButton: {
    marginTop: height * 0.04,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.06,
    alignItems: "center",
    marginBottom: height * 0.09,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
  achievementsContainer: {
    width: "100%",
    marginTop: height * 0.02,
    marginBottom: height * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: height * 0.01,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  badgeText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "bold",
  },
});
