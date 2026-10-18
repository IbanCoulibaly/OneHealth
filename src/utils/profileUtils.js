export const DEFAULT_USER_PROFILE = {
  firstName: 'Alex',
  lastName: 'Morgan',
  sex: 'female',
  age: 30,
  heightCm: 170,
  weightKg: 70,
  bodyGoal: 'maintain',
  calorieTarget: 1750,
  proteinTarget: 85,
  fatTarget: 60,
  carbsTarget: 220,
  onboardingComplete: false,
};

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function estimateDailyTargets(profile) {
  const age = finiteNumber(profile?.age, DEFAULT_USER_PROFILE.age);
  const heightCm = finiteNumber(profile?.heightCm, DEFAULT_USER_PROFILE.heightCm);
  const weightKg = finiteNumber(profile?.weightKg, DEFAULT_USER_PROFILE.weightKg);
  const sexAdjustment = profile?.sex === 'male' ? 5 : -161;
  const restingCalories = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexAdjustment;
  const maintenanceCalories = restingCalories * 1.2;
  const bodyGoal = ['lose', 'gain'].includes(profile?.bodyGoal) ? profile.bodyGoal : 'maintain';
  const calorieAdjustment = bodyGoal === 'lose' ? -300 : bodyGoal === 'gain' ? 250 : 0;
  const calorieTarget = Math.max(1200, Math.round((maintenanceCalories + calorieAdjustment) / 50) * 50);
  const proteinPerKg = bodyGoal === 'maintain' ? 1.2 : 1.6;
  const proteinTarget = Math.max(40, Math.round((weightKg * proteinPerKg) / 5) * 5);
  const fatTarget = Math.max(35, Math.round((calorieTarget * 0.3) / 9 / 5) * 5);
  const carbsTarget = Math.max(100, Math.round((calorieTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4 / 5) * 5);

  return {
    calorieTarget,
    proteinTarget,
    fatTarget,
    carbsTarget,
  };
}

export function normalizeUserProfile(profile = {}) {
  const merged = { ...DEFAULT_USER_PROFILE, ...profile };
  return {
    firstName: String(merged.firstName || DEFAULT_USER_PROFILE.firstName).trim(),
    lastName: String(merged.lastName || DEFAULT_USER_PROFILE.lastName).trim(),
    sex: merged.sex === 'male' ? 'male' : 'female',
    age: finiteNumber(merged.age, DEFAULT_USER_PROFILE.age),
    heightCm: finiteNumber(merged.heightCm, DEFAULT_USER_PROFILE.heightCm),
    weightKg: finiteNumber(merged.weightKg, DEFAULT_USER_PROFILE.weightKg),
    bodyGoal: ['lose', 'gain'].includes(merged.bodyGoal) ? merged.bodyGoal : 'maintain',
    calorieTarget: finiteNumber(merged.calorieTarget, DEFAULT_USER_PROFILE.calorieTarget),
    proteinTarget: finiteNumber(merged.proteinTarget, DEFAULT_USER_PROFILE.proteinTarget),
    fatTarget: finiteNumber(merged.fatTarget, DEFAULT_USER_PROFILE.fatTarget),
    carbsTarget: finiteNumber(merged.carbsTarget, DEFAULT_USER_PROFILE.carbsTarget),
    onboardingComplete: Boolean(merged.onboardingComplete),
  };
}
