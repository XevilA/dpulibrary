# ─────────────────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────
FROM rust:1.79-bookworm AS builder

WORKDIR /app

# Cache dependencies first
COPY Cargo.toml ./
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release
RUN rm -f target/release/deps/elib_backend*

# Now copy real source
COPY src ./src
RUN cargo build --release

# ─────────────────────────────────────────────────────────────
# Stage 2: Runtime (minimal image)
# ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/elib-backend /app/elib-backend

EXPOSE 3000

ENTRYPOINT ["/app/elib-backend"]
