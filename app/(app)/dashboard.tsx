import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { User } from '../../types/database';

interface StatCard {
  emoji: string;
  label: string;
  value: string;
  color: string;
}

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      setUser(data);
    }
    setLoading(false);
  };

  const stats: StatCard[] = [
    { emoji: '👤', label: 'Visitors Today', value: '0', color: '#eff6ff' },
    { emoji: '📢', label: 'Announcements', value: '0', color: '#f0fdf4' },
    { emoji: '💳', label: 'Dues Pending', value: '₹0', color: '#fff7ed' },
    { emoji: '🏊', label: 'Bookings', value: '0', color: '#fdf4ff' },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.name}>{user?.full_name || 'Resident'}</Text>
          <Text style={styles.role}>
            {user?.role?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Society card */}
      <View style={styles.societyCard}>
        <Text style={styles.societyEmoji}>🏘️</Text>
        <View>
          <Text style={styles.societyTitle}>GateNest Society</Text>
          <Text style={styles.societySubtitle}>Welcome home</Text>
        </View>
      </View>

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[styles.statCard, { backgroundColor: stat.color }]}
          >
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { emoji: '👤', label: 'Add Visitor' },
          { emoji: '📢', label: 'Notices' },
          { emoji: '💳', label: 'Pay Dues' },
          { emoji: '🏊', label: 'Book Amenity' },
          { emoji: '🔧', label: 'Complaints' },
          { emoji: '📞', label: 'Contacts' },
        ].map((action, index) => (
          <TouchableOpacity key={index} style={styles.actionCard}>
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  role: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: 4,
  },
  signOutText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  societyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: -1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  societyEmoji: { fontSize: 36 },
  societyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  societySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  statEmoji: { fontSize: 24, marginBottom: spacing.xs },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  actionCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  actionEmoji: { fontSize: 28, marginBottom: spacing.xs },
  actionLabel: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
