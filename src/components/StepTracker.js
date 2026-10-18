import React, { useCallback, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Pedometer } from 'expo-sensors';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';
import GlassCard from './GlassCard';
import { getGoals } from '../eugene/services/storage';

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function StepTracker() {
  const navigation = useNavigation();
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState('loading');
  const [stepGoal, setStepGoal] = useState(null);
  const baseStepsRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let subscription;

      const loadSteps = async () => {
        try {
          setStatus('loading');
          const goals = await getGoals();
          if (!active) return;
          setStepGoal(goals.find((goal) => goal.metric === 'daily_steps') || null);

          const available = await Pedometer.isAvailableAsync();
          if (!active) return;
          if (!available) {
            setStatus('unavailable');
            return;
          }

          let permission = await Pedometer.getPermissionsAsync();
          if (!permission.granted && permission.canAskAgain) {
            permission = await Pedometer.requestPermissionsAsync();
          }
          if (!active) return;
          if (!permission.granted) {
            setStatus('denied');
            return;
          }

          let historicalSteps = 0;
          if (Platform.OS === 'ios') {
            const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
            historicalSteps = Number(result?.steps) || 0;
          }
          if (!active) return;

          baseStepsRef.current = historicalSteps;
          setSteps(historicalSteps);
          setStatus('ready');
          subscription = Pedometer.watchStepCount((result) => {
            if (!active) return;
            setSteps(baseStepsRef.current + (Number(result?.steps) || 0));
          });
        } catch (error) {
          if (active) setStatus('error');
        }
      };

      loadSteps();
      return () => {
        active = false;
        subscription?.remove();
      };
    }, []),
  );

  const openStepGoal = () => {
    navigation.navigate('Home', { tab: 'Goals', tabSelectionId: Date.now(), goalPromptId: Date.now() });
  };

  const goalTarget = Number(stepGoal?.target) || 0;
  const goalProgress = goalTarget > 0 ? Math.min(100, Math.round((steps / goalTarget) * 100)) : 0;

  const goalContent = stepGoal ? (
    <View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
      </View>
      <View style={styles.goalMetaRow}>
        <Text style={styles.goalText}>Daily goal: {Math.round(goalTarget).toLocaleString()} steps</Text>
        <Text style={styles.goalPercentage}>{goalProgress}%</Text>
      </View>
    </View>
  ) : (
    <TouchableOpacity onPress={openStepGoal} accessibilityLabel="Set a daily step goal">
      <Text style={styles.setGoalText}>Set a daily step goal</Text>
    </TouchableOpacity>
  );

  if (status !== 'ready') {
    const message = status === 'loading'
      ? 'Checking motion access…'
      : status === 'denied'
        ? 'Motion access is off'
        : status === 'unavailable'
          ? 'Step tracking is not available on this device'
          : 'Steps could not be loaded';

    return (
      <GlassCard style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.iconCircle}>
          <Ionicons name="footsteps-outline" size={27} color={Colors.primary} />
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>{message}</Text>
          {status === 'denied' ? (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsLink}>Open Settings</Text>
            </TouchableOpacity>
          ) : null}
          {goalContent}
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.iconCircle}>
        <Ionicons name="footsteps" size={27} color={Colors.primary} />
      </View>
      <View style={styles.stepContent}>
        <View style={styles.valueRow}>
          <Text style={styles.stepValue}>{Math.round(steps).toLocaleString()}</Text>
          <Text style={styles.stepUnit}>steps</Text>
        </View>
        {goalContent}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  stepContent: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stepValue: { color: Colors.text, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold },
  stepUnit: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: Colors.backgroundSecondary, overflow: 'hidden', marginTop: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  goalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  goalText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  goalPercentage: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  setGoalText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm },
  statusContent: { flex: 1 },
  statusTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  settingsLink: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm },
});
