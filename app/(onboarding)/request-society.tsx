import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
import { Society } from '../../types/database';

export default function RequestSocietyScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Society[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('societies')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (!error && data) setResults(data);
    setLoading(false);
  };

  const handleRequest = async (society: Society) => {
    setRequesting(society.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already requested
    const { data: existing } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('society_id', society.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      Alert.alert(
        'Already Requested',
        `Your request to join ${society.name} is ${existing.status}.`,
      );
      setRequesting(null);
      return;
    }

    const { error } = await supabase.from('join_requests').insert({
      society_id: society.id,
      user_id: user.id,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        '✅ Request Sent!',
        `Your request to join ${society.name} has been sent. You'll be notified once the admin approves.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(onboarding)/pending'),
          },
        ],
      );
    }
    setRequesting(null);
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

        <Text style={styles.title}>Find Your Society</Text>
        <Text style={styles.subtitle}>Search by society name</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder='Search society name...'
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType='search'
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            {loading ? (
              <ActivityIndicator color={colors.white} size='small' />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {results.length === 0 && !loading ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>Search for your society above</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.resultCard}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress}>
                    📍 {item.city}, {item.state}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.requestBtn,
                    requesting === item.id && { opacity: 0.7 },
                  ]}
                  onPress={() => handleRequest(item)}
                  disabled={requesting === item.id}
                >
                  {requesting === item.id ? (
                    <ActivityIndicator color={colors.white} size='small' />
                  ) : (
                    <Text style={styles.requestBtnText}>Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textMuted },
  list: { gap: spacing.sm },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  resultAddress: { fontSize: 12, color: colors.textMuted },
  requestBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  requestBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
