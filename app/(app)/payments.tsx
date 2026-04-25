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
import {
  ChargeStatus,
  MaintenanceCharge,
  UserRole,
} from '../../types/database';

const STATUS_COLORS: Record<ChargeStatus, string> = {
  pending: '#f59e0b',
  paid: '#22c55e',
  overdue: '#ef4444',
};

const STATUS_LABELS: Record<ChargeStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
};

interface ChargeWithUnit extends MaintenanceCharge {
  units?: { unit_number: string };
}

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const [charges, setCharges] = useState<ChargeWithUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ChargeStatus | 'all'>('all');

  // Summary
  const [totalPending, setTotalPending] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);

  // Form
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetUnitId, setTargetUnitId] = useState('');

  useEffect(() => {
    loadUserAndCharges();
  }, []);

  const loadUserAndCharges = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('society_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    setSocietyId(profile.society_id);
    setUserRole(profile.role);

    const { data: residentProfile } = await supabase
      .from('resident_profiles')
      .select('unit_id')
      .eq('user_id', user.id)
      .single();

    if (residentProfile?.unit_id) {
      setUnitId(residentProfile.unit_id);
    }

    await fetchCharges(
      profile.society_id,
      profile.role,
      residentProfile?.unit_id,
    );
    setLoading(false);
  };

  const fetchCharges = async (sid: string, role: UserRole, uid?: string) => {
    let query = supabase
      .from('maintenance_charges')
      .select('*, units(unit_number)')
      .eq('society_id', sid)
      .order('created_at', { ascending: false });

    // Residents only see their own unit charges
    if (role === 'resident' && uid) {
      query = query.eq('unit_id', uid);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCharges(data);
      setTotalPending(
        data
          .filter((c) => c.status === 'pending')
          .reduce((sum, c) => sum + c.amount, 0),
      );
      setTotalOverdue(
        data
          .filter((c) => c.status === 'overdue')
          .reduce((sum, c) => sum + c.amount, 0),
      );
    }
  };

  const handleCreateCharge = async () => {
    if (!amount || !description || !dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!societyId) return;

    setSubmitting(true);

    const { error } = await supabase.from('maintenance_charges').insert({
      society_id: societyId,
      unit_id: targetUnitId || unitId,
      amount: parseFloat(amount),
      description,
      due_date: dueDate,
      status: 'pending',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Charge created successfully');
      setModalVisible(false);
      resetForm();
      if (societyId && userRole)
        fetchCharges(societyId, userRole, unitId || undefined);
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (charge: ChargeWithUnit) => {
    if (charge.status === 'paid') return;

    Alert.alert(
      'Mark as Paid',
      `Mark ₹${charge.amount} for "${charge.description}" as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Paid',
          onPress: async () => {
            // Create payment record
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                charge_id: charge.id,
                paid_by: currentUserId,
                amount: charge.amount,
                status: 'success',
                paid_at: new Date().toISOString(),
              });

            if (paymentError) {
              Alert.alert('Error', paymentError.message);
              return;
            }

            // Update charge status
            const { error: chargeError } = await supabase
              .from('maintenance_charges')
              .update({ status: 'paid' })
              .eq('id', charge.id);

            if (chargeError) {
              Alert.alert('Error', chargeError.message);
            } else {
              if (societyId && userRole)
                fetchCharges(societyId, userRole, unitId || undefined);
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDueDate('');
    setTargetUnitId('');
  };

  const filteredCharges =
    activeFilter === 'all'
      ? charges
      : charges.filter((c) => c.status === activeFilter);

  const canManage = userRole === 'admin' || userRole === 'committee_member';

  const renderCharge = ({ item }: { item: ChargeWithUnit }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleMarkPaid(item)}
      activeOpacity={item.status === 'paid' ? 1 : 0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>
          {item.status === 'paid'
            ? '✅'
            : item.status === 'overdue'
              ? '🚨'
              : '💳'}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDescription}>{item.description}</Text>
        {item.units?.unit_number && (
          <Text style={styles.cardUnit}>🏠 Unit {item.units.unit_number}</Text>
        )}
        <Text style={styles.cardDate}>
          📅 Due:{' '}
          {new Date(item.due_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
        {item.status !== 'paid' && (
          <Text style={styles.tapHint}>Tap to mark as paid</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>
          ₹{item.amount.toLocaleString('en-IN')}
        </Text>
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
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Payments</Text>
          <Text style={styles.headerSubtitle}>Maintenance & dues</Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#fff7ed' }]}>
          <Text style={styles.summaryEmoji}>⏳</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalPending.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.summaryEmoji}>🚨</Text>
          <Text style={[styles.summaryAmount, { color: colors.danger }]}>
            ₹{totalOverdue.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.summaryEmoji}>✅</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            ₹
            {charges
              .filter((c) => c.status === 'paid')
              .reduce((sum, c) => sum + c.amount, 0)
              .toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(['all', 'pending', 'overdue', 'paid'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : filteredCharges.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={styles.emptyTitle}>No charges found</Text>
          <Text style={styles.emptySubtitle}>
            {canManage
              ? 'Tap "+ Add" to create a maintenance charge'
              : 'No dues at the moment'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCharges}
          keyExtractor={(item) => item.id}
          renderItem={renderCharge}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Charge Modal */}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Charge</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. 2500'
              placeholderTextColor={colors.textMuted}
              keyboardType='numeric'
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. Monthly Maintenance - June 2026'
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>Due Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. 2026-05-31'
              placeholderTextColor={colors.textMuted}
              value={dueDate}
              onChangeText={setDueDate}
            />

            <Text style={styles.inputLabel}>
              Unit ID (optional — leave blank for all)
            </Text>
            <TextInput
              style={styles.input}
              placeholder='Paste unit UUID from Supabase'
              placeholderTextColor={colors.textMuted}
              value={targetUnitId}
              onChangeText={setTargetUnitId}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleCreateCharge}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Create Charge</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
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
  addButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  summaryRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryEmoji: { fontSize: 20, marginBottom: 4 },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  summaryLabel: { fontSize: 11, color: colors.textMuted },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: colors.white },
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
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  list: { padding: spacing.lg, gap: spacing.sm },
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
  cardLeft: { alignItems: 'center', paddingTop: 2 },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 3 },
  cardDescription: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardUnit: { fontSize: 12, color: colors.textMuted },
  cardDate: { fontSize: 12, color: colors.textMuted },
  tapHint: { fontSize: 11, color: colors.primary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  cardAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: spacing.lg, paddingBottom: 48 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: spacing.xs },
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
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
