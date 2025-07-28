import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { supabase } from '@/supabaseClient';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '@/utils/timeAgo';

const { width, height } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      const unreadIds = data?.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds && unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (e: any) {
      console.error("Failed to fetch notifications:", e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications().then(() => setRefreshing(false));
  }, [fetchNotifications]);

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={[styles.notificationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: item.is_read ? 0.6 : 1 }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="notifications-outline" size={24} color={'#fff'} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.message, { color: theme.colors.secondary }]}>{item.message}</Text>
        <Text style={[styles.timestamp, { color: theme.colors.secondary }]}>{timeAgo(item.created_at)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Notificações</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={theme.colors.secondary} />
              <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
                Você não tem nenhuma notificação ainda.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: width * 0.05,
    paddingBottom: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.2,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});
