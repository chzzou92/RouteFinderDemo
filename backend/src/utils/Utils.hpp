#pragma once

#include <string>
#include <string_view>

namespace Utils
{
    std::string GetEnv(std::string_view varName, std::string_view defaultValue);
}
