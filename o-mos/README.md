# 本地 LLM 学习环境

本项目使用 **Ollama + Qwen3-4B + Open WebUI + LangGraph**。模型和 Open WebUI 都运行在 macOS 宿主机上，因此能够使用 Apple Silicon 的 Metal；这比在 Docker Desktop 里运行 Ollama 更适合 Mac。

## 运行顺序

1. 安装并启动 Ollama（macOS 应用）。
2. 在终端执行 `ollama pull qwen3:4b`，再执行 `ollama run qwen3:4b` 验证模型。
3. 安装 Open WebUI：`uv venv --python 3.12 .open-webui-venv && uv pip install --python .open-webui-venv/bin/python open-webui`。
4. 执行 `./scripts/start-open-webui.sh`，浏览器打开 <http://localhost:3000>，完成首个管理员账号注册。
5. 新开终端，用 `uv sync` 创建项目 Python 环境，再用 `uv run python app.py "解释 LangGraph 的作用"` 测试 LangGraph。

## 第一个 Python LLM 程序

先启动 Ollama，然后运行：

```bash
uv run python hello_llm.py "我是 AI 产品经理，请解释什么是 RAG"
```

`hello_llm.py` 是最简单的应用调用：它创建 `ChatOllama` 客户端，发送一条 system message 和一条用户问题，再打印模型回答。理解它后，再学习 `app.py` 中的 LangGraph 流程。

## o-mos CLI 助手（V1）

启动 Ollama 后，在项目根目录执行：

```bash
uv sync
uv run o-mos
```

它具有固定的产品经理学习助手角色和当前终端会话的短期记忆。可用命令：`/help`、`/reset`、`exit`。角色设定在 `o_mos/config.py`；主循环和消息记忆在 `o_mos/cli.py`。

## o-mos HTTP API（为 Web 和部署准备）

`o-mos-api` 与 CLI 共用同一个本地 Qwen3 模型和 system prompt。先启动 Ollama，再进入此目录运行：

```bash
cd /Users/bran/Documents/my-projects/boomoospace/o-mos
uv sync
uv run --env-file .env o-mos-api
```

API 默认只监听本机 `http://127.0.0.1:8000`，因此不会意外暴露到公网。打开 <http://127.0.0.1:8000/docs> 可以直接学习和测试接口。

```bash
# 检查 o-mos 与 Ollama 是否都可用
curl http://127.0.0.1:8000/health

# 获得一条完整回答
curl http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"用两句话解释 RAG"}'

# 流式回答，适合 Web 聊天框
curl -N http://127.0.0.1:8000/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"message":"解释 Agent 的作用"}'
```

每个 `/api/chat` 或 `/api/chat/stream` 响应都会返回 `session_id`；下次请求带上它，就能保留当前会话记忆。调用 `POST /api/sessions/{session_id}/reset` 可清空记忆。

部署时，浏览器应当调用 o-mos API，而不是直接访问 Ollama。`OMOS_ALLOWED_ORIGINS` 可设置允许调用 API 的网站来源，例如 `https://boomoo.space`；`OLLAMA_BASE_URL` 和 `OLLAMA_MODEL` 可以调整模型服务地址和模型名。

完整的环境变量示例见 [`.env.example`](.env.example)。本机学习时保持默认的 `OMOS_HOST=127.0.0.1`；部署到容器或独立服务器时才按需要改为 `0.0.0.0`，并把 API 放在 HTTPS 反向代理或 Tunnel 后面。

## 常用检查

```bash
ollama list
curl http://localhost:11434/api/tags
curl -I http://localhost:3000
```

## 停止与数据

按 `Ctrl+C` 停止 Open WebUI；再次执行 `./scripts/start-open-webui.sh` 即可重启。

Open WebUI 的数据存放在 `data/open-webui`；Qwen 模型存放在 `~/.ollama/models`。不要在 Docker Desktop 中运行 Ollama，因为 macOS 不支持将 Apple GPU 透传给容器。

Open WebUI 的知识库检索使用 Ollama 的 `nomic-embed-text`，与聊天模型分工运行；首次安装时也需要执行 `ollama pull nomic-embed-text`。
