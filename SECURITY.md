# Security Policy

## Repository access

This repository contains the AlEx Platform source code and must be treated as private intellectual property.

GitHub repository visibility is an access-control setting, not an application feature. A public repository cannot prevent visitors from cloning, downloading, or copying its source code. The repository owner must keep `asizaguirre/alex-platform-v2` private and grant access only to explicitly authorized collaborators.

## Required GitHub settings

The repository owner should:

1. Set **Settings > General > Danger Zone > Change repository visibility** to **Private**.
2. Remove collaborators and outside teams that do not have explicit authorization.
3. Protect `main` and require a pull request review from `@asizaguirre`.
4. Disable direct pushes to `main` and require status checks before merge.
5. Review deploy keys, personal access tokens, GitHub Apps, Actions secrets, and webhooks.
6. Never commit `.env`, credentials, API keys, private Google keys, or production database exports.

The committed `.github/CODEOWNERS` file assigns `@asizaguirre` as the required code owner. GitHub branch protection must still be enabled in repository settings; `CODEOWNERS` alone does not block a direct push or a repository download.

## Application ownership controls

The application also enforces ownership for customer data:

- Public pages store `ownerEmail`.
- Customer page lists are filtered by owner.
- Page updates and deletes require the owner or administrator.
- Custom agents follow the same ownership rule.
- Only `asizaguirre@gmail.com` is the configured administrator in this version.

These application controls protect records inside the running platform. They do not protect source code stored in a public Git repository.

## Reporting a vulnerability

Do not open a public issue with credentials, private source, customer data, or exploit details. Contact the repository owner privately through the GitHub repository's private vulnerability reporting channel or another pre-approved private channel.
