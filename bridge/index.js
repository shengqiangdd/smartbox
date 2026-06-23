/**
 * SmartBox SSH Bridge (Express + express-ws)
 *
 * 轻量级 WebSocket → SSH 代理服务
 * 浏览器无法直接连接 SSH 协议，此服务作为桥梁，
 * 将 WebSocket 消息转发到 SSH/SFTP 连接。
 *
 * 消息协议（JSON）：
 * - { type: 'connect', connectionId, host, port, username, password?, privateKey? }
 * - { type: 'disconnect', connectionId }
 * - { type: 'exec', connectionId, data }           // 终端数据
 * - { type: 'resize', connectionId, cols, rows }   // 终端大小调整
 * - { type: 'sftp', connectionId, operation, ... } // SFTP 操作
 */

import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'ssh2'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.BRIDGE_PORT || '3001', 10)

const pluginsDir = path.resolve(__dirname, '..', 'plugins')
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist')

// 连接管理器: connectionId → { ws, ssh?, sftp? }
const connections = new Map()

// ─── Express 应用 ───

const app = express()
expressWs(app)

// 中间件
app.use(cors())
app.use(express.json())

// ========== HTTP API 路由 ==========

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// 获取插件列表
app.get('/api/plugins', (req, res) => {
  try {
    const plugins = []
    if (fs.existsSync(pluginsDir)) {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json')
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
            plugins.push({
              id: manifest.id || entry.name,
              name: manifest.name || entry.name,
              version: manifest.version || '1.0.0',
              description: manifest.description || '',
              author: manifest.author || '',
              icon: manifest.icon || '',
              commands: manifest.commands || [],
              panels: manifest.panels || [],
              entry: `/api/plugins/${entry.name}/plugin.js`,
            })
          } catch (e) {
            console.error(`[Bridge] Failed to read plugin manifest: ${entry.name}`, e.message)
          }
        }
      }
    }
    res.json({ plugins })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取单个插件的 JS 文件
app.get('/api/plugins/:id/plugin.js', (req, res) => {
  const pluginDir = path.join(pluginsDir, req.params.id)
  const jsPath = path.join(pluginDir, 'plugin.js')
  if (fs.existsSync(jsPath)) {
    const content = fs.readFileSync(jsPath, 'utf-8')
    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Cache-Control', 'no-cache')
    res.send(content)
  } else {
    res.status(404).json({ error: 'Plugin JS not found' })
  }
})

// 获取单个插件的 Manifest
app.get('/api/plugins/:id/manifest.json', (req, res) => {
  const manifestPath = path.join(pluginsDir, req.params.id, 'manifest.json')
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    res.json(manifest)
  } else {
    res.status(404).json({ error: 'Manifest not found' })
  }
})

// ========== WebSocket 路由 ==========

app.ws('/ws', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  console.log(`[Bridge] Client connected: ${clientId} (${req.socket.remoteAddress})`)

  // 心跳检测
  let heartbeatTimer = null
  const startHeartbeat = () => {
    heartbeatTimer = setInterval(() => {
      try { ws.ping() } catch (_) { /* ignore */ }
    }, 30000)
  }
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }
  startHeartbeat()

  // 消息处理
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      handleMessage(ws, clientId, msg)
    } catch (err) {
      sendError(ws, null, 'INVALID_MESSAGE', '无法解析消息: ' + err.message)
    }
  })

  ws.on('close', () => {
    console.log(`[Bridge] Client disconnected: ${clientId}`)
    stopHeartbeat()
    // 清理该客户端的所有 SSH 连接
    for (const [connId, conn] of connections) {
      if (conn.ws === ws) {
        cleanupConnection(connId)
      }
    }
  })

  ws.on('error', (err) => {
    console.error(`[Bridge] WebSocket error (${clientId}):`, err.message)
  })
})

// ========== 消息路由 ==========

function handleMessage(ws, clientId, msg) {
  const { type, connectionId, ...payload } = msg

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    case 'connect':
      handleConnect(ws, connectionId, payload)
      break

    case 'disconnect':
      cleanupConnection(connectionId)
      break

    case 'exec':
      handleExec(ws, connectionId, payload)
      break

    case 'resize':
      handleResize(ws, connectionId, payload)
      break

    case 'sftp':
      handleSftp(ws, connectionId, payload)
      break

    default:
      sendError(ws, connectionId, 'UNKNOWN_TYPE', `未知消息类型: ${type}`)
  }
}

// ========== SSH 连接处理 ==========

async function handleConnect(ws, connectionId, config) {
  const { host, port, username, password, privateKey } = config

  if (!host || !username) {
    return sendError(ws, connectionId, 'INVALID_CONFIG', '缺少必需参数: host, username')
  }

  try {
    const ssh = new Client()
    const connState = { ws, ssh, sftp: null, connectionId }

    ssh.on('ready', () => {
      console.log(`[SSH] Connected: ${username}@${host}:${port} (${connectionId})`)
      connections.set(connectionId, connState)

      ws.send(JSON.stringify({ type: 'connected', connectionId }))

      // 启动 SFTP session
      ssh.sftp((err, sftp) => {
        if (!err) {
          connState.sftp = sftp
          ws.send(JSON.stringify({ type: 'sftp-ready', connectionId }))
        }
      })
    })

    ssh.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          connectionId,
          data: data.toString('base64'),
        }))
      }
    })

    ssh.on('close', () => {
      console.log(`[SSH] Connection closed: ${connectionId}`)
      connections.delete(connectionId)
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'disconnected', connectionId }))
      }
    })

    ssh.on('error', (err) => {
      console.error(`[SSH] Error (${connectionId}):`, err.message)
      sendError(ws, connectionId, 'SSH_ERROR', err.message)
    })

    ssh.connect({
      host,
      port: port || 22,
      username,
      password: password || undefined,
      privateKey: privateKey || undefined,
      readyTimeout: 10000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    })

  } catch (err) {
    console.error(`[SSH] Connection failed (${connectionId}):`, err.message)
    sendError(ws, connectionId, 'CONNECT_FAILED', err.message)
  }
}

// ========== 终端执行 ==========

function handleExec(ws, connectionId, payload) {
  const conn = connections.get(connectionId)
  if (!conn || !conn.ssh) {
    return sendError(ws, connectionId, 'NOT_CONNECTED', 'SSH 未连接')
  }

  const { data } = payload

  if (data === '\x03') {
    // Ctrl+C — 终止当前命令
    // SSH2 没有直接发送中断的 API，这里通过 session 模拟
    conn.ssh.emit('close')
    ws.send(JSON.stringify({ type: 'data', connectionId, data: '^C\n' }))
    return
  }

  conn.ssh.exec(data, (err, stream) => {
    if (err) {
      return sendError(ws, connectionId, 'EXEC_ERROR', err.message)
    }

    stream.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          connectionId,
          data: chunk.toString('base64'),
        }))
      }
    })

    stream.stderr.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          connectionId,
          data: chunk.toString('base64'),
        }))
      }
    })

    stream.on('close', (code) => {
      ws.send(JSON.stringify({
        type: 'exec-end',
        connectionId,
        code,
      }))
    })
  })
}

// ========== 终端大小调整 ==========

function handleResize(ws, connectionId, payload) {
  const conn = connections.get(connectionId)
  if (!conn || !conn.ssh) {
    return sendError(ws, connectionId, 'NOT_CONNECTED', 'SSH 未连接')
  }

  const { cols, rows } = payload
  if (conn.session) {
    conn.session.setWindow(rows || 24, cols || 80, 0, 0)
  }
}

// ========== SFTP 操作 ==========

function handleSftp(ws, connectionId, payload) {
  const conn = connections.get(connectionId)
  if (!conn || !conn.sftp) {
    return sendError(ws, connectionId, 'SFTP_NOT_READY', 'SFTP 未就绪')
  }

  const { operation } = payload

  switch (operation) {
    case 'list': {
      const { path: dirPath } = payload
      conn.sftp.readdir(dirPath || '.', (err, list) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'list',
          data: list.map(item => ({
            filename: item.filename,
            longname: item.longname,
            attrs: {
              size: item.attrs.size,
              mode: item.attrs.mode,
              uid: item.attrs.uid,
              gid: item.attrs.gid,
              atime: item.attrs.atime,
              mtime: item.attrs.mtime,
              isDirectory: (item.attrs.mode & 0o40000) !== 0,
            },
          })),
        }))
      })
      break
    }

    case 'stat': {
      const { path: targetPath } = payload
      conn.sftp.stat(targetPath, (err, attrs) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'stat',
          data: { size: attrs.size, mode: attrs.mode, mtime: attrs.mtime },
        }))
      })
      break
    }

    case 'readdir': {
      const { path: dirPath } = payload
      // 与 list 相同，语义别名
      conn.sftp.readdir(dirPath || '.', (err, list) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'readdir',
          data: list.map(item => ({
            filename: item.filename,
            longname: item.longname,
            attrs: {
              size: item.attrs.size,
              mode: item.attrs.mode,
              uid: item.attrs.uid,
              gid: item.attrs.gid,
              atime: item.attrs.atime,
              mtime: item.attrs.mtime,
              isDirectory: (item.attrs.mode & 0o40000) !== 0,
            },
          })),
        }))
      })
      break
    }

    case 'readfile': {
      const { path: filePath } = payload
      conn.sftp.readFile(filePath, (err, data) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'readfile',
          data: data.toString('base64'),
        }))
      })
      break
    }

    case 'writefile': {
      const { path: filePath, content } = payload
      const buf = Buffer.from(content, 'base64')
      conn.sftp.writeFile(filePath, buf, (err) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'writefile',
          success: true,
        }))
      })
      break
    }

    case 'mkdir': {
      const { path: dirPath } = payload
      conn.sftp.mkdir(dirPath, (err) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'mkdir',
          success: true,
        }))
      })
      break
    }

    case 'rmdir': {
      const { path: dirPath } = payload
      conn.sftp.rmdir(dirPath, (err) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'rmdir',
          success: true,
        }))
      })
      break
    }

    case 'unlink': {
      const { path: filePath } = payload
      conn.sftp.unlink(filePath, (err) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'unlink',
          success: true,
        }))
      })
      break
    }

    case 'rename': {
      const { fromPath, toPath } = payload
      conn.sftp.rename(fromPath, toPath, (err) => {
        if (err) return sendError(ws, connectionId, 'SFTP_ERROR', err.message)
        ws.send(JSON.stringify({
          type: 'sftp-result',
          connectionId,
          operation: 'rename',
          success: true,
        }))
      })
      break
    }

    default:
      sendError(ws, connectionId, 'UNKNOWN_OPERATION', `未知 SFTP 操作: ${operation}`)
  }
}

// ========== 连接清理 ==========

function cleanupConnection(connectionId) {
  const conn = connections.get(connectionId)
  if (!conn) return

  console.log(`[Bridge] Cleaning up connection: ${connectionId}`)

  if (conn.sftp) {
    try { conn.sftp.end() } catch (_) { /* ignore */ }
  }
  if (conn.ssh) {
    try { conn.ssh.end() } catch (_) { /* ignore */ }
  }

  connections.delete(connectionId)
}

// ========== 错误响应辅助 ==========

function sendError(ws, connectionId, code, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      connectionId,
      code,
      message,
    }))
  }
}

// ========== 静态文件服务 ==========

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  // SPA 支持：所有非 API 路由返回 index.html
  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return res.status(404).json({ error: 'Not Found' })
    }
    const filePath = path.join(frontendDist, 'index.html')
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath)
    } else {
      res.status(404).json({ error: 'Not Found' })
    }
  })
}

// ========== 启动服务器 ==========

app.listen(PORT, () => {
  console.log(`[SmartBox Bridge] Server listening on port ${PORT}`)
  console.log(`   API:  http://localhost:${PORT}/api/health`)
  console.log(`   WS:   ws://localhost:${PORT}/ws`)
})
