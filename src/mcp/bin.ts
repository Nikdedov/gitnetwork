#!/usr/bin/env node
/// <reference types="node" />
import { runMcpServer } from '../lib/mcp/server'

const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN || null

async function main() {
  try {
    await runMcpServer(token)
  } catch (error) {
    console.error('MCP Server error:', error)
    process.exit(1)
  }
}

main()
