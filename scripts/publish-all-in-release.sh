#!/usr/bin/env bash
set -euo pipefail
echo "Starting All-In Release publish..."

BRANCH="release/all-in-2.0.0"
TAG="v2.0.0-all-in"

git fetch origin --tags --prune
git checkout -b "$BRANCH" || git switch -c "$BRANCH"
git status --porcelain

echo "Running full test cycle (all) before release..."
npm run all

echo "Tagging release ${TAG}..."
git tag -a "$TAG" -m "All-In Release 2.0.0: PR automation, bootstrap, dockerize, runbooks, and tests" || true
git push origin "$BRANCH" --set-upstream
git push origin "$TAG" || true

if [ -n "${GITHUB_TOKEN:-}" ]; then
  BASE_URL="https://api.github.com/repos/ecosyntech68vn/Ecosyntech-web/pulls"
  BODY=$(cat <<'EOF'
- All-In Release 2.0.0: PR automation, bootstrap, dockerize, runbooks, and tests.
- Includes customer deployment bundle and a runbook for deployment.
- Release tag: v2.0.0-all-in
EOF
)
  PR=$(curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
    -d '{"title":"Release All-In 2.0.0","head":"'$BRANCH'","base":"main","body":"'${BODY}'"}' \
    "$BASE_URL" | jq -r '.number') || true
  if [[ "$PR" != "" ]]; then
    echo "Created PR #$PR for release. You can merge once CI checks pass."
  else
    echo "PR not created via API. You can create PR manually from branch $BRANCH to main."
  fi
else
  echo "GITHUB_TOKEN not set. Create PR manually from branch $BRANCH to main."
fi

echo "All-In Release publish script finished."
