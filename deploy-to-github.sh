#!/bin/bash

# GitNetwork GitHub Pages Deployment Script
# Uses Personal Access Token to publish to GitHub

set -e

# Configuration
GITHUB_PAT="${GITHUB_PAT:-}"
GITHUB_USERNAME="${GITHUB_USERNAME:-}"
REPOSITORY_NAME="${REPOSITORY_NAME:-gitnetwork}"
BRANCH_TO_PUSH="${BRANCH_TO_PUSH:-$(git branch --show-current || git rev-parse --abbrev-ref HEAD)}"

if [ -z "$GITHUB_PAT" ]; then
    echo "Error: GITHUB_PAT environment variable is not set."
    echo "Please set it: export GITHUB_PAT='your-personal-access-token'"
    exit 1
fi

if [ -z "$GITHUB_USERNAME" ]; then
    echo "Error: GITHUB_USERNAME environment variable is not set."
    echo "Please set it: export GITHUB_USERNAME='your-github-username'"
    exit 1
fi

echo "Building static assets..."
npm run build

echo "Ensuring current branch is tracked..."
CURRENT_BRANCH=$(git branch --show-current || git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    git branch -M main
fi

echo "Adding remote with PAT..."
git remote set-url origin "https://x-access-token:${GITHUB_PAT}@github.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}.git" || git remote add origin "https://x-access-token:${GITHUB_PAT}@github.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}.git"

echo "Staging files..."
git add -A

echo "Committing changes..."
git commit -m "chore: deploy GitNetwork to GitHub Pages" --allow-empty || echo "No changes to commit"

echo "Pushing to GitHub..."
git push -u origin "$CURRENT_BRANCH" --force

echo "Deployment complete!"
echo "Repository: https://github.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}"
echo "GitHub Pages URL: https://${GITHUB_USERNAME}.github.io/${REPOSITORY_NAME}/"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}/settings/pages"
echo "2. Set Source to 'Deploy from a branch'"
echo "3. Select '$CURRENT_BRANCH' branch and '/ (root)' folder"
echo "4. Save"
