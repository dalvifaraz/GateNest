import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateSocietyScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  const handleCreate = async () => {
    if (!name || !address || !city || !state || !pincode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const inviteCode = generateInviteCode();

    // Create society
    const { data: society, error: societyError } = await supabase
      .from('societies')
      .insert({
        name,
        address,
        city,
        state,
        pincode,
        contact_phone: phone,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (societyError) {
      Alert.alert('Error', societyError.message);
      setLoading(false);
      return;
    }

    // Link user to society as admin
    const { error: userError } = await supabase
      .from('users')
      .update({
        society_id: society.id,
        role: 'admin',
      })
      .eq('id', user.id);

    if (userError) {
      Alert.alert('Error', userError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    Alert.alert(
      '🎉 Society Created!',
      `Your invite code is:\n\n${inviteCode}\n\nShare this with your residents so they can join.`,
      [
        {
          text: 'Go to Dashboard',
          onPress: () => router.replace('/(app)/dashboard'),
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md },
        ]}
        keyboardShouldPersistTaps='handled'
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Society</Text>
        <Text style={styles.subtitle}>Fill in your society details</Text>

        <Text style={styles.label}>Society Name *</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. Green Valley CHS'
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          placeholder='Plot no, Street, Area'
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. Mumbai'
          placeholderTextColor={colors.textMuted}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>State *</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. Maharashtra'
          placeholderTextColor={colors.textMuted}
          value={state}
          onChangeText={setState}
        />

        <Text style={styles.label}>Pincode *</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. 400001'
          placeholderTextColor={colors.textMuted}
          keyboardType='number-pad'
          value={pincode}
          onChangeText={setPincode}
        />

        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          style={styles.input}
          placeholder='Society office number'
          placeholderTextColor={colors.textMuted}
          keyboardType='phone-pad'
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create Society</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    marginBottom: spacing.md,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
