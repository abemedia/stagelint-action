import { HttpClient } from '@actions/http-client'
import semver from 'semver'

const http = new HttpClient('stagelint-action')

interface GitHubRelease {
  tag_name: string
  draft: boolean
}

/** Resolves `latest`, an exact version or a semver range to the newest matching stagelint version. */
export async function resolveVersion(version: string, token: string): Promise<string> {
  const exact = semver.clean(version)
  if (exact) {
    return exact
  }
  if (version === 'latest') {
    const release = await getJson<GitHubRelease>(
      'https://api.github.com/repos/abemedia/stagelint/releases/latest',
      token,
    )
    return release.tag_name.replace(/^v/, '')
  }

  const range = semver.validRange(version)
  if (!range) {
    throw new Error(`Invalid version: ${version}`)
  }
  const versions: string[] = []
  for (let page = 1; ; page++) {
    const releases = await getJson<GitHubRelease[]>(
      `https://api.github.com/repos/abemedia/stagelint/releases?per_page=100&page=${page}`,
      token,
    )
    versions.push(...releases.filter((r) => !r.draft).map((r) => r.tag_name.replace(/^v/, '')))
    if (releases.length < 100) {
      break
    }
  }
  const match = semver.maxSatisfying(versions, range)
  if (!match) {
    throw new Error(`No stagelint release matches ${version}`)
  }
  return match
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const { result } = await http.getJson<T>(url, {
    accept: 'application/vnd.github+json',
    ...(token && { authorization: `Bearer ${token}` }),
  })
  if (!result) {
    throw new Error(`Not found: ${url}`)
  }
  return result
}
