import { Session } from '@supabase/supabase-js';
import { router, SplashScreen, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    // Check if user has society
    supabase
      .from('users')
      .select('society_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.society_id) {
          router.replace('/(app)/dashboard');
        } else {
          router.replace('/(onboarding)/welcome');
        }
      });
  }, [session, loading]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='index' />
        <Stack.Screen name='(auth)/login' />
        <Stack.Screen name='(auth)/register' />
        <Stack.Screen name='(onboarding)' />
        <Stack.Screen name='(onboarding)/create-society' />
        <Stack.Screen name='(onboarding)/join-society' />
        <Stack.Screen name='(onboarding)/request-society' />
        <Stack.Screen name='(onboarding)/pending' />
        <Stack.Screen name='(app)/dashboard' />
      </Stack>
    </SafeAreaProvider>
  );
}
