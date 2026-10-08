---
title: "nexent本地环境搭建之WSL2"
description: "在 WSL2 中搭建 Nexent 开发环境，记录依赖安装、服务启动和环境配置中的问题。"
date: "2025-11-01T16:06:12.000Z"
updated: "2025-12-25T06:36:15.904Z"
topic: "工程实践"
categories: ["Nexent"]
tags: ["Nexent","WSL2","环境搭建"]
---

## 后端环境搭建

1.  **拉取项目**  
    [https://github.com/ModelEngine-Group/nexent.git](https://github.com/ModelEngine-Group/nexent.git)
    
2.  **安装 uv**
    
    -   安装链接： [https://uv.oaix.tech/getting-started/installation/](https://uv.oaix.tech/getting-started/installation/)
    -   执行安装脚本：
        
        ```bash
        curl -LsSf [https://astral.sh/uv/install.sh](https://astral.sh/uv/install.sh) | sh
        ```
        
    -   将 uv 加入环境变量：
        
        ```bash
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        ```
        
    -   观察 uv 是否安装成功：
        
        ```bash
        feixin@feixin-laptop:~/gitProjects/nexent/backend$ uv --version
        uv 0.9.7
        ```
        
3.  **使用 uv 进行环境搭建**
    
    -   进入后端目录：
        
        ```bash
        cd backend
        ```
        
    -   安装主要依赖：
        
        ```bash
        uv sync
        uv pip install -e ../sdk
        ```
        
    -   进行 `uv sync` 之后，按照官网启动服务，还是提示有包未安装。观察源码，发现是可选依赖未安装。
        
        ![image-20251102132334939](/images/md-img/image-20251102132334939.png)
        
    -   继续安装可选依赖：
        
        ```bash
        uv pip install ".[data-process,test]"
        ```
        
4.  **配置 基础设施服务 (例如 Redis)**  
    不难发现，nexent 使用了很多的基础设施服务，如果要我们一个一个本地构建相当耗费时间。nexent 官方为我们提供了脚本，可以使用 docker 构建基础服务，也就是项目依赖的服务。
    
    大概有这些：  
    ![image-20251102132400697](/images/md-img/image-20251102132400697.png)
    
    -   所以首先我们要下载并启动 docker。
        
    -   然后进入 `/docker` 目录。
        
    -   如果你的步骤和我的完全一样，现在应该是处于 `backend` 目录。执行：
        
        ```bash
        cd ../docker
        cp .env.example .env
        ```
        
        这里如果有需求的话可以更改 .env 文件的配置，例如
        
        ```text
        # Supabase Auth Config
        SITE_URL=http://localhost:3011
        SUPABASE_URL=http://supabase-kong-mini:8000
        API_EXTERNAL_URL=http://supabase-kong-mini:8000
        DISABLE_SIGNUP=false
        JWT_EXPIRY=3600
        DEBUG_JWT_EXPIRE_SECONDS=0
        ```
        
        可以将 JWT\_EXPIRY=3600 更改得更长一点，例如 36000，这样在进行开发的时候就不用频繁进行登录了。
        
    -   然后执行
        
        ```bash
        bash deploy.sh
        ```
        
    -   然后再选择 模式的时候，选择 **基础设施模式（Infrastructure mode）**。
        
        ![image-20251102132418663](/images/md-img/image-20251102132418663.png)
        
    -   于是就会开始拉取镜像。出现成功标志：
        
        ![image-20251102132427902](/images/md-img/image-20251102132427902.png)
        
    -   接下来可以像提示的一样激活环境变量：
        
        ```bash
        source .env
        ```
        
    -   也可以直接将 `.env` 复制到 `backend` 目录下：
        
        ```bash
        cp ../.env ../backend/.env
        ```
        
5.  **激活虚拟环境启动服务**
    
    -   激活虚拟环境（之前 uv 为我们创建的）：
        
        ```bash
        source backend/.venv/bin/activate
        ```
        
    -   要启动三个服务：
        
        ```text
        python backend/data_process_service.py    # 数据处理服务
        python backend/nexent_mcp_service.py      # MCP服务
        python backend/main_service.py            # 主服务
        ```
        
    -   可以写一个脚本启动：
        
        ```bash
        #!/bin/bash
        # 一键启动三个 Nexent 后端服务 🚀
        
        # 进入项目根目录（根据需要修改路径）
        cd "$(dirname "$0")"
        
        # 激活虚拟环境（如果有）
        source backend/.venv/bin/activate
        
        echo "✨ 启动 Data Process Service..."
        nohup python backend/data_process_service.py > logs/data_process.log 2>&1 &
        
        echo "🧠 启动 MCP Service..."
        nohup python backend/nexent_mcp_service.py > logs/mcp_service.log 2>&1 &
        
        echo "🌐 启动 Main Service..."
        nohup python backend/main_service.py > logs/main_service.log 2>&1 &
        
        echo "✅ 所有服务已启动！"
        echo "日志输出在 logs/ 目录下"
        ```
        
    -   **IDE 连接 WSL：**
        
        -   我这边使用 VSCode 连接 wsl。  
            [https://learn.microsoft.com/zh-cn/windows/wsl/tutorials/wsl-vscode](https://learn.microsoft.com/zh-cn/windows/wsl/tutorials/wsl-vscode)  
            直接输入 `code ./` 即可。
        -   PyCharm 参考以下教程：  
            [https://www.jetbrains.com/zh-cn/help/pycharm/2025.2/using-wsl-as-a-remote-interpreter.html](https://www.jetbrains.com/zh-cn/help/pycharm/2025.2/using-wsl-as-a-remote-interpreter.html)
    
    至此后端三个服务 + docker 基础设施服务 全部启动成功！
    

## 前端环境搭建

1.  **安装 node**
    
    -   官网： [https://nodejs.org/zh-cn/download](https://nodejs.org/zh-cn/download)
    -   这里推荐下 `fnm`，用于管理 node 的版本，个人认为非常好用：  
        [https://github.com/Schniz/fnm](https://github.com/Schniz/fnm)
2.  **安装依赖**
    
    -   使用 `npm`：
        
        ```bash
        cd frontend
        npm install
        npm run dev
        ```
        
    -   博主这里使用 `pnpm`，效果可能会更好：
        
        ```bash
        cd frontend
        pnpm install
        pnpm run dev
        ```
        

* * *

启动成功，至此环境全部搭建完成，愉快的启动吧！

> 如果你愿意的话，可以在 `.env` 里面找到你登录需要的一些东西……  
> 但还是支持官方哦~提交留言即可获得邀请码。
