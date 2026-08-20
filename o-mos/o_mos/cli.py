"""Interactive terminal assistant backed by a local Ollama model."""

import os

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from o_mos.config import DEFAULT_MODEL
from o_mos.service import create_conversation, create_model, trim_history, visible_stream


def main() -> None:
    model_name = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    model = create_model()
    messages: list[BaseMessage] = create_conversation()

    print(
        "\n"
        "==============================\n"
        " o-mos CLI · 本地 AI 助手\n"
        f" 模型：{model_name}\n"
        " 输入 /help 查看命令\n"
        "=============================="
    )

    while True:
        try:
            user_input = input("\n你：").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见！")
            return

        if not user_input:
            continue
        if user_input in {"exit", "quit", "/exit", "/quit"}:
            print("再见！")
            return
        if user_input == "/help":
            print("命令：/help 查看帮助；/reset 清空本次会话记忆；exit 退出。")
            continue
        if user_input == "/reset":
            messages = create_conversation()
            print("已清空本次会话记忆。")
            continue

        messages.append(HumanMessage(content=user_input))
        print("\no-mos：", end="", flush=True)

        try:
            answer_parts: list[str] = []
            for text in visible_stream(model.stream(messages)):
                answer_parts.append(text)
                print(text, end="", flush=True)
            answer = "".join(answer_parts)
            print()
            messages.append(AIMessage(content=answer))
            messages = trim_history(messages)
        except Exception as error:
            messages.pop()
            print(f"\n调用失败：{error}")
            print("请确认 Ollama 已启动：open -a Ollama")
