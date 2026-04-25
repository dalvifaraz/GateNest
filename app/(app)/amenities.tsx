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
import { Amenity, BookingStatus, UserRole } from '../../types/database';

const AMENITY_EMOJIS: Record<string, string> = {
  gym: '🏋️',
  pool: '🏊',
  clubhouse: '🏛️',
  garden: '🌳',
  playground: '🛝',
  hall: '🎪',
  court: '🏸',
  parking: '🅿️',
  default: '🏢',
};

function getAmenityEmoji(name: string) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(AMENITY_EMOJIS)) {
    if (lower.includes(key)) return AMENITY_EMOJIS[key];
  }
  return AMENITY_EMOJIS.default;
}

interface BookingWithAmenity {
  id: string;
  amenity_id: string;
  booked_by: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  amenities?: { name: string };
}

export default function AmenitiesScreen() {
  const insets = useSafeAreaInsets();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [myBookings, setMyBookings] = useState<BookingWithAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'amenities' | 'bookings'>(
    'amenities',
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [addAmenityModal, setAddAmenityModal] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Booking form
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Amenity form
  const [amenityName, setAmenityName] = useState('');
  const [amenityDesc, setAmenityDesc] = useState('');
  const [amenityCapacity, setAmenityCapacity] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

    await Promise.all([
      fetchAmenities(profile.society_id),
      fetchMyBookings(user.id),
    ]);

    setLoading(false);
  };

  const fetchAmenities = async (sid: string) => {
    const { data, error } = await supabase
      .from('amenities')
      .select('*')
      .eq('society_id', sid)
      .eq('is_active', true)
      .order('name');

    if (!error && data) setAmenities(data);
  };

  const fetchMyBookings = async (uid: string) => {
    const { data, error } = await supabase
      .from('amenity_bookings')
      .select('*, amenities(name)')
      .eq('booked_by', uid)
      .order('booking_date', { ascending: false });

    if (!error && data) setMyBookings(data);
  };

  const handleBookAmenity = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setModalVisible(true);
  };

  const handleSubmitBooking = async () => {
    if (!bookingDate || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!selectedAmenity) return;

    setSubmitting(true);

    const { error } = await supabase.from('amenity_bookings').insert({
      amenity_id: selectedAmenity.id,
      booked_by: currentUserId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        '🎉 Booked!',
        `${selectedAmenity.name} booked for ${bookingDate}`,
      );
      setModalVisible(false);
      resetBookingForm();
      if (currentUserId) fetchMyBookings(currentUserId);
    }
    setSubmitting(false);
  };

  const handleAddAmenity = async () => {
    if (!amenityName) {
      Alert.alert('Error', 'Please enter amenity name');
      return;
    }
    if (!societyId) return;

    setSubmitting(true);

    const { error } = await supabase.from('amenities').insert({
      society_id: societyId,
      name: amenityName,
      description: amenityDesc,
      capacity: amenityCapacity ? parseInt(amenityCapacity) : null,
      is_active: true,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Amenity added!');
      setAddAmenityModal(false);
      resetAmenityForm();
      if (societyId) fetchAmenities(societyId);
    }
    setSubmitting(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('amenity_bookings')
              .update({ status: 'cancelled' })
              .eq('id', bookingId);

            if (!error && currentUserId) fetchMyBookings(currentUserId);
          },
        },
      ],
    );
  };

  const resetBookingForm = () => {
    setBookingDate('');
    setStartTime('');
    setEndTime('');
    setSelectedAmenity(null);
  };

  const resetAmenityForm = () => {
    setAmenityName('');
    setAmenityDesc('');
    setAmenityCapacity('');
  };

  const canManage = userRole === 'admin' || userRole === 'committee_member';

  const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
    pending: '#f59e0b',
    confirmed: '#22c55e',
    cancelled: '#ef4444',
  };

  const renderAmenity = ({ item }: { item: Amenity }) => (
    <TouchableOpacity
      style={styles.amenityCard}
      onPress={() => handleBookAmenity(item)}
    >
      <Text style={styles.amenityEmoji}>{getAmenityEmoji(item.name)}</Text>
      <View style={styles.amenityInfo}>
        <Text style={styles.amenityName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.amenityDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {item.capacity ? (
          <Text style={styles.amenityCapacity}>
            👥 Capacity: {item.capacity}
          </Text>
        ) : null}
      </View>
      <View style={styles.bookBtn}>
        <Text style={styles.bookBtnText}>Book</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBooking = ({ item }: { item: BookingWithAmenity }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingLeft}>
        <Text style={styles.bookingEmoji}>
          {getAmenityEmoji(item.amenities?.name || '')}
        </Text>
      </View>
      <View style={styles.bookingBody}>
        <Text style={styles.bookingName}>{item.amenities?.name}</Text>
        <Text style={styles.bookingDate}>
          📅{' '}
          {new Date(item.booking_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
        <Text style={styles.bookingTime}>
          🕐 {item.start_time} – {item.end_time}
        </Text>
      </View>
      <View style={styles.bookingRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: BOOKING_STATUS_COLORS[item.status] + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: BOOKING_STATUS_COLORS[item.status] },
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        {item.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelBooking(item.id)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Amenities</Text>
          <Text style={styles.headerSubtitle}>
            {amenities.length} available
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddAmenityModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'amenities' && styles.tabActive]}
          onPress={() => setActiveTab('amenities')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'amenities' && styles.tabTextActive,
            ]}
          >
            Amenities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'bookings' && styles.tabTextActive,
            ]}
          >
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : activeTab === 'amenities' ? (
        amenities.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🏊</Text>
            <Text style={styles.emptyTitle}>No amenities yet</Text>
            <Text style={styles.emptySubtitle}>
              {canManage
                ? 'Tap "+ Add" to add an amenity'
                : 'No amenities available'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={amenities}
            keyExtractor={(item) => item.id}
            renderItem={renderAmenity}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : myBookings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>
            Book an amenity from the Amenities tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={myBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Book Amenity Modal */}
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
              <Text style={styles.modalTitle}>
                Book {selectedAmenity?.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetBookingForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. 2026-05-01'
              placeholderTextColor={colors.textMuted}
              value={bookingDate}
              onChangeText={setBookingDate}
            />

            <Text style={styles.inputLabel}>Start Time * (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. 09:00'
              placeholderTextColor={colors.textMuted}
              value={startTime}
              onChangeText={setStartTime}
            />

            <Text style={styles.inputLabel}>End Time * (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. 11:00'
              placeholderTextColor={colors.textMuted}
              value={endTime}
              onChangeText={setEndTime}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitBooking}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Amenity Modal */}
      <Modal
        visible={addAmenityModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setAddAmenityModal(false)}
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
              <Text style={styles.modalTitle}>Add Amenity</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddAmenityModal(false);
                  resetAmenityForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. Swimming Pool, Gym, Clubhouse'
              placeholderTextColor={colors.textMuted}
              value={amenityName}
              onChangeText={setAmenityName}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder='Describe the amenity, rules, timings...'
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical='top'
              value={amenityDesc}
              onChangeText={setAmenityDesc}
            />

            <Text style={styles.inputLabel}>Capacity</Text>
            <TextInput
              style={styles.input}
              placeholder='Max number of people'
              placeholderTextColor={colors.textMuted}
              keyboardType='number-pad'
              value={amenityCapacity}
              onChangeText={setAmenityCapacity}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleAddAmenity}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Amenity</Text>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
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
  amenityCard: {
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
  amenityEmoji: { fontSize: 36 },
  amenityInfo: { flex: 1 },
  amenityName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  amenityDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 2,
  },
  amenityCapacity: { fontSize: 12, color: colors.textMuted },
  bookBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  bookBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingLeft: { paddingTop: 2 },
  bookingEmoji: { fontSize: 28 },
  bookingBody: { flex: 1, gap: 3 },
  bookingName: { fontSize: 15, fontWeight: '700', color: colors.text },
  bookingDate: { fontSize: 12, color: colors.textMuted },
  bookingTime: { fontSize: 12, color: colors.textMuted },
  bookingRight: { alignItems: 'flex-end', gap: spacing.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  cancelBtnText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
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
  textArea: { height: 100 },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
