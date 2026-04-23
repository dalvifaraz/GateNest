import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

export default function VisitorsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 Visitors coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: { fontSize: 16, color: colors.textMuted },
});
