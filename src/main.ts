import { dirname } from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { eventArgs } from './args.ts'
import * as context from './context.ts'
import * as github from './github.ts'
import * as stagelint from './stagelint.ts'

async function run(): Promise<void> {
  try {
    const inputs = context.getInputs()
    const version = await github.resolveVersion(inputs.version, inputs.githubToken)
    const bin = await stagelint.install(version)
    core.setOutput('version', version)
    core.info(`stagelint ${version} installed successfully`)

    if (inputs.installOnly) {
      core.addPath(dirname(bin))
      return
    }

    const cwd = inputs.workdir
    if (inputs.args) {
      await exec.exec(`"${bin}" ${inputs.args}`, [], { cwd })
    } else {
      await exec.exec(bin, await eventArgs(cwd), { cwd })
    }

    if (
      inputs.failOnChanges &&
      (await exec.exec('git', ['diff', '--exit-code', 'HEAD'], { cwd, ignoreReturnCode: true }))
    ) {
      core.setFailed('stagelint changed files, run it locally and commit the result')
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
