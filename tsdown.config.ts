import { licensePlugin } from 'rolldown-license-plugin'
import { defineConfig } from 'tsdown'

const licenseFallbacks: Record<string, string> = {
  '@sigstore/verify': '@sigstore/core',
}

export default defineConfig({
  entry: 'src/main.ts',
  plugins: [
    licensePlugin({
      wrapLicenseText: 110,
      done(deps, context) {
        const texts = new Map(deps.map((dep) => [dep.name, dep.licenseText]))
        context.emitFile({
          type: 'asset',
          fileName: 'licenses.txt',
          source: deps
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .map((dep) => {
              const fallback = licenseFallbacks[dep.name]
              const text = dep.licenseText || (fallback && texts.get(fallback))
              if (!text) {
                throw new Error(`No license text for ${dep.name}`)
              }
              return `${dep.name}@${dep.version} - ${dep.license}\n\n${text}`
            })
            .join('\n\n'),
        })
      },
    }),
  ],
})
