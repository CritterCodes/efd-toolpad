# 🚀 EFD Manual Release Workflow

## 🎯 Simple Release Process

When you've completed a feature or fix and it's ready for users, follow this exact sequence:

### 📋 **The Process**

```bash
# 1. Complete your feature/fix with regular commits
git add .
git commit -m "feat(shop): add new product filtering"
git commit -m "fix typo in filter labels"
git commit -m "add tests for filtering"

# 2. When feature is COMPLETE and ready for release
npm run release          # For bug fixes (patch: 1.0.0 → 1.0.1)
npm run release:minor    # For new features (minor: 1.0.0 → 1.1.0)  
npm run release:major    # For breaking changes (major: 1.0.0 → 2.0.0)

# 3. Push everything to main (including the version bump commit and tag)
git push origin main --tags
```

### 🎯 **When to Use Each Release Type**

| Command | When to Use | Example | Version Change |
|---------|-------------|---------|----------------|
| `npm run release` | Bug fixes, small improvements | Fix cart calculation | 1.0.0 → 1.0.1 |
| `npm run release:minor` | New features, enhancements | Add product search | 1.0.0 → 1.1.0 |
| `npm run release:major` | Breaking changes, major redesigns | New authentication system | 1.0.0 → 2.0.0 |

### ✅ **What `npm run release` Does**

1. **Updates package.json** in all 3 apps (shop, admin, docs) with new version
2. **Creates a git commit** with the version changes
3. **Creates a git tag** (e.g., `v1.0.1`)
4. **Generates release notes** from your commits

### 🔄 **Complete Example Workflow**

```bash
# Working on a new wholesale management feature
git commit -m "start wholesale dashboard"
git commit -m "add repair tracking"  
git commit -m "implement status updates"
git commit -m "add printing functionality"

# Feature is complete and tested - ready for release
npm run release:minor
# ✅ This bumps version from 1.0.1 → 1.1.0
# ✅ Updates package.json in all apps
# ✅ Creates commit: "🔄 Release v1.1.0 (Ecosystem)"
# ✅ Creates tag: v1.1.0

# Push everything to GitHub
git push origin main --tags
# ✅ This pushes your feature commits + version commit + tag
```

### 📊 **Before Running Release**

Make sure:
- [ ] Your feature/fix is complete and tested
- [ ] All files are committed (no uncommitted changes)
- [ ] You're on the main branch
- [ ] You've pulled the latest changes: `git pull origin main`

### 🚨 **Common Mistakes to Avoid**

❌ **Don't push before running release**
```bash
# Wrong order
git push origin main     # ❌ Pushing before release
npm run release         # ❌ Too late!
```

✅ **Correct order**
```bash
# Right order  
npm run release         # ✅ Release first
git push origin main --tags  # ✅ Then push everything
```

❌ **Don't run release for every commit**
```bash
git commit -m "fix typo"
npm run release         # ❌ Don't release for every tiny change
```

✅ **Release when feature/fix is complete**
```bash
git commit -m "fix typo"
git commit -m "add validation"
git commit -m "update tests"
npm run release         # ✅ Release when the whole fix is done
```

### 🎉 **After Release**

Once you run `npm run release` and push:

1. **Check GitHub** - Your release will appear in the releases section
2. **Verify deployments** - Applications should auto-deploy (if configured)
3. **Monitor for issues** - Watch for any problems with the new version

### 📚 **Quick Reference**

```bash
# Development workflow
git commit -m "your changes"
git commit -m "more changes"

# When ready to release
npm run release          # Patch (bug fixes)
npm run release:minor    # Minor (new features)  
npm run release:major    # Major (breaking changes)

# Push to GitHub
git push origin main --tags
```

---

## 🎯 **Summary**

**When do I run `npm run release`?**
- After you've completed a feature or fix
- Before pushing to main
- When you're ready for users to get the changes

**The key insight:** Release is the "final step" before sharing your completed work with users! 🚀