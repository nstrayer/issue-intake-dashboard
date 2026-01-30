# Publishing to npm

1. Run `npm version patch|minor|major` (creates git commit and tag)
2. Run `npm publish` (runs build automatically via prepublishOnly)

Ensure you're logged in with `npm login` if auth has expired.
