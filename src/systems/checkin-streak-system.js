/**
 * CheckinStreakSystem v4.0 — SupliList
 * Core logic: streaks, adherence, badges, milestones
 * Zero dependencies — pure JS, no UI.
 */

export class CheckinStreakSystem {
  constructor(stateManager) {
    this.sm = stateManager;
  }

  // ── Streak calculation ────────────────────────────────────────────────────

  /**
   * Current streak: consecutive days with ≥1 check-in.
   * Partial adherence (not all supplements) still counts.
   */
  getCurrentStreak() {
    const checkins = this._checkins();
    if (!checkins.length) return 0;

    const daySet = this._getDaySet(checkins);
    const today  = this._dateKey(new Date());
    const days   = [...daySet].sort().reverse(); // newest first

    // Streak dies if last check-in wasn't today or yesterday
    if (days[0] !== today && days[0] !== this._dateKey(this._yesterday())) return 0;

    let streak = 0;
    let cursor = days[0] === today ? new Date() : this._yesterday();

    for (const day of days) {
      if (day === this._dateKey(cursor)) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400000);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Best (record) streak ever.
   */
  getBestStreak() {
    const checkins = this._checkins();
    if (!checkins.length) return 0;

    const days    = [...this._getDaySet(checkins)].sort();
    let maxStreak = 0;
    let current   = 1;

    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]) - new Date(days[i-1])) / 86400000;
      if (diff === 1) {
        current++;
      } else {
        maxStreak = Math.max(maxStreak, current);
        current   = 1;
      }
    }

    return Math.max(maxStreak, current);
  }

  /**
   * Adherence % for last N days.
   * A day "adhered" = ≥ threshold fraction of stack was checked in.
   */
  getAdherence(days = 30, threshold = 0.5) {
    const checkins = this._checkins();
    const stack    = this._stack();
    if (!stack.length) return 100;

    const cutoff = Date.now() - days * 86400000;
    const byDay  = {};

    checkins.filter(c => c.timestamp >= cutoff).forEach(c => {
      const key = this._dateKey(new Date(c.timestamp));
      if (!byDay[key]) byDay[key] = new Set();
      byDay[key].add(c.supplementId);
    });

    const adheredDays = Object.values(byDay).filter(
      set => set.size / stack.length >= threshold
    ).length;

    return Math.round((adheredDays / days) * 100);
  }

  /**
   * Today's adherence fraction 0–1.
   */
  getTodayAdherence() {
    const stack   = this._stack();
    const todayCI = this.sm.getTodayCheckins?.() ?? [];
    if (!stack.length) return 1;
    return Math.min(todayCI.length / stack.length, 1);
  }

  // ── Heatmap ───────────────────────────────────────────────────────────────

  /**
   * 30 day objects: { date, key, count, total, level 0-4 }
   */
  getHeatmapData(days = 30) {
    const checkins = this._checkins();
    const stack    = this._stack();
    const result   = [];

    for (let i = days - 1; i >= 0; i--) {
      const date        = new Date(Date.now() - i * 86400000);
      const key         = this._dateKey(date);
      const dayCheckins = checkins.filter(c => this._dateKey(new Date(c.timestamp)) === key);
      const count       = new Set(dayCheckins.map(c => c.supplementId)).size;
      const total       = stack.length || 1;
      const ratio       = count / total;
      const level       = count === 0 ? 0
                        : ratio < 0.25 ? 1
                        : ratio < 0.5  ? 2
                        : ratio < 1    ? 3 : 4;
      result.push({ date, key, count, total, level });
    }

    return result;
  }

  // ── Badges ────────────────────────────────────────────────────────────────

  getBadges() {
    const streak      = this.getCurrentStreak();
    const best        = this.getBestStreak();
    const totalDays   = this._getDaySet(this._checkins()).size;
    const adherence30 = this.getAdherence(30);

    const DEFS = [
      { id:'first-day',    label:'🌱 Primeiro Dia', desc:'Primeiro check-in',            condition: totalDays   >= 1   },
      { id:'week-1',       label:'7️⃣ Semana 1',     desc:'Streak de 7 dias',             condition: best        >= 7   },
      { id:'fortnight',    label:'🔥 Quinzena',      desc:'Streak de 14 dias',            condition: best        >= 14  },
      { id:'month-1',      label:'🏅 30 Dias',       desc:'Streak de 30 dias',            condition: best        >= 30  },
      { id:'two-months',   label:'⚡ 60 Dias',       desc:'Streak de 60 dias',            condition: best        >= 60  },
      { id:'quarter',      label:'💎 90 Dias',       desc:'Streak de 90 dias',            condition: best        >= 90  },
      { id:'half-year',    label:'🥇 180 Dias',      desc:'Streak de 180 dias',           condition: best        >= 180 },
      { id:'year-1',       label:'👑 1 Ano',         desc:'Streak de 365 dias!',          condition: best        >= 365 },
      { id:'adherent-80',  label:'📊 80% Adesão',    desc:'80% de adesão em 30 dias',    condition: adherence30 >= 80  },
      { id:'adherent-100', label:'💯 Perfeito',      desc:'100% de adesão em 30 dias',   condition: adherence30 === 100},
      { id:'century',      label:'💯 100 Dias',      desc:'100 dias totais com check-in', condition: totalDays   >= 100 },
    ];

    const saved = this.sm.getState?.()?.earnedBadges ?? {};

    return DEFS.map(def => ({
      ...def,
      earned:   def.condition,
      earnedAt: def.condition ? (saved[def.id] ?? Date.now()) : null,
    }));
  }

  /**
   * Returns badges newly earned since previousBadges snapshot.
   */
  checkNewBadges(previousBadges = []) {
    const prevIds = new Set(previousBadges.filter(b => b.earned).map(b => b.id));
    return this.getBadges().filter(b => b.earned && !prevIds.has(b.id));
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  getNextMilestone() {
    const best       = this.getBestStreak();
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    const next       = milestones.find(m => m > best);
    if (!next) return null;
    return { target: next, remaining: next - best, progress: Math.round((best / next) * 100) };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _checkins() { return this.sm.getState?.()?.checkins ?? this.sm.checkins ?? []; }
  _stack()    { return this.sm.stack ?? []; }

  _dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  _yesterday() { return new Date(Date.now() - 86400000); }

  _getDaySet(checkins) {
    return new Set(checkins.map(c => this._dateKey(new Date(c.timestamp))));
  }
}

export default CheckinStreakSystem;
