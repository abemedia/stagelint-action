# stagelint-action

Runs [stagelint](https://stagelint.dev) in GitHub Actions on the files a pull request or push
changed, and fails when a command changes a file.

## Usage

```yaml
name: stagelint

on:
  pull_request:
  push:
    branches: [master]

permissions:
  contents: read

jobs:
  stagelint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Install the tools your stagelint config runs.

      - uses: abemedia/stagelint-action@v1
```

## Inputs

| Input             | Default                         | Description                                                                |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `version`         | `latest`                        | Version or semver range of stagelint to install, such as `0.1.7` or `^0.1` |
| `args`            | [Changed files](#files-checked) | Arguments to run stagelint with                                            |
| `workdir`         | `.`                             | Directory to run stagelint in                                              |
| `install-only`    | `false`                         | Only install stagelint and add it to `PATH`                                |
| `fail-on-changes` | `true`                          | Fail when a command changed a file                                         |
| `github-token`    | `${{ github.token }}`           | Token used to look up stagelint releases                                   |

## Outputs

| Output    | Description                     |
| --------- | ------------------------------- |
| `version` | The installed stagelint version |

## Files checked

Without `args`, the action checks the files changed by the event that triggered the workflow:

| Event          | Files                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `pull_request` | Changed since the pull request's branch diverged from its base                 |
| `merge_group`  | Changed since the merge queue's base commit                                    |
| `push`         | Changed since the previous commit on the branch, or every file on a new branch |
| Anything else  | Every file                                                                     |

If the base commit cannot be fetched, such as after a force push, every file is checked and a
warning is logged.

## Fixing pull requests with autofix.ci

To commit fixes back to the pull request instead of failing, turn off `fail-on-changes` and end the
job with the [autofix.ci](https://autofix.ci) action. It needs the autofix.ci GitHub App, and the
workflow must be named `autofix.ci`:

```yaml
name: autofix.ci

on:
  pull_request:

permissions:
  contents: read

jobs:
  autofix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Install the tools your stagelint config runs.

      - uses: abemedia/stagelint-action@v1
        with:
          fail-on-changes: false

      - uses: autofix-ci/action@v1
```
