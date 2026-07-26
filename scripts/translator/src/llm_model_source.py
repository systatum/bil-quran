from dataclasses import dataclass

@dataclass
class ModelSource:
    hf_repo_url: str
    filename: str

    def __post__init__(self):
        assert "https://huggingface.co/" in self.hf_repo_url

    def get_repo_id(self) -> str:
        return self.hf_repo_url.removeprefix("https://huggingface.co/")