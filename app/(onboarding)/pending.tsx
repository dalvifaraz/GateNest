import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('society_id')
      .eq('id', user.id)
      .single();

    if (profile?.society_id) {
      router.replace('/(app)/dashboard');
    } else {
      setChecking(false);
      alert('Your request is still pending. Please wait for admin approval.');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.emoji}>⏳</Text>
      <Text style={styles.title}>Request Sent!</Text>
      <Text style={styles.subtitle}>
        Your request to join the society has been sent to the admin. You'll be
        able to access the app once they approve your request.
      </Text>

      <TouchableOpacity
        style={[styles.button, checking && { opacity: 0.7 }]}
        onPress={checkStatus}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Check Status</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  logoutBtn: { padding: spacing.md },
  logoutText: { color: colors.textMuted, fontSize: 14 },
});
