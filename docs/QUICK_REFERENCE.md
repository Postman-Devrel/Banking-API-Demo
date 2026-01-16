# Quick Reference - Pre-Commit Hooks & Postman CLI

## 🎯 What's Set Up

✅ **ESLint** - Code linting  
✅ **Jest** - Unit & integration tests  
✅ **Husky** - Git hooks manager  
✅ **lint-staged** - Run linter on staged files only  
✅ **Postman CLI** - API testing tool (ready to activate)

## 🚀 Quick Commands

```bash
# Run linter
npm run lint              # Check all files
npm run lint:fix          # Auto-fix issues

# Run tests
npm test                  # All tests with coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:api          # Postman tests (after setup)

# Git operations
git commit -m "message"   # Runs hooks automatically
git commit --no-verify    # Skip hooks (emergency only)
```

## 📬 Activate Postman CLI in Pre-Commit

### Option 1: Always Run (Thorough)
```bash
# Edit .husky/pre-commit, add at the end:
echo "📬 Running Postman API tests..."
postman collection run
```

### Option 2: Conditional Run (Fast - Recommended)
```bash
# Edit .husky/pre-commit, add at the end:
if git diff --cached --name-only | grep -qE "src/routes|src/middleware"; then
  echo "📬 Running Postman tests..."
  postman collection run
fi
```

### Option 3: Use Ready-Made Examples
```bash
# Copy from 10 pre-made examples:
cat .husky/pre-commit-examples.sh

# Pick one and copy to .husky/pre-commit
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `COMMIT_HOOKS.md` | Overview of git hooks setup |
| `POSTMAN_CLI_GUIDE.md` | Complete Postman CLI guide with examples |
| `.husky/README.md` | Hooks directory documentation |
| `.husky/pre-commit-examples.sh` | 10 ready-to-use hook patterns |
| `QUICK_REFERENCE.md` | This file - quick commands |

## 🔧 First Time Postman Setup

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Login to Postman
postman login

# 3. Test Postman CLI manually
postman collection run

# 4. Add to pre-commit hook (choose option above)
nano .husky/pre-commit  # or use your editor

# 5. Test it!
git add .
git commit -m "test: postman integration"
```

## 🎨 Customization Examples

### Run Postman with environment
```bash
postman collection run <collection-id> -e <environment-id>
```

### Run with custom variables
```bash
postman collection run \
  --env-var "baseUrl=http://localhost:3000" \
  --env-var "apiKey=test-key"
```

### Run local collection file
```bash
postman collection run ".postman/collections/[Blueprint] Intergalactic Bank API Reference Documentation.postman_collection.json"
```

### Silent mode (less output)
```bash
postman collection run --silent
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Hook not running | `npm run prepare` |
| Postman not authenticated | `postman login` |
| Tests too slow | Use conditional execution (Option 2) |
| Server not available | Add server start/stop to hook |
| Want to skip once | `git commit --no-verify` |

## 📖 Learn More

- **Postman CLI**: See `POSTMAN_CLI_GUIDE.md`
- **Git Hooks**: See `COMMIT_HOOKS.md`
- **Husky Docs**: https://typicode.github.io/husky/

## 🎯 Recommended Setup

For the best balance of speed and coverage:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running linter on staged files..."
npx lint-staged

echo "🧪 Running Jest tests..."
npm test

# Only run Postman if API files changed
if git diff --cached --name-only | grep -qE "src/routes|src/middleware"; then
  echo "📬 API changed - Running Postman tests..."
  postman collection run
else
  echo "⏭️  No API changes, skipping Postman tests"
fi

echo "✅ All checks passed!"
```

**Why this is recommended:**
- ✅ Fast: Postman only runs when needed
- ✅ Thorough: Covers all API changes
- ✅ Efficient: Doesn't slow down non-API commits

---

**Need help?** Check the documentation files listed above! 📚

