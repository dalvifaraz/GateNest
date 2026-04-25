import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.top}>
        <Text style={styles.emoji}>🏘️</Text>
        <Text style={styles.title}>Welcome to GateNest</Text>
        <Text style={styles.subtitle}>
          To get started, create a new society or join an existing one
        </Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/create-society')}
        >
          <Text style={styles.optionEmoji}>🏗️</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Create a Society</Text>
            <Text style={styles.optionDesc}>
              Set up a new society and invite residents
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/join-society')}
        >
          <Text style={styles.optionEmoji}>🔑</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Join with Invite Code</Text>
            <Text style={styles.optionDesc}>
              Enter a code shared by your society admin
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/request-society')}
        >
          <Text style={styles.optionEmoji}>🔍</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Request to Join</Text>
            <Text style={styles.optionDesc}>
              Search for your society and send a request
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  top: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  options: { gap: spacing.md },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionEmoji: { fontSize: 32 },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 24,
    color: colors.textMuted,
  },
});
