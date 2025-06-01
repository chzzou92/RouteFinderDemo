file(GLOB_RECURSE ${PROJECT_NAME}_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp")

add_executable(${PROJECT_NAME} ${${PROJECT_NAME}_SOURCES})
find_package(CURL REQUIRED)
target_include_directories(
    ${PROJECT_NAME}
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CURL_INCLUDE_DIRS}
)

target_link_libraries(
    ${PROJECT_NAME}
    PRIVATE
    ZLIB::ZLIB
    OpenSSL::SSL
    Crow::Crow
    CURL::libcurl        
)

set(OPTIONS_WARNINGS -Wall -Wpedantic)

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(OPTIONS_OPTIMIZATION -O2)
elseif(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(OPTIONS_OPTIMIZATION -g)
elseif(CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    set(OPTIONS_OPTIMIZATION -O2 -g)
elseif(CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    set(OPTIONS_OPTIMIZATION -Os)
endif()

message(STATUS "Build type:" ${CMAKE_BUILD_TYPE})
message(STATUS "Compiler options: ${OPTIONS_WARNINGS} ${OPTIONS_OPTIMIZATION}")

target_compile_options(${PROJECT_NAME} PRIVATE ${OPTIONS_WARNINGS} ${OPTIONS_OPTIMIZATION})

target_precompile_headers(
    ${PROJECT_NAME}
    PRIVATE
    <string>
    <string_view>
    <format>
    <regex>
    <optional>
    <utility>
    <functional>
    <memory>
    <mutex>
    <exception>
    <vector>
    <unordered_map>
    <algorithm>
    <chrono>
)