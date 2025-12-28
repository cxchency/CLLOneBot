#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH=$PATH:/usr/bin:/usr/local/bin
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log() { echo -e "${GREEN}>>> $1${NC}"; }
warn() { echo -e "${YELLOW}>>> $1${NC}"; }
error() { echo -e "${RED}错误: $1${NC}"; exit 1; }

confirm() {
    read -n 1 -s -r -p "$1 (Y/n) " key
    echo ""
    [[ "$key" == "Y" || "$key" == "y" || "$key" == "" ]]
}

find_port() {
    # 让系统自动分配可用端口
    local port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()' 2>/dev/null)
    if [ -n "$port" ]; then
        echo $port
        return 0
    fi
    # 回退方案：从指定端口开始查找
    local port=$1
    while [ $port -lt 65535 ]; do
        if ! ss -tuln 2>/dev/null | grep -q ":$port " && ! netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo $port
            return 0
        fi
        ((port++))
    done
    return 1
}

if command -v pacman &> /dev/null; then
    DISTRO="arch"
elif command -v apt &> /dev/null; then
    DISTRO="debian"
else
    error "只支持 apt 或 pacman 包管理器"
fi
log "检测到系统: $DISTRO"

install_arch() {
    log "检查 Arch 依赖..."
    sudo pacman -S --needed --noconfirm base-devel git ffmpeg xorg-server-xvfb libvips imagemagick dbus xorg-xhost fcitx5-im wget

    if [ ! -f "/opt/QQ/qq" ] && confirm "未检测到 QQ，是否通过 AUR 安装?"; then
        if ! command -v yay &> /dev/null; then
            warn "未检测到 yay，尝试安装..."
            if ! sudo pacman -S --needed --noconfirm yay 2>/dev/null; then
                warn "pacman 安装失败，切换源码编译..."
                rm -rf /tmp/yay_install && git clone https://aur.archlinux.org/yay.git /tmp/yay_install
                (cd /tmp/yay_install && makepkg -si --noconfirm) || error "yay 编译失败"
                rm -rf /tmp/yay_install
            fi
        fi
        yay -S --noconfirm linuxqq || error "LinuxQQ 安装失败"
    fi
}

install_debian() {
    local MACHINE=$(uname -m)
    local ARCH=""
    case "$MACHINE" in
        x86_64)  ARCH="amd64" ;;
        aarch64) ARCH="arm64" ;;
        *)       error "不支持的架构: $MACHINE" ;;
    esac

    if [ ! -f "/opt/QQ/qq" ] && confirm "未检测到 QQ，是否安装?"; then
        log "下载并安装 QQ ($ARCH)..."
        sudo apt-get update && sudo apt-get install -y wget
        local DEB="/tmp/qq.deb"
        wget -O "$DEB" "https://dldir1v6.qq.com/qqfile/qq/QQNT/ab90fdfa/linuxqq_3.2.20-40768_$ARCH.deb" || error "下载失败"

        # 依赖判断 (新版 Ubuntu 24.04+ 用 libasound2t64，旧版用 libasound2)
        local LIB_SND="libasound2"
        if apt-cache show libasound2t64 &>/dev/null; then
            LIB_SND="libasound2t64"
        fi

        echo "使用 ALSA 库包: $LIB_SND"

        sudo apt install -y "$DEB" x11-utils libgtk-3-0 libxcb-xinerama0 libgl1-mesa-dri libnotify4 libnss3 xdg-utils libsecret-1-0 libappindicator3-1 libgbm1 $LIB_SND fonts-noto-cjk libxss1
        rm -f "$DEB"
    fi

    for pkg in ffmpeg xvfb; do
        command -v $pkg &> /dev/null || sudo apt-get install -y $pkg
    done
}

[ "$DISTRO" == "arch" ] && install_arch || install_debian

chmod +x "$SCRIPT_DIR/llbot/node" "$SCRIPT_DIR/llbot/pmhq" 2>/dev/null
[ "$DISTRO" == "arch" ] && sudo chown -R $(whoami):$(whoami) "$SCRIPT_DIR/llbot"

PORT=$(find_port 13000)
[ -z "$PORT" ] && error "无法找到可用端口"
log "使用端口: $PORT"

HAS_DISPLAY=0
[[ -n "$DISPLAY" || -n "$WAYLAND_DISPLAY" ]] && HAS_DISPLAY=1

echo "------------------------------------------------"
echo "1) GUI 模式"
echo "2) Shell 模式 (默认)"
echo "------------------------------------------------"

MODE_CHOICE=""
TIMEOUT=5
while [ $TIMEOUT -gt 0 ]; do
    printf "\r请选择 [1/2] (${TIMEOUT}秒后默认选择 Shell): "
    if read -t 1 -n 1 MODE_CHOICE; then
        echo ""
        break
    fi
    ((TIMEOUT--))
done
[ $TIMEOUT -eq 0 ] && echo "" && log "超时，使用默认 Shell 模式"
MODE_CHOICE=${MODE_CHOICE:-2}
USE_XVFB=$([ "$MODE_CHOICE" == "2" ] && echo 1 || echo 0)

# 授权 X11
if [ $USE_XVFB -eq 0 ]; then
    if command -v xauth &> /dev/null; then
        export XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
    else
        warn "未检测到 xauth，使用临时 xhost 授权"
        xhost +local:$(whoami) > /dev/null 2>&1
        trap "xhost -local:$(whoami) > /dev/null 2>&1" EXIT
    fi
fi

IM_ENV=""
EXTRA_FLAGS=""

if [[ "$XDG_SESSION_TYPE" == "wayland" || -n "$WAYLAND_DISPLAY" ]]; then
    log "环境: Wayland"
    IM_ENV="XMODIFIERS=@im=fcitx"
    EXTRA_FLAGS="--enable-features=UseOzonePlatform --ozone-platform=wayland --enable-wayland-ime"
else
    log "环境: X11"
    IM_ENV="GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx XMODIFIERS=@im=fcitx SDL_IM_MODULE=fcitx GLFW_IM_MODULE=ibus"
fi

NODE_BIN="$SCRIPT_DIR/llbot/node"
LLBOT_JS="$SCRIPT_DIR/llbot/llbot.js"
PMHQ_BIN="$SCRIPT_DIR/llbot/pmhq"

run_llbot() {
    if [ "$DISTRO" == "arch" ]; then
        export LD_PRELOAD="/usr/lib/libstdc++.so.6:/usr/lib/libgcc_s.so.1"
        export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus"
    fi

    local sub_cmd="$NODE_BIN --enable-source-maps $LLBOT_JS -- --pmhq-port=$PORT --no-sandbox $EXTRA_FLAGS"

    log "启动中... (模式: $([ $USE_XVFB -eq 1 ] && echo "Headless" || echo "GUI"))"

    if [ $USE_XVFB -eq 1 ]; then
        env $IM_ENV xvfb-run -a "$PMHQ_BIN" --port="$PORT" --sub-cmd="$sub_cmd"
    else
        [ "$DISTRO" != "arch" ] && xhost +local:$(whoami) > /dev/null 2>&1
        env $IM_ENV "$PMHQ_BIN" --port="$PORT" --sub-cmd="$sub_cmd"
    fi
}

run_llbot
