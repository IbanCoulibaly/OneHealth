// src/utils/notifications.js
//
// Local (on-device) notifications for goal completions and streak
// milestones. These fire immediately when the user hits a goal or extends
// their streak — no server/push infrastructure needed.
//
// Respects the "Goal & streak alerts" toggle in Settings (persisted via
// eugene/services/storage.js). If the user has it off, or hasn't granted
// OS notification permission, calls here are safely skipped.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getNotificationPrefs } from '../eugene/services/storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

/**
 * Asks the OS for notification permission the first time it's needed.
 * Safe to call repeatedly — only prompts once per app session.
 */
export async function ensureNotificationPermissions() {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (permissionRequested) return false;
    permissionRequested = true;
    const result = await Notifications.requestPermissionsAsync();
    return !!result.granted;
  } catch (error) {
    console.warn('notifications: failed to request permissions', error);
    return false;
  }
}

async function canNotify(prefKey) {
  if (Platform.OS === 'web') return false;
  const prefs = await getNotificationPrefs();
  if (!prefs[prefKey]) return false;
  return ensureNotificationPermissions();
}

async function fireNotification(content) {
  try {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('notifications: failed to schedule notification', error);
  }
}

/**
 * Fires when a user-created goal reaches 100% progress.
 */
export async function notifyGoalAchieved(goalTitle) {
  if (!(await canNotify('goalStreakAlerts'))) return;
  await fireNotification({
    title: 'Goal achieved! 🎯',
    body: `You hit your goal: ${goalTitle}. Nice work!`,
    data: { type: 'goal_achieved' },
  });
}

/**
 * Fires when the user's activity streak extends to a new day count.
 * Only called on meaningful milestones (see GoalsScreen) so it doesn't
 * spam every single day.
 */
export async function notifyStreakMilestone(streakCount) {
  if (!(await canNotify('goalStreakAlerts'))) return;
  await fireNotification({
    title: `${streakCount}-day streak! 🔥`,
    body: `You've stayed active ${streakCount} days in a row. Keep it going!`,
    data: { type: 'streak_milestone' },
  });
}

async function clearScheduled(type) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.content.data?.type === type)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

export async function scheduleHealthReminders(prefs, weighInIntervalDays = 7) {
  if (Platform.OS === 'web') return;
  const permitted = await ensureNotificationPermissions();
  if (!permitted) return;
  await Promise.all([clearScheduled('daily_summary'), clearScheduled('weekly_summary'), clearScheduled('weigh_in')]);
  const jobs = [];
  if (prefs.dailyNudges) jobs.push(Notifications.scheduleNotificationAsync({
    content: { title: 'Your daily health summary', body: 'Take a minute to review meals, movement, and your goals.', data: { type: 'daily_summary' } },
    trigger: { hour: 20, minute: 0, repeats: true },
  }));
  if (prefs.weeklySummary) jobs.push(Notifications.scheduleNotificationAsync({
    content: { title: 'Your weekly summary is ready', body: 'See your progress and plan the week ahead.', data: { type: 'weekly_summary' } },
    trigger: { weekday: 1, hour: 9, minute: 0, repeats: true },
  }));
  if (prefs.weightReminders) jobs.push(Notifications.scheduleNotificationAsync({
    content: { title: 'Time for a weigh-in', body: 'A consistent check-in makes your trend more useful.', data: { type: 'weigh_in' } },
    trigger: { seconds: Math.max(1, Number(weighInIntervalDays) || 7) * 86400, repeats: true },
  }));
  await Promise.all(jobs);
}
