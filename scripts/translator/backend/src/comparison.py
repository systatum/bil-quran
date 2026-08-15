from __future__ import annotations
from backend.src.service import JobResult, Job, Service
from transformers import (
    AutoTokenizer,
    MT5EncoderModel,
    PretrainedConfig,
    PreTrainedModel,
)
from huggingface_hub import snapshot_download
from dataclasses import dataclass
from typing import Any, TypeAlias
import torch
import traceback


@dataclass(kw_only=True)
class CompareJob(Job):
    source: str
    translation0: str
    translation1: str


@dataclass(kw_only=True)
class Comparison:
    probabilities: tuple[float, float]
    choice: int


CompareJobResult: TypeAlias = JobResult[Comparison, str]


class ComparisonService(Service[Comparison, str]):
    _model: ModelSetup

    def __init__(self):
        super().__init__()
        self._model = load_model()

    def _run_job(self, job: Job[Comparison, str]) -> JobResult[Comparison, str]:
        assert isinstance(job, CompareJob)

        if any(
            any(keyword in text for keyword in DISALLOWED_KEYWORDS)
            for text in (job.source, job.translation0, job.translation1)
        ):
            return job.err("Disallowed keywords found in text")

        try:
            result = compare(
                self._model, job.source, job.translation0, job.translation1
            )
        except Exception as e:
            return job.err(
                f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )

        return job.ok(result)


# NOTE: MT-RANKER code has very incomplete documentation, so this code is simply what seems to work as suggested by CHATGPT
class MTRankerConfig(PretrainedConfig):
    def __init__(self, backbone="google/mt5-base", **kwargs):
        self.backbone = backbone
        super().__init__(**kwargs)


class MTRanker(PreTrainedModel):
    config_class = MTRankerConfig

    def __init__(self, config):
        super().__init__(config)
        self.encoder = MT5EncoderModel.from_pretrained(config.backbone)
        self.num_classes = 2
        self.classifier = torch.nn.Linear(
            self.encoder.config.hidden_size, self.num_classes
        )

    def forward(self, input_ids, attention_mask):
        encoder_output = self.encoder(
            input_ids=input_ids, attention_mask=attention_mask
        ).last_hidden_state
        seq_lengths = torch.sum(attention_mask, keepdim=True, dim=1)
        pooled_hidden_state = torch.sum(
            encoder_output
            * attention_mask.unsqueeze(-1).expand(
                -1, -1, self.encoder.config.hidden_size
            ),
            dim=1,
        )
        pooled_hidden_state /= seq_lengths
        prediction_logit = self.classifier(pooled_hidden_state)
        return prediction_logit


DISALLOWED_KEYWORDS = ("Source:", "Translation 0:", "Translation 1:")


@dataclass(kw_only=True)
class ModelSetup:
    tokenizer: Any
    ranker: MTRanker


def load_model() -> ModelSetup:
    snapshot_download("ibraheemmoosa/mt-ranker-base")

    tokenizer = AutoTokenizer.from_pretrained("ibraheemmoosa/mt-ranker-base")
    ranker = MTRanker.from_pretrained("ibraheemmoosa/mt-ranker-base")
    ranker.eval()

    return ModelSetup(tokenizer=tokenizer, ranker=ranker)


def compare(
    model: ModelSetup, source: str, translation0: str, translation1: str
) -> Comparison:
    assert not any(
        any(keyword in text for keyword in DISALLOWED_KEYWORDS)
        for text in (source, translation0, translation1)
    )

    text = (
        f"Source: {source} "
        f"Translation 0: {translation0} "
        f"Translation 1: {translation1}"
    )

    inputs = model.tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
    )

    with torch.no_grad():
        logits = model.ranker(**inputs)
        probabilities = torch.softmax(logits, dim=-1)
        choice = probabilities.argmax(dim=-1).item()

    return Comparison(
        probabilities=(float(probabilities[0][0]), float(probabilities[0][1])),
        choice=int(choice),
    )
