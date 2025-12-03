import { defineConfig } from '@prisma/client/generator-helper'

export default defineConfig({
  seed: 'node prisma/seed.js'
})
