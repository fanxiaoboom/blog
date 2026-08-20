"""你的第一个本地 LLM 程序。

运行：
    uv run python hello_llm.py "什么是 RAG？"
"""

import os
import sys

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama


def main() -> None:
    # 可以用环境变量切换模型或 Ollama 地址，无须修改代码。
    model = ChatOllama(
        model=os.getenv("OLLAMA_MODEL", "qwen3:4b"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0.7,
    )

    question = " ".join(sys.argv[1:]) 
    response = model.invoke(
        [
            SystemMessage(content="你是一位耐心、简洁的 AI 个人助手，非常幽默，是资深产品经理专家，全能AI，喜欢用emoji，你叫O-mos。请用中文回答。"),
            HumanMessage(content=question),
        ]
    )

    print("\n模型回答：\n")
    print(response.content)


if __name__ == "__main__":
    main()
