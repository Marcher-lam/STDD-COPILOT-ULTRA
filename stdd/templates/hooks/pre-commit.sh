#!/bin/sh
# STDD Copilot Pre-Commit Hook
# Runs quality checks before allowing commits

echo "🛡️  Running STDD Guard..."

# Run the guard
cd "$(git rev-parse --show-toplevel)"
stdd guard --no-constitution

STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo ""
  echo "❌ Pre-commit check failed!"
  echo ""
  echo "The STDD Guard found issues that must be fixed before committing."
  echo ""
  echo "To bypass this check (not recommended), use:"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo ""
echo "✅ All checks passed!"
exit 0
