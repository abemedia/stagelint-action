import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import { bundleFromJSON } from '@sigstore/bundle'
import { getTrustedRoot } from '@sigstore/tuf'
import { toSignedEntity, toTrustMaterial, Verifier } from '@sigstore/verify'
import semver from 'semver'

const targets: Partial<Record<string, string>> = {
  'linux-x64': 'x86_64-unknown-linux-musl',
  'linux-arm64': 'aarch64-unknown-linux-musl',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'win32-x64': 'x86_64-pc-windows-gnu',
  'win32-arm64': 'aarch64-pc-windows-gnullvm',
}

/** Installs stagelint `version` into the tool cache and returns the path to its binary. */
export async function install(version: string): Promise<string> {
  const target = targets[`${process.platform}-${process.arch}`]
  if (!target) {
    throw new Error(`stagelint has no release for ${process.platform}-${process.arch}`)
  }
  if (semver.lt(version, '0.1.3')) {
    throw new Error(`stagelint ${version} is not supported, use 0.1.3 or later`)
  }

  const cached = tc.find('stagelint', version)
  if (cached) {
    core.info(`stagelint ${version} found in the tool cache`)
    return getExePath(cached)
  }

  const ext = process.platform === 'win32' ? '.zip' : '.tar.gz'
  const file = `stagelint-${version}-${target}${ext}`
  const url = `https://github.com/abemedia/stagelint/releases/download/v${version}`
  const temp = join(process.env.RUNNER_TEMP ?? tmpdir(), randomUUID())

  const download = (name: string) => tc.downloadTool(`${url}/${name}`, join(temp, name))

  core.info(`Downloading ${url}/${file}`)
  const [archive, checksums, bundle] = await Promise.all([
    download(file),
    download('checksums.txt'),
    download('checksums.txt.sigstore.json'),
  ])
  await verifyChecksum(version, file, archive, checksums, bundle)

  const extracted = ext === '.zip' ? await tc.extractZip(archive) : await tc.extractTar(archive)
  return getExePath(await tc.cacheDir(extracted, 'stagelint', version))
}

async function verifyChecksum(
  version: string,
  file: string,
  archivePath: string,
  checksumsPath: string,
  bundlePath: string,
): Promise<void> {
  const checksums = await readFile(checksumsPath)
  const bundle = bundleFromJSON(JSON.parse(await readFile(bundlePath, 'utf8')))
  const identity = `https://github.com/abemedia/stagelint/.github/workflows/publish.yml@refs/tags/v${version}`
  const verifier = new Verifier(toTrustMaterial(await getTrustedRoot()))
  verifier.verify(toSignedEntity(bundle, checksums), {
    subjectAlternativeName: new RegExp(`^${RegExp.escape(identity)}$`),
    extensions: { issuer: 'https://token.actions.githubusercontent.com' },
  })
  core.info('Signature verified for checksums.txt')

  const expected = checksums
    .toString('utf8')
    .split('\n')
    .find((line) => line.endsWith(`  ${file}`))
    ?.split(' ')[0]
  const actual = createHash('sha256')
    .update(await readFile(archivePath))
    .digest('hex')
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${file}`)
  }
  core.info(`Checksum verified for ${file}`)
}

function getExePath(dir: string): string {
  return join(dir, process.platform === 'win32' ? 'stagelint.exe' : 'stagelint')
}
