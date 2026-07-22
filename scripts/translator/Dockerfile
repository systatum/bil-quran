FROM python:3.11

RUN pip install huggingface_hub
RUN pip install llama-cpp-python
RUN pip install fastapi[standard]
RUN pip install unbabel-comet

WORKDIR /app

COPY src/*.py ./

ENTRYPOINT ["fastapi", "run"]
