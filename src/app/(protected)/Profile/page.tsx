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

const NotificationBadge = ({ count }: { count: number }) => {
  const { theme } = useTheme();
  if (count === 0) return null;

  return (
    <View
      style={[
        styles.notificationBadge,
        { backgroundColor: theme.colors.danger },
      ]}
    >
      <Text style={styles.notificationBadgeText}>{count}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    profile,
    loading,
    signOut,
    session,
    unreadNotifications,
    markNotificationsAsRead,
  } = useAuth();
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

            if (
              parentProfileError &&
              parentProfileError.code !== "PGRST116"
            ) {
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

  const handleGoToNotifications = () => {
    markNotificationsAsRead();
    router.push("/(protected)/Notifications/page");
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleGoToNotifications}>
            <View>
              <Ionicons
                name="notifications-outline"
                size={theme.fontSizes.large}
                color={theme.colors.text}
              />
              <NotificationBadge count={unreadNotifications} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditProfile} style={{ marginLeft: 15 }}>
            <Ionicons
              name="create-outline"
              size={theme.fontSizes.large}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
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

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons
            name="briefcase-outline"
            size={24}
            color={theme.colors.primary}
            style={styles.infoIcon}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.secondary }]}>
              Função:
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {profile?.role === "child"
                ? "Filho"
                : profile?.role === "admin"
                ? "Responsável"
                : profile?.role || "Membro"}
            </Text>
          </View>
        </View>

        {profile?.role === "child" && parentName && (
          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.card }]}
          >
            <Ionicons
              name="people-outline"
              size={24}
              color={theme.colors.primary}
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text
                style={[styles.infoTitle, { color: theme.colors.secondary }]}
              >
                Responsável:
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                {parentName}
              </Text>
            </View>
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

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons
            name="calendar-outline"
            size={24}
            color={theme.colors.primary}
            style={styles.infoIcon}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.secondary }]}>
              Membro desde:
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("pt-BR")
                : "Data Indisponível"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: theme.colors.danger,
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
    paddingHorizontal: width * 0.05,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: height * 0.06,
    marginBottom: height * 0.025,
  },
  headerText: {
    flex: 1,
    left: width * 0.04,
    textAlign: "center",
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    right: -6,
    top: -3,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingVertical: height * 0.025,
    paddingBottom: height * 0.05,
  },
  profileIcon: {
    marginBottom: height * 0.01,
  },
  userName: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    marginBottom: height * 0.01,
  },
  userEmail: {
    fontSize: width * 0.04,
    marginBottom: height * 0.04,
  },
  infoCard: {
    width: "100%",
    padding: width * 0.05,
    borderRadius: 15,
    marginBottom: height * 0.02,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoIcon: {
    marginRight: width * 0.04,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: width * 0.035,
    marginBottom: 2,
  },
  infoText: {
    fontSize: width * 0.045,
    fontWeight: "bold",
  },
  logoutButton: {
    marginTop: height * 0.03,
    paddingVertical: height * 0.018,
    width: "100%",
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
    alignSelf: "flex-start",
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