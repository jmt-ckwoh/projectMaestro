/**
 * Main Process Utilities
 */

import { join } from 'path'

export const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

export const isProduction = process.env.NODE_ENV === 'production'

export const getAssetPath = (...paths: string[]): string => {
  const RESOURCES_PATH = isDev
    ? process.cwd()
    : process.resourcesPath

  return join(RESOURCES_PATH, ...paths)
}