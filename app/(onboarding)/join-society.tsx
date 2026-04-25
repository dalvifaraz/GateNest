import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function JoinSocietyScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Find society by invite code
    const { data: society, error } = await supabase
      .from('societies')
      .select('id, name')
      .eq('invite_code', code.trim().toUpperCase())
      .single();

    if (error || !society) {
      Alert.alert(
        'Invalid Code',
        'No society found with this invite code. Please check and try again.',
      );
      setLoading(false);
      return;
    }

    // Link user to society
    const { error: updateError } = await supabase
      .from('users')
      .update({ society_id: society.id })
      .eq('id', user.id);

    if (updateError) {
      Alert.alert('Error', updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert('🎉 Joined Successfully!', `You have joined ${society.name}`, [
      {
        text: 'Go to Dashboard',
        onPress: () => router.replace('/(app)/dashboard'),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Join with Code</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by your society admin
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder='e.g. ABC123'
            placeholderTextColor={colors.textMuted}
            autoCapitalize='characters'
            autoCorrect={false}
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Join Society</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    width: '80%',
    marginBottom: spacing.lg,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '80%',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
