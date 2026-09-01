from frontend.structs import ExperimentTextContent
from typing import Iterable
import random
import json
import re


def is_exegesis_empty(text: str) -> bool:
    return re.match(r"^See <\{\[.*?\]\}>$", text) is not None


def get_quran_surahs() -> Iterable[int]:
    return range(1, 115)


def get_translation_texts() -> list[ExperimentTextContent]:
    texts: list[ExperimentTextContent] = []

    for surah in get_quran_surahs():
        data = json.load(
            open("../../../public/quran/exegesis/mirali/en-US/{}.json".format(surah))
        )
        texts.extend(
            ExperimentTextContent(
                author="mirali",
                text_type="translation",
                surah=surah,
                ayah=int(ayah),
                text=text,
            )
            for ayah, text in data["translations"].items()
        )

        data = json.load(
            open("../../../public/quran/exegesis/ibnkathir/en-US/{}.json".format(surah))
        )
        texts.extend(
            ExperimentTextContent(
                author="ibnkathir",
                text_type="translation",
                surah=surah,
                ayah=int(ayah),
                text=text,
            )
            for ayah, text in data["translations"].items()
        )

        data = json.load(
            open("../../../public/quran/exegesis/aliquli/en-US/{}.json".format(surah))
        )
        texts.extend(
            ExperimentTextContent(
                author="aliquli",
                text_type="translation",
                surah=surah,
                ayah=int(ayah),
                text=text,
            )
            for ayah, text in data["translations"].items()
        )

    return texts


def get_exegesis_texts() -> list[ExperimentTextContent]:
    texts: list[ExperimentTextContent] = []

    for surah in get_quran_surahs():
        data = json.load(
            open("../../../public/quran/exegesis/mirali/en-US/{}.json".format(surah))
        )
        texts.extend(
            ExperimentTextContent(
                author="mirali",
                text_type="exegesis",
                surah=surah,
                ayah=int(ayah),
                text=text,
            )
            for ayah, text in data["exegesis"].items()
            if not is_exegesis_empty(text)
        )

        data = json.load(
            open("../../../public/quran/exegesis/ibnkathir/en-US/{}.json".format(surah))
        )
        texts.extend(
            ExperimentTextContent(
                author="ibnkathir",
                text_type="exegesis",
                surah=surah,
                ayah=int(ayah),
                text=text,
            )
            for ayah, text in data["exegesis"].items()
            if not is_exegesis_empty(text)
        )

    return texts


def get_texts(
    sample_size: int | None, include_exegesis: bool, seed: str = "a-seed"
) -> list[ExperimentTextContent]:
    texts: list[ExperimentTextContent] = []
    texts.extend(get_translation_texts())

    if include_exegesis:
        texts.extend(get_exegesis_texts())

    if sample_size is None:
        return texts

    generator: random.Random = random.Random(seed)
    samples = generator.sample(texts, sample_size)
    return samples
