#!/bin/bash
# FFmpeg 精简版编译脚本 - 在 MSYS2 UCRT64 环境中运行
set -e

INSTALL_DIR="${1:-./install}"

echo "========================================"
echo "FFmpeg 精简版编译"
echo "========================================"

if [ ! -f "./configure" ]; then
    echo "错误: 请在 FFmpeg 源码目录运行此脚本"
    exit 1
fi

echo "清理旧构建..."
make clean 2>/dev/null || true
make distclean 2>/dev/null || true

echo "配置编译选项..."
./configure \
    --prefix="$INSTALL_DIR" \
    --disable-everything \
    --enable-small \
    --disable-doc \
    --disable-debug \
    --disable-shared \
    --enable-static \
    --disable-network \
    --disable-autodetect \
    --enable-zlib \
    --enable-ffmpeg \
    --enable-ffprobe \
    --disable-ffplay \
    --enable-avcodec \
    --enable-avformat \
    --enable-avfilter \
    --enable-swresample \
    --enable-swscale \
    --enable-decoder=pcm_s16le \
    --enable-decoder=pcm_s16be \
    --enable-decoder=pcm_u8 \
    --enable-decoder=pcm_f32le \
    --enable-decoder=mp3 \
    --enable-decoder=mp3float \
    --enable-decoder=aac \
    --enable-decoder=aac_fixed \
    --enable-decoder=flac \
    --enable-decoder=opus \
    --enable-decoder=vorbis \
    --enable-decoder=amrnb \
    --enable-decoder=amrwb \
    --enable-decoder=h264 \
    --enable-decoder=hevc \
    --enable-decoder=vp8 \
    --enable-decoder=vp9 \
    --enable-decoder=av1 \
    --enable-decoder=mpeg4 \
    --enable-decoder=mjpeg \
    --enable-decoder=png \
    --enable-decoder=gif \
    --enable-decoder=webp \
    --enable-decoder=bmp \
    --enable-encoder=pcm_s16le \
    --enable-encoder=png \
    --enable-encoder=mjpeg \
    --enable-demuxer=pcm_s16le \
    --enable-demuxer=pcm_s16be \
    --enable-demuxer=pcm_f32le \
    --enable-demuxer=wav \
    --enable-demuxer=mp3 \
    --enable-demuxer=aac \
    --enable-demuxer=flac \
    --enable-demuxer=ogg \
    --enable-demuxer=amr \
    --enable-demuxer=mov \
    --enable-demuxer=matroska \
    --enable-demuxer=webm \
    --enable-demuxer=avi \
    --enable-demuxer=flv \
    --enable-demuxer=mpegts \
    --enable-demuxer=image2 \
    --enable-demuxer=image2pipe \
    --enable-muxer=pcm_s16le \
    --enable-muxer=pcm_s16be \
    --enable-muxer=pcm_f32le \
    --enable-muxer=wav \
    --enable-muxer=image2 \
    --enable-muxer=image2pipe \
    --enable-parser=h264 \
    --enable-parser=hevc \
    --enable-parser=vp8 \
    --enable-parser=vp9 \
    --enable-parser=av1 \
    --enable-parser=mpeg4video \
    --enable-parser=aac \
    --enable-parser=mp3 \
    --enable-parser=flac \
    --enable-parser=opus \
    --enable-parser=vorbis \
    --enable-parser=png \
    --enable-parser=mjpeg \
    --enable-parser=gif \
    --enable-parser=webp \
    --enable-parser=bmp \
    --enable-filter=aresample \
    --enable-filter=aformat \
    --enable-filter=anull \
    --enable-filter=scale \
    --enable-filter=thumbnail \
    --enable-filter=fps \
    --enable-filter=format \
    --enable-filter=null \
    --enable-filter=split \
    --enable-protocol=file \
    --enable-protocol=pipe \
    --enable-bsf=h264_mp4toannexb \
    --enable-bsf=hevc_mp4toannexb \
    --enable-bsf=aac_adtstoasc \
    --extra-ldflags='-static -static-libgcc -static-libstdc++' \
    --extra-cflags='-static' \
    --pkg-config-flags='--static' \
    --disable-w32threads \
    --enable-pthreads

echo ""
echo "开始编译 (使用 $(nproc) 核心)..."
make -j$(nproc)

echo ""
echo "安装..."
make install

echo ""
echo "检查依赖..."
# 检查是否真正静态链接
if command -v ldd >/dev/null 2>&1; then
    echo "ffmpeg.exe 依赖:"
    ldd "$INSTALL_DIR/bin/ffmpeg.exe" || echo "完全静态链接 ✓"
fi

echo ""
echo "========================================"
echo "编译完成!"
echo "输出目录: $INSTALL_DIR/bin"
ls -lh "$INSTALL_DIR/bin/"

# 如果静态链接成功，就不需要复制 DLL
if "$INSTALL_DIR/bin/ffmpeg.exe" -version > /dev/null 2>&1; then
    echo "✓ ffmpeg 可以独立运行，无需额外 DLL"
else
    echo "静态链接失败，复制运行时库..."
    # 复制必要的运行时库到 bin 目录
    DLLS=("libgcc_s_seh-1.dll" "libstdc++-6.dll" "libwinpthread-1.dll")
    for dll in "${DLLS[@]}"; do
        if [ -f "/ucrt64/bin/$dll" ]; then
            cp "/ucrt64/bin/$dll" "$INSTALL_DIR/bin/"
            echo "复制: $dll"
        fi
    done
fi

# 测试 ffmpeg 是否能运行
echo ""
echo "测试 ffmpeg..."
if "$INSTALL_DIR/bin/ffmpeg.exe" -version > /dev/null 2>&1; then
    echo "✓ ffmpeg 可以正常运行"
else
    echo "✗ ffmpeg 运行失败，可能缺少依赖库"
fi

echo "========================================"
echo "按 Enter 键退出..."
read
