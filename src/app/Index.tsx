// app/index.tsx
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

 
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>Verificando autenticação...</Text>
      </View>
    );
  }

  
  if (session) {
    return <Redirect href="/Dashboard/page" />;
  } else {
    return <Redirect href="/Auth/page" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
});