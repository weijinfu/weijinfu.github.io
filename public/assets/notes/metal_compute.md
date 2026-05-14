

如果你现在的状态是：

- 会一点 C++ 基础语法
- 不懂 C++ 是怎么编译的
- 不懂 CMake 是干什么的
- 不清楚 Metal compute 项目最少需要哪些文件

那你应该先看这份。

目标是让你建立下面这条完整链路：

```text
写代码
-> 编译 C++
-> 编译 Metal shader
-> 链接成程序
-> 运行程序
-> 看懂数据从 CPU 到 GPU 再回来
```

## 1. 先回答一个最根本的问题：什么叫“编译”

你写的 `add.cpp` 和 `add.metal` 都是“源码”，人能看懂，但 CPU/GPU 不能直接执行。

所以需要“编译”。

编译可以先粗略理解成：

- 把你写的源码
- 变成机器能执行的内容

但这里要注意，`C++` 和 `Metal shader` 不是走同一条编译路线。

### 1.1 C++ 的编译链

对你现在这个项目，C++ 这边大致是：

```text
add.cpp
-> 编译器检查语法
-> 生成目标文件 object file
-> 链接系统库 / framework
-> 得到可执行文件 MetalAdd
```

你现在不需要死记很多术语，先知道这几个词就够了：

- 源文件 source file：比如 `add.cpp`
- 目标文件 object file：编译后的中间产物，常见后缀是 `.o`
- 链接 link：把你自己的代码和系统库拼起来
- 可执行文件 executable：最终能运行的程序

### 1.2 Metal shader 的编译链

Metal 这边是另一条链：

```text
add.metal
-> metal 编译器
-> add.air
-> metallib 工具
-> default.metallib
```

所以你要先接受一个事实：

一个 Metal compute 项目，通常至少有两种源码：

- `.cpp`：CPU 侧逻辑
- `.metal`：GPU 侧逻辑

## 2. 什么是编译器，什么是链接器

你以后会经常听到这两个词。

### 2.1 编译器

编译器负责把单个源文件翻译成更底层的形式。

比如：

- `/usr/bin/c++` 会处理 `add.cpp`
- `xcrun metal` 会处理 `add.metal`

### 2.2 链接器

链接器负责把很多块已经编译好的东西拼起来。

比如：

- 你的 `add.cpp` 编出来的一部分代码
- `Metal.framework`
- `Foundation.framework`

最后拼成一个完整程序。

你可以把它们先这样记：

- 编译器：翻译单个文件
- 链接器：把翻译结果和库拼起来

## 3. 一个最小的 C++ 程序是怎么变成可执行文件的

先离开 Metal，先看最简单情况。

假设你有一个文件：

```cpp
#include <iostream>

int main() {
    std::cout << "hello\n";
    return 0;
}
```

如果你执行：

```bash
/usr/bin/c++ hello.cpp -o hello
```

大概发生了这些事：

1. 编译器读取 `hello.cpp`
2. 处理 `#include <iostream>`
3. 检查语法对不对
4. 把 C++ 代码翻译成底层机器代码
5. 链接 C++ 标准库
6. 输出 `hello`

这里的 `-o hello` 表示：

- 最终输出文件名叫 `hello`

## 4. 为什么你的 Metal 项目不能只编 `add.cpp`

因为 `add.cpp` 里有这一句：

```cpp
auto function = library->newFunction(NS::String::string("vector_add", NS::UTF8StringEncoding));
```

这表示程序运行时要去找一个叫 `vector_add` 的 Metal shader 函数。

而这个函数定义在 [add.metal](/Users/nico/Code/LearnMetalCPP/metal-compute-demo/add.metal) 里。

所以如果你只编 `add.cpp`，不编 `add.metal`，运行时就缺 shader。

这就是为什么 Metal 项目比普通 C++ 命令行程序多了一条 shader 编译链。

## 5. 从零开始时，你的第一个项目最少需要哪些文件

一个最小的 Metal compute 项目，至少有这 3 个文件：

### 5.1 `add.cpp`

CPU 侧主程序，负责：

- 准备输入数据
- 创建设备
- 创建 buffer
- 加载 shader
- 提交 GPU 任务
- 打印结果

### 5.2 `add.metal`

GPU 侧 shader，负责：

- 定义具体怎么计算

### 5.3 `CMakeLists.txt`

构建配置，负责：

- 告诉 CMake 怎样编译 `.cpp`
- 告诉 CMake 怎样编译 `.metal`
- 告诉 CMake 最终怎样链接

## 6. 为什么还需要 `metal-cpp`

你现在这个项目不是用 Objective-C 写 Metal，而是用 C++ 写。

所以它用了 Apple 提供的 `metal-cpp` 头文件封装。

你可以把 `metal-cpp` 先理解成：

- 一层 C++ 风格的 API 包装
- 让你可以写 `device->newBuffer(...)`
- 而不是去写 Objective-C 语法

比如：

```cpp
auto device = MTL::CreateSystemDefaultDevice();
```

这就是 `metal-cpp` 提供的 C++ 接口风格。

## 7. 先看最终你要写出来的目录长什么样

如果你自己从零建一个项目，最小目录可以长这样：

```text
my-first-metal-compute/
  CMakeLists.txt
  add.cpp
  add.metal
  build/
```

其中：

- `build/` 一般不是手写的
- 它通常是 CMake 生成出来的构建目录

## 8. `add.cpp` 在整个项目里到底扮演什么角色

对于新手，最重要的是先把 `add.cpp` 看成“调度员”。

它不负责真正逐个元素相加。

它负责的是：

1. 在 CPU 上准备数组
2. 申请 GPU 能看到的内存
3. 把数据放进去
4. 告诉 GPU 运行哪个 shader
5. 告诉 GPU 一共开多少线程
6. 等 GPU 算完
7. 读回结果

真正执行：

```text
result[i] = a[i] + b[i]
```

的是 [add.metal](/Users/nico/Code/LearnMetalCPP/metal-compute-demo/add.metal)。

## 9. `add.metal` 在整个项目里扮演什么角色

你可以把它看成“GPU 上跑的小函数”。

但要注意，它不是普通 C++ 函数。

它的特点是：

- 写法像函数
- 但会被大量 GPU 线程并行执行

比如：

```cpp
kernel void vector_add(
    device const float* a [[buffer(0)]],
    device const float* b [[buffer(1)]],
    device float* result [[buffer(2)]],
    uint id [[thread_position_in_grid]]
) {
    result[id] = a[id] + b[id];
}
```

你可以先把它理解成：

- GPU 开了很多工人
- 每个工人拿到自己的编号 `id`
- 第 `id` 个工人只处理第 `id` 个元素

## 10. 不懂 CMake 时，你该怎样理解它

先不要把 CMake 想得太复杂。

对你现在这个项目，最实用的理解是：

“CMake 不是编译器，它是一个帮你生成构建规则的工具。”

也就是说，CMake 本身不是直接把 `add.cpp` 变成 `MetalAdd`。

它做的是：

1. 读取 `CMakeLists.txt`
2. 生成 Makefile 或其他构建文件
3. 再由底层工具去真正执行编译命令

所以你可以这样记：

- `CMakeLists.txt`：写规则
- `cmake`：把规则变成构建系统
- `cmake --build`：真正开始编译

## 11. 先学会看懂最小 CMake 配置

看 [CMakeLists.txt](/Users/nico/Code/LearnMetalCPP/metal-compute-demo/CMakeLists.txt)。

### 11.1 工程声明

```cmake
cmake_minimum_required(VERSION 3.18)
project(MetalAddDemo LANGUAGES CXX)
```

作用：

- 规定最低 CMake 版本
- 定义工程名
- 声明这里主要处理 C++

### 11.2 C++ 标准

```cmake
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
```

作用：

- 告诉编译器使用 C++17

你可以把这理解成：

“编译这份 C++ 代码时，请按 C++17 语法规则来。”

### 11.3 自定义编译 `.metal`

```cmake
add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/default.metallib
    COMMAND xcrun -sdk macosx metal
            -c ${CMAKE_CURRENT_SOURCE_DIR}/add.metal
            -o ${CMAKE_CURRENT_BINARY_DIR}/add.air
    COMMAND xcrun -sdk macosx metallib
            ${CMAKE_CURRENT_BINARY_DIR}/add.air
            -o ${CMAKE_CURRENT_BINARY_DIR}/default.metallib
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/add.metal
    VERBATIM
)
```

作用：

- 这不是普通 C++ 编译规则
- 它是在告诉 CMake：要额外执行两条命令来生成 `default.metallib`

### 11.4 定义可执行文件

```cmake
add_executable(MetalAdd
    add.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/default.metallib
)
```

作用：

- 目标程序名字叫 `MetalAdd`
- 它依赖 `add.cpp`
- 它还依赖 `default.metallib`

### 11.5 添加头文件目录

```cmake
target_include_directories(MetalAdd PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}/../metal-cpp
    ${CMAKE_CURRENT_LIST_DIR}/../metal-cpp-extensions
)
```

作用：

- 告诉编译器去哪里找 `Metal/Metal.hpp` 这些头文件

### 11.6 链接系统框架

```cmake
target_link_libraries(MetalAdd PRIVATE
    "-framework Metal"
    "-framework Foundation"
    "-framework QuartzCore"
)
```

作用：

- 告诉链接器把这些 Apple framework 也连进来

## 12. 从零开始，手动搭建的完整步骤

下面按真正操作顺序来。

## 12.1 第一步：准备源码文件

你至少需要：

- 一个 `add.cpp`
- 一个 `add.metal`
- 一个 `CMakeLists.txt`

## 12.2 第二步：先生成构建目录

在项目根目录执行：

```bash
cmake -S . -B build
```

意思是：

- `.` 是当前源码目录
- `build` 是构建输出目录

这一步结束后，通常会出现：

- `build/Makefile`
- `build/CMakeCache.txt`
- `build/CMakeFiles/`

这些是构建系统文件，不是你的业务代码。

## 12.3 第三步：真正开始编译

执行：

```bash
cmake --build build
```

这一步才会真正去做下面这些事情：

1. 编译 `add.metal`
2. 生成 `add.air`
3. 生成 `default.metallib`
4. 编译 `add.cpp`
5. 链接出 `MetalAdd`

## 12.4 第四步：运行程序

理论上，你会在 `build/` 目录下得到：

- `MetalAdd`
- `default.metallib`

然后运行：

```bash
./build/MetalAdd
```

如果一切正常，会输出类似：

```text
0 3 6 9 12 15 18 21 24 27
```

## 13. 如果不用 CMake，能不能自己手敲编译命令

可以，甚至对初学者很有帮助。

因为你会第一次真正看清楚“项目到底是怎么编出来的”。

### 13.1 先编译 shader

```bash
mkdir -p build
xcrun -sdk macosx metal -c add.metal -o build/add.air
xcrun -sdk macosx metallib build/add.air -o build/default.metallib
```

### 13.2 再编译 C++

```bash
/usr/bin/c++ add.cpp -std=c++17 \
  -I../metal-cpp -I../metal-cpp-extensions \
  -framework Metal -framework Foundation -framework QuartzCore \
  -o build/MetalAdd
```

这里每个参数都值得认识。

## 14. `c++` 编译命令里每个参数是什么意思

看这条命令：

```bash
/usr/bin/c++ add.cpp -std=c++17 \
  -I../metal-cpp -I../metal-cpp-extensions \
  -framework Metal -framework Foundation -framework QuartzCore \
  -o build/MetalAdd
```

逐个拆开：

### 14.1 `/usr/bin/c++`

调用系统里的 C++ 编译器前端。

你现在可以先把它理解成：

- “负责编译 C++ 的程序”

### 14.2 `add.cpp`

要编译的源文件。

### 14.3 `-std=c++17`

表示：

- 按 C++17 标准编译

### 14.4 `-I../metal-cpp`

表示：

- 额外添加一个头文件搜索目录

如果没有它，编译器可能找不到：

```cpp
#include <Metal/Metal.hpp>
```

### 14.5 `-I../metal-cpp-extensions`

同理，再添加一个头文件目录。

### 14.6 `-framework Metal`

表示：

- 链接 Apple 的 `Metal.framework`

注意这一步不是“包含头文件”，而是“链接库”。

你可以把它粗略理解成：

- 头文件负责让你“能写这些 API”
- framework 负责让程序“真的能调用这些 API”

### 14.7 `-framework Foundation`

链接 `Foundation.framework`。

因为你代码里用到了：

- `NS::String`
- `NS::Error`

这些基础对象。

### 14.8 `-framework QuartzCore`

链接 `QuartzCore.framework`。

### 14.9 `-o build/MetalAdd`

表示最终输出文件名和位置。

## 15. 头文件、库、framework 到底分别是什么

这也是新手常混淆的点。

### 15.1 头文件 `#include`

头文件主要解决：

- 编译器要知道类型和函数长什么样

比如：

```cpp
#include <Metal/Metal.hpp>
```

它让编译器知道 `MTL::Device`、`MTL::Buffer` 这些名字。

### 15.2 库 / framework

库和 framework 主要解决：

- 这些函数和类真正的实现在哪

只 `#include` 不链接，通常会在链接阶段报错。

所以你要区分：

- `#include`：让编译器认识声明
- `-framework` / `-lxxx`：让链接器找到实现

## 16. 为什么有时候会听到 `.o` 文件

因为完整构建通常不是一步完成的。

很多时候会先这样：

```text
add.cpp -> add.cpp.o
```

然后再：

```text
add.cpp.o + 各种库 -> MetalAdd
```

这个 `.o` 文件就是目标文件。

你可以把它理解成：

- “已经翻译好，但还没拼装完成的代码块”

在这个仓库里，构建目录里也能看到类似产物。

## 17. 为什么 `add.cpp` 和 `add.metal` 都要存在

因为它们分工完全不同。

### `add.cpp`

负责“控制流程”：

- 创建设备
- 分配内存
- 绑定资源
- 提交任务

### `add.metal`

负责“真正算法”：

- 用 GPU 线程处理每个数据元素

如果只写 `add.cpp`，就没有 GPU 算法。

如果只写 `add.metal`，也没有人去加载它、传数据给它、启动它。

## 18. 这个最小项目的运行过程，按时间顺序到底发生了什么

把完整过程按时间顺序写出来：

1. 你执行 `cmake -S . -B build`
2. CMake 生成构建系统
3. 你执行 `cmake --build build`
4. `add.metal` 被编译成 `add.air`
5. `add.air` 被打包成 `default.metallib`
6. `add.cpp` 被编译
7. 链接生成 `MetalAdd`
8. 你运行 `./build/MetalAdd`
9. 程序创建 `MTL::Device`
10. 程序创建 3 个 `MTL::Buffer`
11. CPU 把 `a`、`b` 数据拷进 buffer
12. 程序加载 `default.metallib`
13. 程序找到 `vector_add`
14. 程序创建 compute pipeline
15. 程序创建 command buffer 和 compute encoder
16. 程序绑定输入输出 buffer
17. 程序 dispatch 线程到 GPU
18. GPU 并行执行 `result[id] = a[id] + b[id]`
19. GPU 完成后，CPU 读取结果
20. 程序打印结果

你现在先把这 20 步记住，比死背 API 更重要。

## 19. 初学者最容易卡住的几个点

### 19.1 以为 `.metal` 会被 C++ 编译器自动处理

不会。

它必须走自己的编译链：

```text
metal -> air -> metallib
```

### 19.2 以为 `#include` 就等于可以运行

不是。

`#include` 只是让编译器认识声明，最终还要链接 framework。

### 19.3 以为 `add.cpp` 会自己自动找到 shader

也不是。

你必须先真的生成 `default.metallib`，运行时程序才有机会加载它。

### 19.4 以为 GPU 会自己知道处理多少个元素

不会。

你必须显式 dispatch：

```cpp
MTL::Size gridSize = MTL::Size(N, 1, 1);
```

### 19.5 以为 shader 参数名必须和 C++ 变量名一样

不需要。

真正必须对应的是 buffer 槽位编号：

- C++ 的 `setBuffer(..., ..., 0)`
- 对应 shader 的 `[[buffer(0)]]`

## 20. 建议你第一次动手时这样练

不要一上来改很多东西，按这个顺序最稳。

### 20.1 第一步

先只成功构建一次项目。

目标不是理解全部，而是知道：

- 哪条命令能生成 `build/`
- 哪条命令能真正编译

### 20.2 第二步

只改 `N`：

```cpp
const int N = 10;
```

改成：

```cpp
const int N = 16;
```

观察输出元素个数是不是也变了。

### 20.3 第三步

只改 shader 运算：

```cpp
result[id] = a[id] + b[id];
```

改成：

```cpp
result[id] = a[id] * b[id];
```

这样你会明确知道：

- CPU 端负责喂数据
- GPU 端负责定义算法

