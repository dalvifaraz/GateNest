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
  Announcement,
  AnnouncementAudience,
  UserRole,
} from '../../types/database';

const AUDIENCE_COLORS: Record<AnnouncementAudience, string> = {
  all: '#2563eb',
  residents: '#22c55e',
  committee: '#f59e0b',
  building: '#8b5cf6',
};

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  residents: 'Residents',
  committee: 'Committee',
  building: 'Building',
};

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    loadUserAndAnnouncements();
  }, []);

  const loadUserAndAnnouncements = async () => {
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

    if (profile) {
      setSocietyId(profile.society_id);
      setUserRole(profile.role);
      await fetchAnnouncements(profile.society_id);
    }
    setLoading(false);
  };

  const fetchAnnouncements = async (sid: string) => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('society_id', sid)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setAnnouncements(data);
  };

  const canPost = userRole === 'admin' || userRole === 'committee_member';

  const handlePost = async () => {
    if (!title || !body) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }
    if (!societyId) {
      Alert.alert('Error', 'You are not linked to a society yet');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('announcements').insert({
      society_id: societyId,
      created_by: currentUserId,
      title,
      body,
      audience,
      is_pinned: isPinned,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Announcement posted!');
      setModalVisible(false);
      resetForm();
      if (societyId) fetchAnnouncements(societyId);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAudience('all');
    setIsPinned(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <View style={[styles.card, item.is_pinned && styles.pinnedCard]}>
      {item.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>📌 Pinned</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View
          style={[
            styles.audienceBadge,
            { backgroundColor: AUDIENCE_COLORS[item.audience] + '15' },
          ]}
        >
          <Text
            style={[
              styles.audienceText,
              { color: AUDIENCE_COLORS[item.audience] },
            ]}
          >
            {AUDIENCE_LABELS[item.audience]}
          </Text>
        </View>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      <Text style={styles.cardDate}>🕐 {formatDate(item.created_at)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSubtitle}>
            {announcements.length} notice{announcements.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {canPost && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📢</Text>
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptySubtitle}>
            {canPost
              ? 'Tap "+ Post" to make an announcement'
              : 'Check back later for society updates'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderAnnouncement}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Post Announcement Modal */}
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
              <Text style={styles.modalTitle}>New Announcement</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g. Water supply disruption'
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder='Write your announcement here...'
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical='top'
              value={body}
              onChangeText={setBody}
            />

            <Text style={styles.inputLabel}>Audience</Text>
            <View style={styles.audienceGrid}>
              {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map(
                (a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.audienceOption,
                      audience === a && {
                        backgroundColor: AUDIENCE_COLORS[a],
                        borderColor: AUDIENCE_COLORS[a],
                      },
                    ]}
                    onPress={() => setAudience(a)}
                  >
                    <Text
                      style={[
                        styles.audienceOptionText,
                        audience === a && { color: colors.white },
                      ]}
                    >
                      {AUDIENCE_LABELS[a]}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <TouchableOpacity
              style={styles.pinToggle}
              onPress={() => setIsPinned(!isPinned)}
            >
              <Text style={styles.pinToggleText}>
                {isPinned ? '📌' : '📄'}{' '}
                {isPinned ? 'Pinned announcement' : 'Regular announcement'}
              </Text>
              <View
                style={[
                  styles.toggleDot,
                  {
                    backgroundColor: isPinned ? colors.primary : colors.border,
                  },
                ]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handlePost}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Post Announcement</Text>
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
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pinnedCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  pinnedBadge: {
    marginBottom: spacing.xs,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  audienceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  audienceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
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
  textArea: {
    height: 120,
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  audienceOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  audienceOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pinToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinToggleText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
