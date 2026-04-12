#!/usr/bin/env bash
set -euo pipefail

RUNBOOK_MD="docs/customer-deployment.md"
RUNBOOK_PDF="docs/customer-deployment.pdf"

echo "[PDF] Generating Runbook PDF from $RUNBOOK_MD"
if ! command -v pandoc >/dev/null 2>&1; then
  echo "Pandoc not found. Please install pandoc to generate the PDF runbook."
  echo "You can run: sudo apt-get update && sudo apt-get install -y pandoc"  # if on Debian/Ubuntu
  exit 0
fi

if [ -f "$RUNBOOK_MD" ]; then
  pandoc "$RUNBOOK_MD" -s -o "$RUNBOOK_PDF" 
  if [ -f "$RUNBOOK_PDF" ]; then
    echo "PDF generated at $RUNBOOK_PDF"
    git add "$RUNBOOK_PDF" || true
    git status --porcelain
    if git diff --cached --quiet; then
      echo "No changes to commit for PDF."
    else
      git commit -m "docs: add customer deployment Runbook PDF (auto-generated)" || true
      git push origin HEAD
    fi
  else
    echo "Failed to generate PDF despite pandoc availability."
  fi
else
  echo "Runbook Markdown file not found: $RUNBOOK_MD"
fi
