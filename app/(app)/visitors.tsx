import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { Visitor, VisitorStatus } from '../../types/database';

const STATUS_COLORS: Record<VisitorStatus, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  checked_in: '#2563eb',
  checked_out: '#888888',
};

const STATUS_LABELS: Record<VisitorStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
};

export default function VisitorsScreen() {
  const insets = useSafeAreaInsets();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedAt, setExpectedAt] = useState('');

  useEffect(() => {
    loadUserAndVisitors();
  }, []);

  const loadUserAndVisitors = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('society_id')
      .eq('id', user.id)
      .single();

    if (profile?.society_id) {
      setSocietyId(profile.society_id);
    }

    const { data: residentProfile } = await supabase
      .from('resident_profiles')
      .select('unit_id')
      .eq('user_id', user.id)
      .single();

    if (residentProfile?.unit_id) {
      setUnitId(residentProfile.unit_id);
    }

    await fetchVisitors(user.id);
  };

  const fetchVisitors = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('approved_by', userId)
      .order('created_at', { ascending: false });

    if (!error && data) setVisitors(data);
    setLoading(false);
  };

  const handleAddVisitor = async () => {
    if (!visitorName || !purpose) {
      Alert.alert('Error', 'Please fill visitor name and purpose');
      return;
    }
    if (!societyId) {
      Alert.alert('Error', 'You are not linked to a society yet');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('visitors').insert({
      society_id: societyId,
      unit_id: unitId,
      approved_by: currentUserId,
      visitor_name: visitorName,
      visitor_phone: visitorPhone,
      purpose,
      status: 'approved',
      expected_at: expectedAt || new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Visitor added successfully');
      setModalVisible(false);
      resetForm();
      if (currentUserId) fetchVisitors(currentUserId);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setVisitorName('');
    setVisitorPhone('');
    setPurpose('');
    setExpectedAt('');
  };

  const renderVisitor = ({ item }: { item: Visitor }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {item.visitor_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.visitorName}>{item.visitor_name}</Text>
        {item.visitor_phone ? (
          <Text style={styles.visitorPhone}>📞 {item.visitor_phone}</Text>
        ) : null}
        <Text style={styles.visitorPurpose}>🎯 {item.purpose}</Text>
        <Text style={styles.visitorTime}>
          🕐{' '}
          {new Date(item.expected_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}
          >
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Visitors</Text>
          <Text style={styles.headerSubtitle}>
            {visitors.length} total visitor{visitors.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : visitors.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyTitle}>No visitors yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "+ Add" to register an expected visitor
          </Text>
        </View>
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderVisitor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Visitor Modal */}
      <Modal
        visible={modalVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modal}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps='handled'
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Visitor</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Visitor Name *</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter full name'
              placeholderTextColor={colors.textMuted}
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter phone number'
              placeholderTextColor={colors.textMuted}
              keyboardType='phone-pad'
              value={visitorPhone}
              onChangeText={setVisitorPhone}
            />

            <Text style={styles.inputLabel}>Purpose of Visit *</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. Delivery, Guest, Repair'
              placeholderTextColor={colors.textMuted}
              value={purpose}
              onChangeText={setPurpose}
            />

            <Text style={styles.inputLabel}>Expected Date & Time</Text>
            <TextInput
              style={styles.input}
              placeholder='DD/MM/YYYY HH:MM (optional)'
              placeholderTextColor={colors.textMuted}
              value={expectedAt}
              onChangeText={setExpectedAt}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleAddVisitor}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Visitor</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  visitorPhone: {
    fontSize: 13,
    color: colors.textMuted,
  },
  visitorPurpose: {
    fontSize: 13,
    color: colors.textMuted,
  },
  visitorTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  inputLabel: {
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
