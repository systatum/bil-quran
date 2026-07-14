FROM python:3.11

RUN pip install huggingface_hub
RUN pip install llama-cpp-python

WORKDIR app

COPY *.py ./

ENTRYPOINT python3 main.py
