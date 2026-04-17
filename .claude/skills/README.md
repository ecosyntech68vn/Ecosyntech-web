# EcoSynTech-web Skills

Custom skills for managing EcoSynTech IoT backend.

## Available Skills

| Skill | Description | Usage |
|-------|-------------|--------|
| `/security-audit` | Comprehensive security audit | Run security checks |
| `/health-check` | System health and API status | Check system health |
| `/log-analyzer` | Analyze logs and find issues | Debug issues |
| `/iot-debug` | Debug IoT device issues | Troubleshoot ESP32 |
| `/deployment` | Deploy production | Deploy to production |

## Usage

Invoke a skill:
```
/security-audit
/health-check
/log-analyzer
/iot-debug
/deployment
```

## Adding New Skills

Add skills to `.claude/skills/` directory.

Structure:
```
.claude/skills/
├── skill-name/
│   └── SKILL.md
└── another-skill/
    └── SKILL.md
```