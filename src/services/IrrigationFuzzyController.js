class IrrigationFuzzyController {
  constructor() {
    this.membershipFunctions = {
      soilMoistureError: {
        veryDry:  (x) => Math.max(0, Math.min(1, (x - 20) / 15)),
        dry:      (x) => Math.max(0, Math.min((x - 10) / 10, (35 - x) / 10)),
        optimal:  (x) => Math.max(0, Math.min((x + 5) / 10, (15 - x) / 10)),
        wet:      (x) => Math.max(0, Math.min((x + 25) / 10, (-10 - x) / 10)),
        veryWet:  (x) => Math.max(0, Math.min(1, (-x - 20) / 15))
      },
      rainProbability: {
        none:     (x) => Math.max(0, Math.min(1, (20 - x) / 20)),
        light:    (x) => Math.max(0, Math.min((x - 10) / 15, (40 - x) / 15)),
        moderate: (x) => Math.max(0, Math.min((x - 30) / 20, (70 - x) / 20)),
        heavy:    (x) => Math.max(0, Math.min((x - 60) / 30, 1))
      },
      timeOfDay: {
        night:    (x) => x <= 5 ? Math.max(0, (5 - x) / 5) : 0,
        dawn:     (x) => Math.max(0, Math.min((x - 3) / 3, (8 - x) / 3)),
        morning:  (x) => Math.max(0, Math.min((x - 6) / 3, (11 - x) / 3)),
        noon:     (x) => Math.max(0, Math.min((x - 10) / 3, (15 - x) / 3)),
        evening:  (x) => x >= 15 ? Math.max(0, Math.min(1, (x - 15) / 8)) : 0
      }
    };

    this.outputSingletons = {
      zero: 0,
      veryShort: 5,
      short: 12,
      medium: 25,
      long: 40,
      veryLong: 60
    };

    this.rules = [
      ['veryDry', 'none', 'noon', 'veryLong'],
      ['veryDry', 'light', 'noon', 'long'],
      ['veryDry', 'moderate', 'noon', 'medium'],
      ['veryDry', 'heavy', 'any', 'veryShort'],
      ['veryDry', 'any', 'night', 'long'],
      ['veryDry', 'any', 'morning', 'veryLong'],
      
      ['dry', 'none', 'noon', 'long'],
      ['dry', 'light', 'noon', 'medium'],
      ['dry', 'moderate', 'any', 'short'],
      ['dry', 'heavy', 'any', 'zero'],
      ['dry', 'any', 'morning', 'medium'],
      
      ['optimal', 'none', 'noon', 'short'],
      ['optimal', 'light', 'noon', 'veryShort'],
      ['optimal', 'moderate', 'any', 'zero'],
      ['optimal', 'heavy', 'any', 'zero'],
      ['optimal', 'any', 'morning', 'veryShort'],
      
      ['wet', 'none', 'noon', 'veryShort'],
      ['wet', 'light', 'any', 'zero'],
      ['wet', 'moderate', 'any', 'zero'],
      ['wet', 'heavy', 'any', 'zero'],
      
      ['veryWet', 'any', 'any', 'zero']
    ];
  }

  evaluateRule(rule, inputs) {
    const [soilMF, rainMF, timeMF, outputSet] = rule;
    
    let fireStrength = 1.0;
    
    if (soilMF === 'any') fireStrength *= 1;
    else fireStrength *= this.membershipFunctions.soilMoistureError[soilMF](inputs.soilMoistureError);

    if (rainMF === 'any') fireStrength *= 1;
    else fireStrength *= this.membershipFunctions.rainProbability[rainMF](inputs.rainProbability);

    if (timeMF === 'any') fireStrength *= 1;
    else fireStrength *= this.membershipFunctions.timeOfDay[timeMF](inputs.timeOfDay);

    return { outputSet, strength: fireStrength };
  }

  defuzzify(activations) {
    let numerator = 0;
    let denominator = 0;

    for (const act of activations) {
      const singletonValue = this.outputSingletons[act.outputSet];
      numerator += act.strength * singletonValue;
      denominator += act.strength;
    }

    if (denominator === 0) return 0;
    return Math.round(numerator / denominator);
  }

  compute(targetMoisture, currentMoisture, rainProb, hour) {
    const error = targetMoisture - currentMoisture;
    
    const inputs = {
      soilMoistureError: error,
      rainProbability: rainProb,
      timeOfDay: hour
    };

    const activations = [];
    for (const rule of this.rules) {
      const result = this.evaluateRule(rule, inputs);
      if (result.strength > 0.01) {
        activations.push(result);
      }
    }

    return this.defuzzify(activations);
  }

  getMembershipValues(inputs) {
    return {
      soil: {
        veryDry: this.membershipFunctions.soilMoistureError.veryDry(inputs.soilMoistureError),
        dry: this.membershipFunctions.soilMoistureError.dry(inputs.soilMoistureError),
        optimal: this.membershipFunctions.soilMoistureError.optimal(inputs.soilMoistureError),
        wet: this.membershipFunctions.soilMoistureError.wet(inputs.soilMoistureError),
        veryWet: this.membershipFunctions.soilMoistureError.veryWet(inputs.soilMoistureError)
      },
      rain: {
        none: this.membershipFunctions.rainProbability.none(inputs.rainProbability),
        light: this.membershipFunctions.rainProbability.light(inputs.rainProbability),
        moderate: this.membershipFunctions.rainProbability.moderate(inputs.rainProbability),
        heavy: this.membershipFunctions.rainProbability.heavy(inputs.rainProbability)
      },
      time: {
        night: this.membershipFunctions.timeOfDay.night(inputs.timeOfDay),
        dawn: this.membershipFunctions.timeOfDay.dawn(inputs.timeOfDay),
        morning: this.membershipFunctions.timeOfDay.morning(inputs.timeOfDay),
        noon: this.membershipFunctions.timeOfDay.noon(inputs.timeOfDay),
        evening: this.membershipFunctions.timeOfDay.evening(inputs.timeOfDay)
      }
    };
  }

  explainDecision(targetMoisture, currentMoisture, rainProb, hour) {
    const error = targetMoisture - currentMoisture;
    const inputs = {
      soilMoistureError: error,
      rainProbability: rainProb,
      timeOfDay: hour
    };

    const activations = [];
    for (const rule of this.rules) {
      const result = this.evaluateRule(rule, inputs);
      if (result.strength > 0.01) {
        activations.push(result);
      }
    }

    const duration = this.defuzzify(activations);
    
    let reason = '';
    if (error > 15) reason = 'Đất rất khô';
    else if (error > 5) reason = 'Đất khô';
    else if (error > -5) reason = 'Đất lý tưởng';
    else if (error > -15) reason = 'Đất ẩm';
    else reason = 'Đất rất ẩm';

    if (rainProb > 60) reason += ', dự báo mưa to';
    else if (rainProb > 30) reason += ', có thể mưa';
    else if (rainProb < 10) reason += ', trời quang';

    if (hour >= 10 && hour <= 15) reason += ', trưa nắng';
    else if (hour >= 5 && hour <= 8) reason += ', sáng sớm';
    else if (hour >= 18) reason += ', chiều tối';

    return {
      duration,
      reason,
      error,
      rainProb,
      hour,
      activatedRules: activations.length
    };
  }
}

module.exports = new IrrigationFuzzyController();