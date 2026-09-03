m_OSARCH_OS="$(command -p -- uname -s 2>/dev/null)" || fatal "1" execution execution-failed operation "osarch-detection"
m_OSARCH_ARCH="$(command -p -- uname -m 2>/dev/null)" || fatal "1" execution execution-failed operation "osarch-detection"

case "$m_OSARCH_OS" in
  "Linux")
    m_OSARCH_OS="linux"
    ;;
  "Darwin")
    m_OSARCH_OS="macos"
    ;;
  "MINGW"*|"MSYS"*|"CYGWIN"*)
    m_OSARCH_OS="windows"
    ;;
esac

case "$m_OSARCH_ARCH" in
  "arm64"|"ARM64"|"aarch64"|"AARCH64")
    m_OSARCH_ARCH="arm64"
    ;;
  "x86_64"|"X86_64"|"amd64"|"AMD64"|"x64"|"X64")
    m_OSARCH_ARCH="x86_64"
    ;;
esac

m_OSARCH="${m_OSARCH_OS}-${m_OSARCH_ARCH}"

export -- \
  m_OSARCH_OS \
  m_OSARCH_ARCH \
  m_OSARCH

readonly -- \
  m_OSARCH_OS \
  m_OSARCH_ARCH \
  m_OSARCH
