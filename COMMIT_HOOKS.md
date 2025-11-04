# Git Commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically enforce code quality before commits.

## What Happens on Commit?

When you run `git commit`, the following checks run automatically:

### 1. 🔍 Linter (ESLint)
- Runs **only on staged `.js` files** (fast and efficient)
- Automatically fixes formatting issues where possible
- Prevents commits if there are unfixable linting errors

### 2. 🧪 Tests (Jest)
- Runs the complete test suite (unit + integration tests)
- Ensures all 94 tests pass
- Prevents commits if any tests fail
- Displays code coverage report

### 3. 📬 API Tests (Postman CLI) - Optional
- Can be added to run Postman collections
- See `POSTMAN_CLI_GUIDE.md` for setup instructions
- Multiple integration options available

## How It Works

```bash
# Stage your changes
git add .

# Try to commit
git commit -m "your message"

# Pre-commit hook runs:
# ✓ Lints staged files
# ✓ Runs all tests
# ✓ Commits only if everything passes
```

## Configuration Files

- **`.husky/pre-commit`** - The pre-commit hook script
- **`package.json`** - `lint-staged` configuration
  ```json
  "lint-staged": {
    "*.js": [
      "eslint --fix"
    ]
  }
  ```

## Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass the hooks:

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning:** Only use `--no-verify` in emergencies. The hooks exist to maintain code quality.

## Benefits

✅ **Catches errors early** - Before they reach the repository  
✅ **Consistent code style** - Automatically enforced  
✅ **Prevents broken code** - Tests must pass  
✅ **Fast** - Only lints changed files  
✅ **Automatic** - No manual steps required

## Troubleshooting

### Hook not running?
```bash
# Reinstall hooks
npm run prepare
```

### Want to run checks manually?
```bash
# Run linter
npm run lint

# Run linter with auto-fix
npm run lint:fix

# Run tests
npm test
```

### Modify the hook behavior?
Edit `.husky/pre-commit` to customize what runs before commits.

## Team Setup

When a new team member clones the repository:

```bash
npm install  # Automatically installs hooks via 'prepare' script
```

The hooks are now active for their local repository!

## 📬 Adding Postman CLI Tests

Want to add Postman API tests to your pre-commit hook? 

1. **Read the guide**: See `POSTMAN_CLI_GUIDE.md` for detailed instructions
2. **View examples**: Check `.husky/pre-commit-examples.sh` for 10 different patterns
3. **Choose your approach**:
   - Always run: Comprehensive but slower
   - Conditional: Only run when API files change (recommended)
   - Manual: Use `npm run test:api` separately

### Quick Start - Add Postman CLI

```bash
# 1. Install Postman CLI (already in package.json)
npm install

# 2. Login to Postman
postman login

# 3. Edit .husky/pre-commit and add:
echo "📬 Running Postman API tests..."
postman collection run

# Or run conditionally (only if API changed):
if git diff --cached --name-only | grep -qE "src/routes|src/middleware"; then
  echo "📬 Running Postman tests..."
  postman collection run
fi
```

See the full guide for more options!

