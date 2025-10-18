# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CORS_ORIGINS="http://localhost:3000,http://localhost:3002" \
    PORT=8002
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8002
# Use shell form to allow $PORT expansion for binding external hosts
CMD gunicorn main:app -b 0.0.0.0:$PORT -w 2