import React, { useRef, useState } from 'react';
import {
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { addWorkout, todayLocalISO } from '../eugene/services/storage';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';
import useFloatingTabBarClearance from '../hooks/useFloatingTabBarClearance';
import LiquidGlassBackButton from '../components/LiquidGlassBackButton';

const WORKOUT_DAYS = [
  { title: 'Full Body', icon: 'body-outline' },
  { title: 'Upper Body', icon: 'barbell-outline' },
  { title: 'Lower Body', icon: 'walk-outline' },
  { title: 'Push Day', icon: 'arrow-up-circle-outline' },
  { title: 'Pull Day', icon: 'arrow-down-circle-outline' },
  { title: 'Leg Day', icon: 'fitness-outline' },
  { title: 'Arm Day', icon: 'barbell-outline' },
  { title: 'Core Day', icon: 'ellipse-outline' },
];

export default function WorkoutLogScreen() {
  const navigation = useNavigation();
  const tabBarClearance = useFloatingTabBarClearance();
  const scrollRef = useRef(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const revealBottomFields = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  };

  const saveWorkout = async () => {
    const workoutTitle = title.trim();
    const durationMin = Number.parseFloat(duration);
    if (!workoutTitle) {
      setError('Choose a workout type or enter your own.');
      return;
    }
    if (!durationMin || durationMin <= 0) {
      setError('Enter a duration greater than 0 minutes.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addWorkout({
        date: todayLocalISO(),
        title: workoutTitle,
        durationMin: Math.round(durationMin),
        note: note.trim(),
      });
      Alert.alert('Workout saved', 'Your workout was saved successfully.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (saveError) {
      setSaving(false);
      setError('The workout could not be saved. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <LiquidGlassBackButton onPress={() => navigation.goBack()} accessibilityLabel="Cancel workout log" />
        </View>
        <Text style={styles.headerTitle}>Log Workout</Text>
        <TouchableOpacity
          style={[styles.headerSide, styles.logsButton]}
          onPress={() => navigation.navigate('MealLogs', { logType: 'workouts', selectionId: Date.now() })}
        >
          <Text style={styles.logsButtonText}>View Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.introIcon}>
          <Ionicons name="barbell-outline" size={32} color={Colors.workoutLog} />
        </View>
        <Text style={styles.title}>What did you train?</Text>
        <Text style={styles.subtitle}>Choose a workout day or enter a custom name.</Text>

        <View style={styles.presets}>
          {WORKOUT_DAYS.map((workout) => {
            const selected = title === workout.title;
            return (
              <TouchableOpacity
                key={workout.title}
                style={[styles.preset, selected && styles.presetSelected]}
                onPress={() => {
                  setTitle(workout.title);
                  setError('');
                }}
                accessibilityState={{ selected }}
              >
                <Ionicons name={workout.icon} size={19} color={selected ? Colors.textWhite : Colors.workoutLog} />
                <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{workout.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>CUSTOM WORKOUT</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setError('');
          }}
          placeholder="e.g. Chest and back"
          placeholderTextColor={Colors.textLight}
          returnKeyType="next"
        />

        <Text style={styles.label}>DURATION</Text>
        <View style={styles.durationRow}>
          <TextInput
            style={[styles.input, styles.durationInput]}
            value={duration}
            onChangeText={(value) => {
              setDuration(value);
              setError('');
            }}
            placeholder="45"
            placeholderTextColor={Colors.textLight}
            keyboardType="number-pad"
            onFocus={revealBottomFields}
          />
          <Text style={styles.durationUnit}>minutes</Text>
        </View>

        <Text style={styles.label}>NOTES (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Anything you want to remember?"
          placeholderTextColor={Colors.textLight}
          multiline
          textAlignVertical="top"
          onFocus={revealBottomFields}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveWorkout}
          disabled={saving}
          accessibilityRole="button"
        >
          <Feather name="check" size={19} color={Colors.textWhite} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Workout'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  headerSide: { width: 76, minHeight: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, color: Colors.text, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  logsButton: { alignItems: 'flex-end' },
  logsButtonText: { color: Colors.workoutLog, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  scroll: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: 140 },
  introIcon: { width: 64, height: 64, borderRadius: BorderRadius.full, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.workoutLogSoft },
  title: { color: Colors.text, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold, textAlign: 'center', marginTop: Spacing.lg },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  preset: { width: '48%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, backgroundColor: Colors.cardBackground },
  presetSelected: { backgroundColor: Colors.workoutLog },
  presetText: { flex: 1, color: Colors.text, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  presetTextSelected: { color: Colors.textWhite },
  label: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, letterSpacing: 0.7, marginBottom: Spacing.sm },
  input: { minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.cardBackground, color: Colors.text, fontSize: Typography.fontSize.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  durationInput: { flex: 1 },
  durationUnit: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.lg, marginRight: Spacing.sm },
  noteInput: { minHeight: 100, paddingTop: Spacing.md },
  error: { color: Colors.error, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  saveButton: { minHeight: 54, borderRadius: BorderRadius.full, backgroundColor: Colors.workoutLog, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: Colors.textWhite, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold },
});
