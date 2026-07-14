from translator import Prompt, PromptSetting
from model_loader import load_models

def main():
    for name, model in load_models().items():
        for i in range(5):
            print(name, model.prompt(PromptSetting(), Prompt(text="Who's that over there?")))

    """
    API SOMETHING LIKE
    /translate
    {
        "model": "qwen2.5-1.5b",
        "config": {
            "system_prompt": "...",
            "response_format": {...},
            "prompt_format": "..."
            ... etc
        }, // optional
        "source_language": "English"
        "target_language": "Indonesian"
        "text": "Who's that over there?"
    }
    """

if __name__ == "__main__":
    main()