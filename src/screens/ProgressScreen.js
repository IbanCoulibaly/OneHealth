import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pedometer } from 'expo-sensors';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';
import { useUnits } from '../contexts/UnitContext';
import useFloatingTabBarClearance from '../hooks/useFloatingTabBarClearance';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import { addWeightEntry, getFoods, getHealthGoals, getStepHistory, getUserProfile, getWeightEntries, saveStepSnapshot } from '../eugene/services/storage';

const KG_PER_LB = 0.45359237;
const localDay = (value = new Date()) => {
  const d = new Date(value); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const daysAgo = (date) => Math.floor((new Date() - new Date(`${date}T12:00:00`)) / 86400000);
const average = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;

async function getTodaySteps() {
  try {
    if (Platform.OS !== 'ios' || !(await Pedometer.isAvailableAsync())) return 0;
    const permission = await Pedometer.getPermissionsAsync();
    if (!permission.granted) return 0;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Number((await Pedometer.getStepCountAsync(start, new Date()))?.steps) || 0;
  } catch { return 0; }
}

function LineGraph({ values, color = Colors.primary, height = 64 }) {
  if (values.length < 2) return <View style={[styles.lineGraphEmpty, { height }]}><Text style={styles.emptyChart}>Add more data to see a line.</Text></View>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.1);
  const points = values.map((value, index) => {
    const x = 4 + (index / (values.length - 1)) * 92;
    const y = 4 + (1 - ((value - min) / range)) * 36;
    return `${x},${y}`;
  }).join(' ');
  return <View style={{ height }}><Svg width="100%" height="100%" viewBox="0 0 100 44" preserveAspectRatio="none"><Line x1="0" y1="40" x2="100" y2="40" stroke={Colors.glassBorder} strokeWidth="0.5" /><Polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}

function WeightTrendGraph({ points, expectedPoints, goalWeight, formatWeight }) {
  if (points.length < 2) return <View style={styles.weightGraphEmpty}><Text style={styles.emptyChart}>Add more data to see your weight trend.</Text></View>;
  const start = new Date(`${points[0].date}T12:00:00`).getTime();
  const end = new Date(`${points[points.length - 1].date}T12:00:00`).getTime();
  const duration = Math.max(end - start, 86400000);
  const values = [...points.map((item) => item.weightKg), ...expectedPoints, ...(goalWeight ? [goalWeight] : [])];
  const min = Math.min(...values) - 0.4;
  const max = Math.max(...values) + 0.4;
  const range = Math.max(0.5, max - min);
  const y = (value) => 5 + (1 - ((value - min) / range)) * 66;
  const x = (date) => 9 + ((new Date(`${date}T12:00:00`).getTime() - start) / duration) * 87;
  const actual = points.map((item) => `${x(item.date)},${y(item.weightKg)}`).join(' ');
  const expected = points.map((item, index) => `${x(item.date)},${y(expectedPoints[index])}`).join(' ');
  return <View style={styles.weightGraph}><View style={styles.yAxisLabels}><Text style={styles.axisLabel}>{formatWeight(max)}</Text><Text style={styles.axisLabel}>{formatWeight(min)}</Text></View><View style={styles.graphArea}><Svg width="100%" height="100%" viewBox="0 0 100 76" preserveAspectRatio="none"><Line x1="9" y1="5" x2="9" y2="71" stroke={Colors.glassBorder} strokeWidth="0.6"/><Line x1="9" y1="71" x2="96" y2="71" stroke={Colors.glassBorder} strokeWidth="0.6"/><Line x1="9" y1="38" x2="96" y2="38" stroke={Colors.glassBorder} strokeWidth="0.45" strokeDasharray="2 2"/>{goalWeight ? <Line x1="9" y1={y(goalWeight)} x2="96" y2={y(goalWeight)} stroke={Colors.textLight} strokeWidth="1.2" strokeDasharray="3 2"/> : null}<Polyline points={expected} fill="none" stroke={Colors.success} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><Polyline points={actual} fill="none" stroke={Colors.primary} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>{points.map((item) => <Circle key={item.id} cx={x(item.date)} cy={y(item.weightKg)} r="2.3" fill={Colors.primary} stroke={Colors.cardBackground} strokeWidth="0.8" />)}</Svg><View style={styles.xAxisLabels}><Text style={styles.axisLabel}>{new Date(`${points[0].date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text><Text style={styles.axisLabel}>{new Date(`${points[points.length - 1].date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View></View></View>;
}

export default function ProgressScreen() {
  const { unitSystem } = useUnits();
  const tabBarClearance = useFloatingTabBarClearance();
  const [state, setState] = useState({ entries: [], foods: [], steps: [], goals: { stepGoal: 8000 }, profile: null, todaySteps: 0 });
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({ weight: '', month: '', day: '', year: '' });

  const load = useCallback(async () => {
    const [entries, foods, steps, goals, profile, todaySteps] = await Promise.all([getWeightEntries(), getFoods(), getStepHistory(), getHealthGoals(), getUserProfile(), getTodaySteps()]);
    if (todaySteps) await saveStepSnapshot(todaySteps);
    const nextSteps = todaySteps ? [...steps.filter((item) => item.date !== localDay()), { date: localDay(), steps: todaySteps }] : steps;
    setState({ entries, foods, steps: nextSteps, goals, profile, todaySteps });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const displayWeight = useCallback((kg) => unitSystem === 'metric' ? `${kg.toFixed(1)} kg` : `${(kg / KG_PER_LB).toFixed(1)} lb`, [unitSystem]);
  const summaries = useMemo(() => {
    const recentWeights = state.entries.filter((item) => daysAgo(item.date) <= 180);
    const latest = recentWeights[recentWeights.length - 1];
    const first = recentWeights[0];
    const change = latest && first ? latest.weightKg - first.weightKg : 0;
    const foodWindow = state.foods.filter((item) => daysAgo(item.date) <= 30);
    const calorieAverage = average(foodWindow.map((item) => Number(item.calories) || 0));
    const stepWindow = state.steps.filter((item) => daysAgo(item.date) <= 30);
    const stepAverage = average(stepWindow.map((item) => Number(item.steps) || 0));
    const goalWeight = Number(state.goals.targetWeightKg) || null;
    const due = latest ? Math.max(0, (Number(state.goals.weighInIntervalDays) || 7) - daysAgo(latest.date)) : 0;
    const profile = state.profile || {};
    const bmr = (10 * (Number(profile.weightKg) || 70)) + (6.25 * (Number(profile.heightCm) || 170)) - (5 * (Number(profile.age) || 30)) + (profile.sex === 'male' ? 5 : -161);
    const maintenance = bmr * 1.2;
    const elapsedDays = first && latest ? Math.max(0, Math.round((new Date(latest.date) - new Date(first.date)) / 86400000)) : 0;
    const weightPoints = recentWeights.slice(-8);
    const expectedPoints = weightPoints.map((point) => {
      const meals = state.foods.filter((food) => food.date >= first.date && food.date <= point.date);
      const loggedDays = new Set(meals.map((meal) => meal.date)).size;
      const nutritionCalories = meals.reduce((sum, meal) => {
        const macros = meal.macros || {};
        const fromMacros = (Number(macros.protein_g) || 0) * 4 + (Number(macros.carbs_g) || 0) * 4 + (Number(macros.fat_g) || 0) * 9;
        return sum + (fromMacros || Number(meal.calories) || 0);
      }, 0);
      const elapsed = Math.max(0, Math.round((new Date(point.date) - new Date(first.date)) / 86400000));
      const dailyIntake = loggedDays ? nutritionCalories / loggedDays : Number(profile.calorieTarget) || maintenance;
      return first.weightKg + ((dailyIntake - maintenance) * elapsed / 7700);
    });
    const dayLabels = Array.from({ length: 7 }, (_, i) => localDay(new Date(Date.now() - (6 - i) * 86400000)));
    const caloriesByDay = dayLabels.map((day) => state.foods.filter((item) => item.date === day).reduce((sum, item) => sum + (Number(item.calories) || 0), 0));
    const stepsByDay = dayLabels.map((day) => Number(state.steps.find((item) => item.date === day)?.steps) || 0);
    return { latest, first, change, calorieAverage, stepAverage, goalWeight, due, weightPoints, expectedPoints, caloriesByDay, stepsByDay };
  }, [state]);

  const open = (name) => {
    const latest = summaries.latest?.weightKg;
    const [year, month, day] = localDay().split('-');
    setDraft({ weight: latest ? (unitSystem === 'metric' ? String(latest) : String((latest / KG_PER_LB).toFixed(1))) : '', month, day, year });
    setModal(name);
  };
  const save = async () => {
    const month = String(draft.month).padStart(2, '0');
    const day = String(draft.day).padStart(2, '0');
    const date = `${draft.year}-${month}-${day}`;
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00`).getTime()) && new Date(`${date}T12:00:00`).toISOString().slice(0, 10) === date;
    if (Number(draft.weight) <= 0 || !validDate) return;
    await addWeightEntry({ weightKg: unitSystem === 'metric' ? Number(draft.weight) : Number(draft.weight) * KG_PER_LB, date });
    setModal(null); load();
  };
  const calorieDiff = Math.round(summaries.calorieAverage - (state.profile?.calorieTarget || 0));

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>Your progress</Text></View>
      <GlassCard style={styles.hero}>
        <View style={styles.heroTop}><View><Text style={styles.cardLabel}>WEIGHT TREND</Text><Text style={styles.weight}>{summaries.latest ? displayWeight(summaries.latest.weightKg) : 'Add a weigh-in'}</Text><Text style={styles.muted}>{summaries.latest ? `${summaries.change >= 0 ? '+' : ''}${displayWeight(summaries.change).replace(' kg', '').replace(' lb', '')} over recent entries` : 'Start building your trend today'}</Text></View><TouchableOpacity onPress={() => open('weight')} style={styles.addButton}><Ionicons name="add" size={19} color="#fff"/><Text style={styles.addText}>Log</Text></TouchableOpacity></View>
        <View style={styles.chart}><WeightTrendGraph points={summaries.weightPoints} expectedPoints={summaries.expectedPoints} goalWeight={summaries.goalWeight} formatWeight={(weight) => unitSystem === 'metric' ? `${weight.toFixed(1)} kg` : `${(weight / KG_PER_LB).toFixed(1)} lb`} /></View>
        <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>Actual</Text></View><View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Meal projection</Text></View>{summaries.goalWeight ? <View style={styles.legendItem}><View style={[styles.legendLine, styles.legendGoal]} /><Text style={styles.legendText}>Goal weight</Text></View> : null}</View>
      </GlassCard>
      <Text style={styles.sectionTitle}>LAST 30 DAYS</Text>
      <View style={styles.metricRow}>
        <GlassCard style={styles.metricCard}><View style={[styles.iconCircle, { backgroundColor: Colors.foodSoft }]}><Ionicons name="flame-outline" size={19} color={Colors.foodDark}/></View><Text style={styles.metricValue}>{Math.round(summaries.calorieAverage || 0).toLocaleString()}</Text><Text style={styles.metricLabel}>avg. calories/day</Text><LineGraph values={summaries.caloriesByDay} color={Colors.food} height={35} /><Text style={[styles.delta, { color: calorieDiff > 0 ? Colors.warning : Colors.success }]}>{state.foods.length ? `${calorieDiff > 0 ? '+' : ''}${calorieDiff} vs target` : 'Log meals to compare'}</Text></GlassCard>
        <GlassCard style={styles.metricCard}><View style={[styles.iconCircle, { backgroundColor: Colors.runSoft }]}><Ionicons name="footsteps-outline" size={19} color={Colors.runDark}/></View><Text style={styles.metricValue}>{Math.round(summaries.stepAverage || state.todaySteps).toLocaleString()}</Text><Text style={styles.metricLabel}>avg. steps/day</Text><LineGraph values={summaries.stepsByDay} color={Colors.run} height={35} /><Text style={[styles.delta, { color: summaries.stepAverage >= state.goals.stepGoal ? Colors.success : Colors.textSecondary }]}>{Math.round(((summaries.stepAverage || state.todaySteps) / (state.goals.stepGoal || 8000)) * 100)}% of {Number(state.goals.stepGoal || 8000).toLocaleString()}</Text></GlassCard>
      </View>
      <GlassCard contentStyle={styles.insight}><View style={styles.insightIcon}><Ionicons name="sparkles" size={19} color={Colors.primary}/></View><View style={{ flex: 1 }}><Text style={styles.insightTitle}>Your calorie guidance</Text><Text style={styles.insightText}>{state.foods.length ? `You’re averaging ${Math.abs(calorieDiff).toLocaleString()} kcal ${calorieDiff > 0 ? 'above' : 'below'} your recommended ${Number(state.profile?.calorieTarget || 0).toLocaleString()} kcal daily target.` : `Your recommended target is ${Number(state.profile?.calorieTarget || 0).toLocaleString()} kcal/day. Log meals to personalize the comparison.`}</Text></View></GlassCard>
    </ScrollView>
    <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={() => setModal(null)}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Log your weight</Text><Text style={styles.inputLabel}>WEIGHT ({unitSystem === 'metric' ? 'KG' : 'LB'})</Text><TextInput style={styles.input} value={draft.weight} onChangeText={(weight) => setDraft({ ...draft, weight })} keyboardType="decimal-pad" autoFocus/><Text style={styles.inputLabel}>DATE</Text><View style={styles.dateFields}><View style={styles.dateFieldGroup}><Text style={styles.dateFieldCaption}>MONTH</Text><TextInput style={styles.dateInput} value={draft.month} onChangeText={(month) => setDraft({ ...draft, month: month.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" maxLength={2} selectTextOnFocus /></View><View style={styles.dateFieldGroup}><Text style={styles.dateFieldCaption}>DAY</Text><TextInput style={styles.dateInput} value={draft.day} onChangeText={(day) => setDraft({ ...draft, day: day.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" maxLength={2} selectTextOnFocus /></View><View style={[styles.dateFieldGroup, styles.yearField]}><Text style={styles.dateFieldCaption}>YEAR</Text><TextInput style={styles.dateInput} value={draft.year} onChangeText={(year) => setDraft({ ...draft, year: year.replace(/\D/g, '').slice(0, 4) })} keyboardType="number-pad" maxLength={4} selectTextOnFocus /></View></View><View style={styles.modalActions}><TouchableOpacity onPress={() => setModal(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={save} style={styles.save}><Text style={styles.saveText}>Save</Text></TouchableOpacity></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.xl, gap: Spacing.md }, header: { paddingTop: Spacing.sm, marginBottom: Spacing.sm }, title: { color: Colors.text, fontSize: 32, fontWeight: '700', marginTop: 3 }, hero: { minHeight: 284 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between' }, cardLabel: { fontSize: 11, color: Colors.textSecondary, letterSpacing: .9, fontWeight: '700' }, weight: { color: Colors.text, fontSize: 28, fontWeight: '700', marginTop: 5 }, muted: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 }, addButton: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 13, height: 35, alignItems: 'center', flexDirection: 'row', gap: 3, justifyContent: 'center' }, addText: { color: '#fff', fontWeight: '700', fontSize: 13 }, chart: { height: 114, marginTop: 12 }, weightGraph: { flexDirection: 'row', height: 106 }, weightGraphEmpty: { height: 106, alignItems: 'center', justifyContent: 'center' }, yAxisLabels: { width: 44, justifyContent: 'space-between', paddingBottom: 20 }, graphArea: { flex: 1, height: 92 }, xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 }, axisLabel: { color: Colors.textLight, fontSize: 9 }, lineGraphEmpty: { justifyContent: 'center', alignItems: 'center' }, emptyChart: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.glassBorder, paddingTop: 10 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendLine: { width: 17, height: 2, borderRadius: 2 }, legendExpected: { backgroundColor: Colors.textSecondary, borderStyle: 'dashed' }, legendGoal: { backgroundColor: Colors.warning, borderStyle: 'dashed' }, legendText: { color: Colors.textSecondary, fontSize: 11 }, sectionTitle: { color: Colors.textSecondary, letterSpacing: 1, fontSize: 11, fontWeight: '700', marginTop: Spacing.md, marginLeft: 4 }, metricRow: { flexDirection: 'row', gap: Spacing.md }, metricCard: { flex: 1, minHeight: 190 }, iconCircle: { height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, metricValue: { color: Colors.text, fontSize: 22, fontWeight: '700', marginTop: 12 }, metricLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 }, delta: { fontSize: 11, fontWeight: '600', marginTop: 8 }, insight: { flexDirection: 'row' }, insightIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, insightTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }, insightText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,22,28,.35)', alignItems: 'center', justifyContent: 'flex-end', padding: Spacing.md }, modal: { width: '100%', backgroundColor: Colors.elevatedSurface, borderRadius: 28, padding: Spacing.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.glassBorder }, modalTitle: { color: Colors.text, fontSize: 21, fontWeight: '700', marginBottom: Spacing.xl }, inputLabel: { color: Colors.textSecondary, fontSize: 11, letterSpacing: .8, fontWeight: '700', marginBottom: 6 }, input: { minHeight: 48, borderRadius: 14, backgroundColor: Colors.controlFill, color: Colors.text, paddingHorizontal: 14, fontSize: 16, marginBottom: 14 }, dateFields: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }, dateFieldGroup: { flex: 1 }, yearField: { flex: 1.35 }, dateFieldCaption: { color: Colors.textLight, fontSize: 10, letterSpacing: .6, marginBottom: 5, fontWeight: '700' }, dateInput: { height: 52, textAlign: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.controlFill, color: Colors.text, fontSize: 17, fontWeight: '600' }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 4 }, cancel: { color: Colors.textSecondary, fontSize: 16 }, save: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: BorderRadius.full }, saveText: { color: '#fff', fontWeight: '700' },
});
