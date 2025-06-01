FROM csantve/alpine-vcpkg AS builder

WORKDIR /app

RUN apk add --no-cache linux-headers perl bash pkgconfig

COPY vcpkg.json .

RUN vcpkg install

COPY . .

RUN cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
    -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake

RUN cmake --build build --parallel $(nproc)

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/bin/cpp-backend-template .
COPY --from=builder /usr/lib/* /usr/lib/

EXPOSE ${PORT}

CMD ["./cpp-backend-template"]
