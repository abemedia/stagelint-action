import * as core from '@actions/core'

export interface Inputs {
  version: string
  args: string
  workdir: string
  installOnly: boolean
  failOnChanges: boolean
  githubToken: string
}

export function getInputs(): Inputs {
  return {
    version: core.getInput('version'),
    args: core.getInput('args'),
    workdir: core.getInput('workdir'),
    installOnly: core.getBooleanInput('install-only'),
    failOnChanges: core.getBooleanInput('fail-on-changes'),
    githubToken: core.getInput('github-token'),
  }
}
