#!/usr/bin/env node

/**
 * Architecture Validation Script
 * 
 * Validates that the codebase follows Project Maestro architecture patterns
 * 
 * Usage:
 *   npm run validate:architecture
 *   node scripts/validate-architecture.js --fix
 */

const fs = require('fs/promises')
const path = require('path')

// Validation rules
const VALIDATION_RULES = {
  // No Node.js imports in renderer
  noNodeInRenderer: {
    name: 'No Node.js imports in renderer',
    description: 'Renderer process must not import Node.js modules',
    pattern: /import.*['"](?:fs|path|os|crypto|child_process|electron)['"]|require\s*\(\s*['"](?:fs|path|os|crypto|child_process|electron)['"]\s*\)/,
    directories: ['src/renderer'],
    severity: 'error'
  },
  
  // All services must implement contracts
  serviceContractImplementation: {
    name: 'Service contract implementation',
    description: 'All services must implement their domain contracts',
    validate: async (filePath, content) => {
      if (!filePath.includes('src/main/services/') || !filePath.endsWith('.ts')) {
        return { valid: true }
      }
      
      if (content.includes('class ') && content.includes('Service')) {
        const hasImplements = content.includes('implements')
        const hasContract = content.includes('Contract') || content.includes('Domain')
        
        if (!hasImplements || !hasContract) {
          return {
            valid: false,
            message: 'Service classes must implement their domain contracts'
          }
        }
      }
      
      return { valid: true }
    },
    severity: 'error'
  },
  
  // IPC handlers must validate inputs
  ipcInputValidation: {
    name: 'IPC input validation',
    description: 'All IPC handlers must validate inputs with Zod schemas',
    validate: async (filePath, content) => {
      if (!filePath.includes('ipc') || !filePath.endsWith('.ts')) {
        return { valid: true }
      }
      
      if (content.includes('ipcMain.handle') && !content.includes('validateInput')) {
        return {
          valid: false,
          message: 'IPC handlers must validate inputs using validateInput() function'
        }
      }
      
      return { valid: true }
    },
    severity: 'error'
  },
  
  // Store ownership validation
  storeOwnership: {
    name: 'Store ownership',
    description: 'Stores must not have cross-dependencies',
    validate: async (filePath, content) => {
      if (!filePath.includes('src/renderer/stores/') || !filePath.endsWith('.ts')) {
        return { valid: true }
      }
      
      // Check for imports of other stores
      const storeImports = content.match(/import.*from.*stores\//g) || []
      const currentStore = path.basename(filePath, '.ts')
      
      const crossStoreImports = storeImports.filter(imp => {
        return !imp.includes(currentStore) && imp.includes('Store')
      })
      
      if (crossStoreImports.length > 0) {
        return {
          valid: false,
          message: `Store has cross-dependencies: ${crossStoreImports.join(', ')}`
        }
      }
      
      return { valid: true }
    },
    severity: 'warning'
  },
  
  // Component architecture compliance
  componentArchitecture: {
    name: 'Component architecture',
    description: 'Components must follow naming and structure patterns',
    validate: async (filePath, content) => {
      if (!filePath.includes('src/renderer/components/') || !filePath.endsWith('.tsx')) {
        return { valid: true }
      }
      
      const fileName = path.basename(filePath, '.tsx')
      const componentName = fileName.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('')
      
      // Check if component is exported with correct name
      if (!content.includes(`export const ${componentName}`)) {
        return {
          valid: false,
          message: `Component must be exported as 'export const ${componentName}'`
        }
      }
      
      // Check for displayName
      if (!content.includes(`.displayName = '${componentName}'`)) {
        return {
          valid: false,
          message: `Component must have displayName set to '${componentName}'`
        }
      }
      
      return { valid: true }
    },
    severity: 'warning'
  },
  
  // Type safety validation
  typeSafety: {
    name: 'Type safety',
    description: 'No any types allowed in production code',
    pattern: /:\s*any\b|<any>|any\[\]/,
    directories: ['src'],
    excludePatterns: [/\.test\./, /\.stories\./, /\.d\.ts$/],
    severity: 'warning'
  },
  
  // State machine usage
  stateMachineUsage: {
    name: 'State machine usage',
    description: 'Agent status changes must go through StateMachine',
    validate: async (filePath, content) => {
      if (!filePath.includes('src/main/services/agents/') || !filePath.endsWith('.ts')) {
        return { valid: true }
      }
      
      // Look for direct status assignments
      const directStatusChange = /status\s*=|\.status\s*=/.test(content)
      const hasStateMachine = content.includes('StateMachine') || content.includes('transitionTo')
      
      if (directStatusChange && !hasStateMachine) {
        return {
          valid: false,
          message: 'Agent status changes must go through StateMachine.transitionTo()'
        }
      }
      
      return { valid: true }
    },
    severity: 'error'
  }
}

// File scanning utilities
async function scanFiles(directory, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = []
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDir(fullPath)
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
  }
  
  await scanDir(directory)
  return files
}

async function validateFile(filePath, rules) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const violations = []
    
    for (const [ruleId, rule] of Object.entries(rules)) {
      let shouldValidate = true
      
      // Check if file is in rule's directories
      if (rule.directories) {
        shouldValidate = rule.directories.some(dir => filePath.includes(dir))
      }
      
      // Check exclude patterns
      if (rule.excludePatterns && shouldValidate) {
        shouldValidate = !rule.excludePatterns.some(pattern => pattern.test(filePath))
      }
      
      if (!shouldValidate) continue
      
      let result = { valid: true }
      
      // Pattern-based validation
      if (rule.pattern && rule.pattern.test(content)) {
        result = {
          valid: false,
          message: rule.description
        }
      }
      
      // Custom validation function
      if (rule.validate) {
        result = await rule.validate(filePath, content)
      }
      
      if (!result.valid) {
        violations.push({
          rule: ruleId,
          name: rule.name,
          message: result.message || rule.description,
          severity: rule.severity || 'warning',
          line: result.line || null
        })
      }
    }
    
    return violations
  } catch (error) {
    return [{
      rule: 'file-access',
      name: 'File access error',
      message: `Could not read file: ${error.message}`,
      severity: 'error'
    }]
  }
}

// Architecture validation
async function validateArchitecture(options = {}) {
  const { fix = false, verbose = false } = options
  
  console.log('🔍 Validating Project Maestro architecture...\n')
  
  const allFiles = await scanFiles('src')
  const violations = new Map()
  let totalFiles = 0
  let filesWithViolations = 0
  
  // Validate each file
  for (const filePath of allFiles) {
    totalFiles++
    const fileViolations = await validateFile(filePath, VALIDATION_RULES)
    
    if (fileViolations.length > 0) {
      violations.set(filePath, fileViolations)
      filesWithViolations++
    }
    
    if (verbose) {
      console.log(`✓ ${filePath}`)
    }
  }
  
  // Report results
  console.log(`\n📊 Validation Results:`)
  console.log(`  Files scanned: ${totalFiles}`)
  console.log(`  Files with violations: ${filesWithViolations}`)
  console.log(`  Total violations: ${Array.from(violations.values()).flat().length}\n`)
  
  if (violations.size === 0) {
    console.log('🎉 All architecture rules passed!')
    return { success: true, violations: [] }
  }
  
  // Group violations by severity
  const errors = []
  const warnings = []
  
  for (const [filePath, fileViolations] of violations) {
    for (const violation of fileViolations) {
      const item = { file: filePath, ...violation }
      
      if (violation.severity === 'error') {
        errors.push(item)
      } else {
        warnings.push(item)
      }
    }
  }
  
  // Report errors
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`)
    for (const error of errors) {
      console.log(`  ${error.file}`)
      console.log(`    ${error.name}: ${error.message}`)
      if (error.line) console.log(`    Line: ${error.line}`)
      console.log()
    }
  }
  
  // Report warnings
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`)
    for (const warning of warnings) {
      console.log(`  ${warning.file}`)
      console.log(`    ${warning.name}: ${warning.message}`)
      if (warning.line) console.log(`    Line: ${warning.line}`)
      console.log()
    }
  }
  
  // Auto-fix suggestions
  if (fix) {
    console.log('🔧 Auto-fix is not yet implemented')
    console.log('Please manually fix the violations above')
  } else {
    console.log('💡 Run with --fix flag to automatically fix some violations')
  }
  
  return {
    success: errors.length === 0,
    violations: [...errors, ...warnings],
    errors,
    warnings
  }
}

// Specific validation checks
async function checkContractCompliance() {
  console.log('🔍 Checking contract compliance...')
  
  const servicesDir = 'src/main/services'
  const contractsDir = 'src/shared/contracts'
  
  try {
    const serviceFiles = await scanFiles(servicesDir, ['.ts'])
    const contractFiles = await scanFiles(contractsDir, ['.ts'])
    
    console.log(`Found ${serviceFiles.length} service files`)
    console.log(`Found ${contractFiles.length} contract files`)
    
    // Check if each service has a corresponding contract
    const domains = new Set()
    
    for (const serviceFile of serviceFiles) {
      const dir = path.dirname(serviceFile)
      const domain = path.basename(dir)
      if (domain !== 'services') {
        domains.add(domain)
      }
    }
    
    console.log(`\\nDomains found: ${Array.from(domains).join(', ')}`)
    
    for (const domain of domains) {
      const expectedContract = path.join(contractsDir, `${domain.charAt(0).toUpperCase() + domain.slice(1)}Domain.ts`)
      const contractExists = contractFiles.some(file => file.endsWith(`${domain.charAt(0).toUpperCase() + domain.slice(1)}Domain.ts`))
      
      if (contractExists) {
        console.log(`✓ ${domain} domain has contract`)
      } else {
        console.log(`❌ ${domain} domain missing contract: ${expectedContract}`)
      }
    }
  } catch (error) {
    console.error(`Error checking contracts: ${error.message}`)
  }
}

async function checkStoreBoundaries() {
  console.log('🔍 Checking store boundaries...')
  
  const storesDir = 'src/renderer/stores'
  
  try {
    const storeFiles = await scanFiles(storesDir, ['.ts'])
    const violations = []
    
    for (const storeFile of storeFiles) {
      const content = await fs.readFile(storeFile, 'utf-8')
      const fileName = path.basename(storeFile, '.ts')
      
      // Check for cross-store imports
      const storeImports = content.match(/import.*from.*stores\//g) || []
      const crossImports = storeImports.filter(imp => !imp.includes(fileName))
      
      if (crossImports.length > 0) {
        violations.push({
          file: storeFile,
          violations: crossImports
        })
      }
    }
    
    if (violations.length === 0) {
      console.log('✓ All stores have proper boundaries')
    } else {
      console.log(`❌ Found ${violations.length} store boundary violations:`)
      violations.forEach(v => {
        console.log(`  ${v.file}: ${v.violations.join(', ')}`)
      })
    }
  } catch (error) {
    console.error(`Error checking store boundaries: ${error.message}`)
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options = {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    contracts: args.includes('--contracts'),
    stores: args.includes('--stores')
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Project Maestro Architecture Validator

Usage:
  npm run validate:architecture [options]
  node scripts/validate-architecture.js [options]

Options:
  --fix              Automatically fix violations where possible
  --verbose, -v      Show detailed output for each file
  --contracts        Only check contract compliance
  --stores           Only check store boundaries
  --help, -h         Show this help message

Examples:
  npm run validate:architecture
  npm run validate:architecture -- --fix
  npm run validate:architecture -- --contracts --verbose
    `)
    return
  }

  try {
    if (options.contracts) {
      await checkContractCompliance()
      return
    }
    
    if (options.stores) {
      await checkStoreBoundaries()
      return
    }
    
    const result = await validateArchitecture(options)
    
    // Exit with error code if there are errors
    if (!result.success) {
      process.exit(1)
    }
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { 
  validateArchitecture, 
  checkContractCompliance, 
  checkStoreBoundaries,
  VALIDATION_RULES 
}