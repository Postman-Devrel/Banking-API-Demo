#!/usr/bin/env sh
# ============================================
# PRE-COMMIT HOOK EXAMPLES WITH POSTMAN CLI
# ============================================
# Copy the desired example to .husky/pre-commit

# ============================================
# EXAMPLE 1: Simple - Run everything
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# postman collection run

# ============================================
# EXAMPLE 2: With specific collection ID
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# postman collection run <collection-id> -e <environment-id>

# ============================================
# EXAMPLE 3: Conditional - Only if API routes changed
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# if git diff --cached --name-only | grep -qE "src/routes|src/middleware"; then
#   echo "📬 API code changed - Running Postman tests..."
#   postman collection run
# else
#   echo "⏭️  No API changes, skipping Postman tests"
# fi

# ============================================
# EXAMPLE 4: With local collection file
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests from local file..."
# postman collection run ".postman/collections/[Blueprint] Intergalactic Bank API Reference Documentation.postman_collection.json"

# ============================================
# EXAMPLE 5: With environment variables
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# postman collection run \
#   --env-var "baseUrl=http://localhost:3000" \
#   --env-var "apiKey=test-key"

# ============================================
# EXAMPLE 6: With iteration data
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests with test data..."
# postman collection run \
#   --iteration-data test-data.json

# ============================================
# EXAMPLE 7: Silent mode (less output)
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# postman collection run --silent

# ============================================
# EXAMPLE 8: With custom reporters
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# postman collection run \
#   --reporter cli,json \
#   --reporter-json-export postman-results.json

# ============================================
# EXAMPLE 9: Run only if server is available
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# # Check if server is running
# if curl -s http://localhost:3000/health > /dev/null 2>&1; then
#   echo "✅ Server detected, running Postman tests..."
#   postman collection run
# else
#   echo "⚠️  Server not running. Start with: npm start"
#   echo "⏭️  Skipping Postman tests"
# fi

# ============================================
# EXAMPLE 10: Full setup with server start
# ============================================
# #!/usr/bin/env sh
# . "$(dirname -- "$0")/_/husky.sh"
# 
# echo "🔍 Running linter..."
# npx lint-staged
# 
# echo "🧪 Running Jest tests..."
# npm test
# 
# echo "📬 Running Postman API tests..."
# echo "🚀 Starting test server..."
# PORT=3099 NODE_ENV=test npm start > /dev/null 2>&1 &
# SERVER_PID=$!
# 
# # Wait for server to start
# sleep 3
# 
# # Run Postman tests
# postman collection run \
#   --env-var "baseUrl=http://localhost:3099"
# 
# POSTMAN_EXIT_CODE=$?
# 
# # Stop test server
# kill $SERVER_PID 2>/dev/null
# 
# if [ $POSTMAN_EXIT_CODE -ne 0 ]; then
#   echo "❌ Postman tests failed!"
#   exit 1
# fi
# 
# echo "✅ All checks passed!"

