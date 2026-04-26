const skillRegistry = require('../src/skill-registry');

describe('SkillRegistry', () => {
  test('should discover skills', () => {
    expect(skillRegistry.count()).toBeGreaterThan(0);
  });
  
  test('should get categories', () => {
    const categories = skillRegistry.getCategories();
    expect(categories.length).toBeGreaterThan(0);
  });
  
  test('should find skill by name', () => {
    const skill = skillRegistry.getSkill('plant-disease-detector');
    expect(skill).toBeDefined();
    expect(skill.category).toBe('agriculture');
  });
  
  test('should get skills by category', () => {
    const skills = skillRegistry.getSkillsByCategory('agriculture');
    expect(skills.length).toBeGreaterThan(0);
  });
  
  test('should load skill with dependencies', () => {
    const skill = skillRegistry.getSkillWithDeps('system-audit');
    expect(skill).toBeDefined();
  });
});