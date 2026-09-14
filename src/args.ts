import { readFile } from 'node:fs/promises'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

/** Returns the stagelint arguments for the files the triggering event changed. */
export async function eventArgs(cwd: string): Promise<string[]> {
  const base = await baseCommit()
  if (!base) {
    return ['--all']
  }
  try {
    await fetchHistory(base, cwd)
  } catch (error) {
    core.warning(`Linting every file: ${error instanceof Error ? error.message : String(error)}`)
    return ['--all']
  }
  return ['--diff', `${base}...HEAD`]
}

async function baseCommit(): Promise<string | undefined> {
  const path = process.env.GITHUB_EVENT_PATH
  const event = path ? JSON.parse(await readFile(path, 'utf8')) : {}
  switch (process.env.GITHUB_EVENT_NAME) {
    case 'pull_request':
      return event.pull_request.base.sha
    case 'merge_group':
      return event.merge_group.base_sha
    case 'push':
      return /^0+$/.test(event.before) ? undefined : event.before
  }
}

async function fetchHistory(base: string, cwd: string): Promise<void> {
  const sha = process.env.GITHUB_SHA
  if (!sha) {
    throw new Error('GITHUB_SHA is not set')
  }
  const git = (...args: string[]) =>
    exec.getExecOutput('git', args, { cwd, silent: true, ignoreReturnCode: true })
  const gitFetch = async (...args: string[]) => {
    const { exitCode, stderr } = await git('fetch', '--no-tags', ...args)
    if (exitCode !== 0) {
      throw new Error(`git fetch failed: ${stderr.trim()}`)
    }
  }

  if ((await git('cat-file', '-e', `${base}^{commit}`)).exitCode !== 0) {
    await gitFetch('--depth=1', 'origin', base)
  }
  for (let depth = 50; (await git('merge-base', base, 'HEAD')).exitCode !== 0; depth *= 2) {
    if ((await git('rev-parse', '--is-shallow-repository')).stdout.trim() !== 'true') {
      throw new Error(`no merge base between ${base} and HEAD`)
    }
    // `HEAD` in a refspec names the remote's HEAD, and local commits cannot be fetched, so deepen
    // from the commit the workflow checked out.
    await gitFetch(`--deepen=${depth}`, 'origin', base, sha)
  }
}
