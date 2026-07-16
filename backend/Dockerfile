FROM python:3.12-alpine

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

# ROCm libs for WSL2 GPU passthrough — copied from WSL2 at build time
# These are bind-mounted into training containers at runtime
COPY ./rocm-libs/librocdxg.so /rocm-libs/librocdxg.so
COPY ./rocm-libs/libdxcore.so /rocm-libs/libdxcore.so
COPY ./rocm-libs/rocdxg /rocm-libs/rocdxg

CMD ["fastapi", "run", "app/main.py", "--port", "80"]
