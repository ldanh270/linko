import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const require = createRequire(import.meta.url)
const tw = require("tailwindcss")

const isFix = process.argv.includes("--fix")

function walk(dir) {
  let files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (
      entry.name === "node_modules" ||
      entry.name.startsWith(".next") ||
      entry.name === "scripts" ||
      entry.name === "dist"
    ) {
      continue
    }
    if (entry.isDirectory()) {
      files.push(...walk(full))
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Extract CSS class candidates specifically from className attributes and template literals */
function extractClassCandidates(content) {
  const candidates = new Set()

  // Match className="..." or className='...'
  const staticMatches = content.matchAll(/className\s*=\s*(?:"([^"]*)"|'([^']*)')/g)
  for (const m of staticMatches) {
    const raw = m[1] || m[2] || ""
    for (const token of raw.split(/\s+/)) {
      const clean = token.trim()
      if (clean && !clean.includes("${")) {
        candidates.add(clean)
      }
    }
  }

  // Match className={`...`} or className={... ? "..." : "..."}
  const dynamicMatches = content.matchAll(/className\s*=\s*\{([^}]*)\}/g)
  for (const m of dynamicMatches) {
    const expr = m[1] || ""
    // Find string literals inside the expression
    const stringLiterals = expr.matchAll(/(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)
    for (const s of stringLiterals) {
      const raw = s[1] || s[2] || s[3] || ""
      const clean = raw.replace(/\$\{[^}]*\}/g, " ")
      for (const token of clean.split(/\s+/)) {
        const trimmed = token.trim()
        if (trimmed && !trimmed.includes("${") && !trimmed.includes("?") && !trimmed.includes(":")) {
          candidates.add(trimmed)
        }
      }
    }
  }

  return Array.from(candidates)
}

async function main() {
  const cssPath = path.resolve(rootDir, "app/globals.css")
  const cssContent = fs.readFileSync(cssPath, "utf8")

  const ds = await tw.__unstable__loadDesignSystem(cssContent, {
    base: path.resolve(rootDir, "app"),
    loadStylesheet: async (id, base) => {
      if (id === "tailwindcss") {
        return {
          content: fs.readFileSync(require.resolve("tailwindcss/index.css", { paths: [base] }), "utf8"),
          base,
        }
      }
      const target = path.resolve(base, id)
      return { content: fs.readFileSync(target, "utf8"), base: path.dirname(target) }
    },
  })

  const files = walk(rootDir)
  let totalIssues = 0
  let fixedCount = 0

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8")
    let original = content

    const candidates = extractClassCandidates(content)
    const fileIssues = []

    for (const candidate of candidates) {
      try {
        const canonical = ds.canonicalizeCandidates([candidate], { rem: 16 })[0]
        if (canonical && canonical !== candidate) {
          fileIssues.push({ token: candidate, canonical })
          totalIssues++
          if (isFix) {
            const tokenRegex = new RegExp(`(?<=["'\`\\s])${escapeRegex(candidate)}(?=["'\`\\s])`, "g")
            content = content.replace(tokenRegex, canonical)
          }
        }
      } catch {
        // Ignored unparsable candidate
      }
    }

    if (fileIssues.length > 0) {
      const relPath = path.relative(rootDir, file)
      console.log(`\n📄 ${relPath}:`)
      for (const issue of fileIssues) {
        console.log(`   - \`${issue.token}\` can be written as \`${issue.canonical}\``)
      }
    }

    if (isFix && content !== original) {
      fs.writeFileSync(file, content, "utf8")
      fixedCount++
    }
  }

  if (totalIssues === 0) {
    console.log("✔ All Tailwind classes are canonical! (0 suggestCanonicalClasses warnings)")
    process.exit(0)
  } else if (isFix) {
    console.log(`\n✔ Fixed ${totalIssues} suggestions across ${fixedCount} files.`)
    process.exit(0)
  } else {
    console.log(`\n✖ Found ${totalIssues} suggestions. Run 'pnpm lint:tailwind --fix' to auto-fix.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Failed to run tailwind linter:", err)
  process.exit(1)
})
