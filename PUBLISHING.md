# Publishing to npm

This guide covers how to publish the mcp-policy-server package to npm.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **npm login**: Run `npm login` and authenticate
3. **Organization access**: If publishing to `@andrebremer` scope, ensure you have access

## Pre-publish Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Code is properly formatted: `npm run format:check`
- [ ] No linting errors: `npm run lint`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated with new version notes
- [ ] README.md reflects any new features or changes
- [ ] All changes committed to git

## Version Guidelines

Follow semantic versioning (semver):

- **Patch (1.0.x)**: Bug fixes, no API changes
- **Minor (1.x.0)**: New features, backward compatible
- **Major (x.0.0)**: Breaking changes

Update version with:
```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

This automatically:
- Updates `package.json`
- Creates a git commit
- Creates a git tag

## Publishing Steps

### 1. Verify Package Contents

Check what files will be published:

```bash
npm pack --dry-run
```

Should include:
- `dist/**/*` (compiled JavaScript)
- `README.md`
- `LICENSE`
- `docs/**/*`
- `package.json`

Should NOT include:
- `src/**/*` (TypeScript source)
- `tests/**/*`
- `.git/`
- `node_modules/`

### 2. Test Package Locally

Install package locally to verify it works:

```bash
# Build and pack
npm run build
npm pack

# Install in test directory
cd /tmp
npm install /path/to/mcp-policy-server/andrebremer-mcp-policy-server-1.0.0.tgz

# Test the command
npx @andrebremer/mcp-policy-server --help
```

### 3. Publish to npm

**For first-time publish:**
```bash
npm publish --access public
```

**For updates:**
```bash
npm publish
```

The `prepublishOnly` script automatically:
1. Cleans previous builds
2. Rebuilds TypeScript
3. Runs all tests

### 4. Verify Publication

Check package on npm:
```bash
npm view @andrebremer/mcp-policy-server
```

Test installation:
```bash
npx @andrebremer/mcp-policy-server@latest
```

### 5. Push Git Tags

Push version tag to GitHub:
```bash
git push origin main --tags
```

### 6. Create GitHub Release

1. Go to https://github.com/AndreBremer/mcp-policy-server/releases
2. Click "Draft a new release"
3. Select the version tag (e.g., `v1.0.0`)
4. Title: "Version 1.0.0"
5. Description: Copy from CHANGELOG.md
6. Click "Publish release"

## Publishing Beta/Alpha Versions

For testing before stable release:

```bash
# Update version with prerelease tag
npm version prerelease --preid=beta  # 1.0.0 -> 1.0.1-beta.0

# Publish with beta tag
npm publish --tag beta

# Users install with:
npm install @andrebremer/mcp-policy-server@beta
```

## Unpublishing (Emergency Only)

Only unpublish within 72 hours of publication:

```bash
npm unpublish @andrebremer/mcp-policy-server@1.0.0
```

**Warning:** Unpublishing is permanent and breaks dependents. Use deprecation instead:

```bash
npm deprecate @andrebremer/mcp-policy-server@1.0.0 "Critical bug, upgrade to 1.0.1"
```

## Troubleshooting

### Error: Package name already exists

If `@andrebremer/mcp-policy-server` is taken:
- Choose different scope: `@yourname/mcp-policy-server`
- Or use unscoped name: `mcp-policy-server-unique-suffix`

Update `package.json` name field and retry.

### Error: Missing access to publish

For scoped packages, ensure organization access:
```bash
npm access grant read-write @andrebremer:developers @andrebremer/mcp-policy-server
```

### Error: prepublishOnly script failed

Fix the failing step:
- Tests failing: `npm test` to see errors
- Build errors: `npm run build`
- Lint errors: `npm run lint:fix`

### Publishing from CI/CD

Use npm automation token:

```yaml
# .github/workflows/publish.yml
- name: Publish to npm
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

Generate token at https://www.npmjs.com/settings/tokens

## Post-Publication

After successful publish:

1. Update README installation instructions
2. Announce on relevant channels
3. Update documentation site if applicable
4. Monitor npm download stats
5. Watch for issues/bug reports

## Package Maintenance

**View package stats:**
```bash
npm info @andrebremer/mcp-policy-server
```

**Check outdated dependencies:**
```bash
npm outdated
```

**Update dependencies:**
```bash
npm update
npm run test  # Verify nothing broke
```

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [npm Scripts](https://docs.npmjs.com/cli/v8/using-npm/scripts)
