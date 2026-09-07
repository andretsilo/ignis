FROM python:3.12-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app
COPY ./alembic /code/alembic
COPY ./alembic.ini /code/alembic.ini

# ROCm libs for WSL2 GPU passthrough — bind-mounted into training containers at runtime
COPY ./rocm-libs/librocdxg.so /rocm-libs/librocdxg.so
COPY ./rocm-libs/libdxcore.so /rocm-libs/libdxcore.so
COPY ./rocm-libs/rocdxg /rocm-libs/rocdxg

CMD ["fastapi", "run", "app/main.py", "--port", "80"]
