# Git Hooks Directory

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## 📁 Files

- **`pre-commit`** - Currently active pre-commit hook
- **`pre-commit-examples.sh`** - 10 examples showing different Postman CLI integration patterns
- **`_/`** - Husky internal files (don't modify)

## 🔧 Current Hook

The current `pre-commit` hook runs:
1. ✅ ESLint on staged files
2. ✅ Jest tests (all unit & integration)

## 📬 Adding Postman CLI

Want to add Postman API tests? See:
- **`POSTMAN_CLI_GUIDE.md`** (in project root) - Complete guide
- **`pre-commit-examples.sh`** (this directory) - 10 ready-to-use examples

### Quick Add (Conditional Execution - Recommended)

Replace `pre-commit` contents with:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running linter on staged files..."
npx lint-staged

echo "🧪 Running Jest tests..."
npm test

# Only run if API code changed
if git diff --cached --name-only | grep -qE "src/routes|src/middleware"; then
  echo "📬 API changed - Running Postman tests..."
  postman collection run
else
  echo "⏭️  Skipping Postman tests (no API changes)"
fi
```

## 🎯 Other Hook Options

You can create other hooks in this directory:
- `pre-push` - Runs before `git push`
- `commit-msg` - Validates commit messages
- `post-commit` - Runs after successful commit
- `pre-rebase` - Runs before rebase

Example:
```bash
npx husky add .husky/pre-push "npm run lint && npm test"
```

## 🔍 Testing Hooks

Test your hooks without committing:

```bash
# Test the pre-commit hook
.husky/pre-commit

# Or with git
git commit --dry-run
```

## 🚫 Bypassing Hooks

Sometimes you need to skip hooks (not recommended):

```bash
git commit --no-verify -m "emergency fix"
```

## 📚 Learn More

- [Husky Documentation](https://typicode.github.io/husky/)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [Postman CLI Documentation](https://learning.postman.com/docs/postman-cli/postman-cli-overview/)

