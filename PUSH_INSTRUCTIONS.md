# Push Instructions for Heads Up Repository

Since GitHub CLI is not installed, please follow these manual steps to create the repository and push your code:

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `headsup`
3. Description: `AI-powered sales coaching Chrome extension with real-time transcription`
4. Make sure **Public** is selected
5. Do NOT initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Run these from the `headsup` directory:

```bash
# Add the remote repository
git remote add origin https://github.com/justynroberts/headsup.git

# Push your code
git push -u origin main
```

## Alternative: Using Personal Access Token

If you get authentication errors:

1. Create a personal access token at https://github.com/settings/tokens
2. Use this command instead:
```bash
git remote add origin https://<YOUR_TOKEN>@github.com/justynroberts/headsup.git
git push -u origin main
```

## Step 3: Add Images (Optional)

If you want to add screenshots to your README:

1. Take screenshots of the extension in action
2. Save them in the `images` directory
3. Commit and push:
```bash
git add images/
git commit -m "Add screenshots for README"
git push
```

## Current Repository Status

- ✅ Git repository initialized
- ✅ All files added and committed
- ✅ Branch renamed to 'main'
- ✅ Ready to push

Your local repository is ready. Just create the repository on GitHub and push!