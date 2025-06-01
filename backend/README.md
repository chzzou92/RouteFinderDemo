# cpp-backend-template

This is a small C++ backend template that uses CMake as build system, vcpkg as dependency manager, Crow as web framework and features Docker and Docker compose support.
It also provides already defined Microsoft-like formatting options with clang-format.

## Dependencies

To use this template you need:

- a C++ compiler (C++23 is used by default, edit [CMake config](CMakeLists.txt) if you want to use a different standard)
- CMake (3.14.0 >=)
- vcpkg
- Docker
- clang-format (optional, used to format code)

## Getting started

To get started with this template, either clone it or generate a new repo from this one.
Then, create a ```.env``` file with env variables.
Example:

```bash
PORT=8000
BUILD_TYPE=Release # options are Debug, Release, RelWithDebInfo and MinSizeRel
```

To prepare the local environment, run the following commands:
```bash
vcpkg install
cmake -S . -B build
```

Then, to start the docker container with docker compose:
```bash
docker compose up --build -d
```
