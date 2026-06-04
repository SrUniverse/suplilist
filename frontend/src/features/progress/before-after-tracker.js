/**
 * @fileoverview Before/After Progress Tracker
 * Tracks transformations with photos and metrics, correlates with supplement stack
 */

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP outside localhost, legacy webviews)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a progress record with photo and measurements
 * @param {string} phase - 'before' or 'after'
 * @param {string} photoBase64 - Base64 encoded photo
 * @param {Object} measurements - {weight, chest, waist, arms, thighs, bodyfat}
 * @param {string} stackSnapshot - JSON string of current stack
 * @param {string} goal - Current training goal
 * @returns {Object} Progress record
 */
export function createProgressRecord(phase, photoBase64, measurements, stackSnapshot, goal) {
  if (!['before', 'after'].includes(phase)) {
    throw new Error('Phase must be "before" or "after"');
  }

  if (!photoBase64 || typeof photoBase64 !== 'string') {
    throw new Error('Photo is required (base64 string)');
  }

  if (!measurements || typeof measurements !== 'object') {
    throw new Error('Measurements object is required');
  }

  const requiredMeasurements = ['weight', 'waist', 'chest'];
  const missingMeasurements = requiredMeasurements.filter(m => !measurements[m]);
  if (missingMeasurements.length > 0) {
    throw new Error(`Missing required measurements: ${missingMeasurements.join(', ')}`);
  }

  return {
    id: `progress_${generateId()}`,
    phase,
    photoBase64,
    measurements: {
      weight: measurements.weight,
      chest: measurements.chest,
      waist: measurements.waist,
      arms: measurements.arms || null,
      thighs: measurements.thighs || null,
      bodyfat: measurements.bodyfat || null,
    },
    stackSnapshot,
    goal,
    recordedAt: Date.now(),
  };
}

/**
 * Calculate transformation metrics between before and after
 * @param {Object} beforeRecord - Before progress record
 * @param {Object} afterRecord - After progress record
 * @param {number} duration - Duration in days
 * @returns {Object} Transformation metrics
 */
export function calculateTransformation(beforeRecord, afterRecord, duration) {
  if (!beforeRecord || !afterRecord) {
    return null;
  }

  const before = beforeRecord.measurements;
  const after = afterRecord.measurements;

  const weightChange = after.weight - before.weight;
  const weightChangePercent = (weightChange / before.weight) * 100;
  const chestChange = (after.chest - before.chest) || 0;
  const waistChange = (after.waist - before.waist) || 0;
  const armsChange = (after.arms - before.arms) || 0;
  const thighsChange = (after.thighs - before.thighs) || 0;
  const bodyfatChange = (after.bodyfat - before.bodyfat) || 0;

  // Determine if it's a bulk or cut based on weight + waist/chest
  const muscleIndicator = chestChange - (waistChange * 0.5);
  const isBulk = weightChange > 0 && muscleIndicator > 0;
  const isCut = weightChange < 0 && waistChange < 0;

  return {
    weightChange,
    weightChangePercent: Math.round(weightChangePercent * 10) / 10,
    chestChange: Math.round(chestChange * 10) / 10,
    waistChange: Math.round(waistChange * 10) / 10,
    armsChange: Math.round(armsChange * 10) / 10,
    thighsChange: Math.round(thighsChange * 10) / 10,
    bodyfatChange: Math.round(bodyfatChange * 10) / 10,
    duration,
    phase: isBulk ? 'bulk' : isCut ? 'cut' : 'recomp',
    summary: getTransformationSummary(weightChange, waistChange, chestChange, isBulk, isCut),
  };
}

/**
 * Generate human-readable summary
 */
function getTransformationSummary(weightChange, waistChange, chestChange, isBulk, isCut) {
  if (isBulk) {
    return `📈 Bulking phase: +${Math.abs(weightChange.toFixed(1))}kg, peito +${chestChange.toFixed(1)}cm`;
  }
  if (isCut) {
    return `📉 Cutting phase: -${Math.abs(weightChange.toFixed(1))}kg, cintura -${Math.abs(waistChange.toFixed(1))}cm`;
  }
  return `⚖️ Body recomposition: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg`;
}

/**
 * Get motivation message based on progress
 * @param {Object} transformation - Calculated transformation metrics
 * @param {string} goal - Training goal
 * @returns {string} Motivational message
 */
export function getMotivationMessage(transformation, goal) {
  if (!transformation) {
    return '📸 Capture your first before/after to track progress!';
  }

  const { weightChange, phase, duration } = transformation;

  const daysPerKg = Math.abs(duration / weightChange);
  const consistency = daysPerKg < 3 ? '🔥 Consitente demais!' : daysPerKg < 7 ? '💪 Progresso sólido!' : '✅ No caminho certo!';

  if (phase === 'bulk' && weightChange > 0) {
    return `${consistency} Ganho de massa (bulk): ${(weightChange / (duration / 30)).toFixed(1)}kg/mês (almejado: 0.5-1kg/mês)`;
  }

  if (phase === 'cut' && weightChange < 0) {
    return `${consistency} Perda de gordura: ${Math.abs(weightChange / (duration / 30)).toFixed(1)}kg/mês (almejado: 0.5-1kg/mês)`;
  }

  return `${consistency} Transformação em progresso!`;
}

/**
 * Correlate transformation with supplement stack
 * @param {Object} beforeRecord - Before progress record
 * @param {Object} afterRecord - After progress record
 * @param {Array} supplements - Current supplement data
 * @returns {Array} Stack correlation analysis
 */
export function correlateStackWithResults(beforeRecord, afterRecord, supplements) {
  if (!beforeRecord || !afterRecord || !supplements) {
    return [];
  }

  let beforeStack = [];
  try {
    beforeStack = typeof beforeRecord.stackSnapshot === 'string'
      ? JSON.parse(beforeRecord.stackSnapshot)
      : beforeRecord.stackSnapshot;
  } catch (e) {
    beforeStack = [];
  }

  const transformation = calculateTransformation(beforeRecord, afterRecord, 30);
  if (!transformation) return [];

  const { phase } = transformation;

  // Score supplements based on usage during transformation
  const supplementScores = {};

  for (const supp of supplements) {
    const suppId = supp.supplementId;
    const wasUsed = beforeStack.some(s => s.supplementId === suppId);

    if (!wasUsed) continue;

    // Default ROI scores for supplements in this phase
    const phaseROI = {
      bulk: {
        whey: 95,
        creatine: 90,
        carbs: 85,
        bcaa: 60,
        caffeine: 70,
      },
      cut: {
        whey: 90,
        caffeine: 85,
        thermogenic: 75,
        fiber: 70,
        creatine: 60,
      },
      recomp: {
        whey: 85,
        creatine: 70,
        caffeine: 70,
        magnesium: 70,
        vitamin_d: 80,
      },
    };

    const roi = phaseROI[phase]?.[suppId.replace('-', '_')] ?? 50;
    supplementScores[suppId] = {
      name: supp.name || suppId,
      roi,
      likely_effective: roi >= 70,
    };
  }

  return Object.entries(supplementScores).map(([id, data]) => ({
    supplementId: id,
    ...data,
  }));
}

/**
 * Estimate days to reach goal based on current velocity
 * @param {Object} beforeRecord - Before progress record
 * @param {Object} afterRecord - After progress record
 * @param {Object} targetMeasurements - Target measurements
 * @returns {number|null} Estimated days, or null if velocity is 0
 */
export function estimateDaysToGoal(beforeRecord, afterRecord, targetMeasurements) {
  const transformation = calculateTransformation(beforeRecord, afterRecord, 30);
  if (!transformation || !targetMeasurements) {
    return null;
  }

  const { weight: currentWeight } = afterRecord.measurements;
  const { weight: targetWeight } = targetMeasurements;

  if (currentWeight === targetWeight) {
    return 0;
  }

  // Calculate velocity (kg per month)
  const monthlyVelocity = transformation.weightChange;
  if (monthlyVelocity === 0) {
    return null;
  }

  const kgRemaining = targetWeight - currentWeight;
  const monthsRemaining = kgRemaining / monthlyVelocity;

  return Math.max(0, Math.round(monthsRemaining * 30));
}

/**
 * Get photo comparison view configuration
 * @param {Object} beforeRecord - Before progress record
 * @param {Object} afterRecord - After progress record
 * @returns {Object} Configuration for before/after photo viewer
 */
export function getPhotoComparisonConfig(beforeRecord, afterRecord) {
  if (!beforeRecord || !afterRecord) {
    return null;
  }

  return {
    beforePhoto: beforeRecord.photoBase64,
    afterPhoto: afterRecord.photoBase64,
    beforeDate: new Date(beforeRecord.recordedAt).toLocaleDateString('pt-BR'),
    afterDate: new Date(afterRecord.recordedAt).toLocaleDateString('pt-BR'),
    transitionEffect: 'slider', // or 'fade' or 'wipe'
  };
}

/**
 * Generate progress timeline
 * @param {Array} progressRecords - Array of progress records over time
 * @returns {Array} Timeline with key milestones
 */
export function generateTimeline(progressRecords) {
  if (!progressRecords || progressRecords.length === 0) {
    return [];
  }

  const sorted = [...progressRecords].sort((a, b) => a.recordedAt - b.recordedAt);
  const timeline = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const before = sorted[i];
    const after = sorted[i + 1];
    const durationDays = Math.floor((after.recordedAt - before.recordedAt) / (24 * 60 * 60 * 1000));

    const transformation = calculateTransformation(before, after, durationDays);

    timeline.push({
      from: new Date(before.recordedAt).toLocaleDateString('pt-BR'),
      to: new Date(after.recordedAt).toLocaleDateString('pt-BR'),
      duration: durationDays,
      transformation,
      stack: before.stackSnapshot,
    });
  }

  return timeline;
}
