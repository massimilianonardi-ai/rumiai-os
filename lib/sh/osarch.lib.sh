
[ m_OSARCH_OS=$(command -p uname -s 2>/dev/null) ] && [ m_OSARCH_ARCH=$(command -p uname -m 2>/dev/null) ] || fatal system osarch-detection-failure

# normalize known operative systems, leave intact others
case "$m_OSARCH_OS" in
  Linux) m_OSARCH_OS="linux";;
  Darwin) m_OSARCH_OS="macos";;
  MINGW*|MSYS*|CYGWIN*) m_OSARCH_OS="windows";;
  *) fatal system osarch-detection-failure;;
esac

# normalize known architectures, leave intact others
case "$m_OSARCH_ARCH" in
  arm64|aarch64|ARM64|AARCH64) m_OSARCH_ARCH="arm64";;
  x86_64|x64|amd64|AMD64|X86_64|X64) m_OSARCH_ARCH="x86_64";;
  *) fatal system osarch-detection-failure;;
esac

# set platform
m_OSARCH="${m_OSARCH_OS}-${m_OSARCH_ARCH}"

export -- \
  m_OSARCH_OS \
  m_OSARCH_ARCH \
  m_OSARCH

readonly -- \
  m_OSARCH_OS \
  m_OSARCH_ARCH \
  m_OSARCH














# m_fs_mode()
# (
#   [ "$#" -eq 1 ] || return 2
#   [ ! -L "$1" ] || return 2
#   m_FS_PATH=$(m_path_canonicalize_existing "$1") || return 1
#
#   case ${m_PLATFORM-} in
#     linux)
#       m_FS_MODE=$(command -p stat -c '%a' "$m_FS_PATH" 2>/dev/null) || return 3
#       ;;
#     macos)
#       m_FS_MODE=$(command -p stat -f '%Lp' "$m_FS_PATH" 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   case $m_FS_MODE in
#     ''|*[!0-7]*) return 3 ;;
#   esac
#
#   printf '%04d\n' "$m_FS_MODE"
# )
#
# m_digest_normalize_sha256()
# (
#   [ "$#" -eq 1 ] || return 2
#   m_DIGEST_VALUE=${1%% *}
#
#   [ "${#m_DIGEST_VALUE}" -eq 64 ] || return 3
#   case $m_DIGEST_VALUE in
#     *[!0-9A-Fa-f]*) return 3 ;;
#   esac
#
#   printf '%s\n' "$m_DIGEST_VALUE" | command -p tr 'A-F' 'a-f'
# )
#
# m_digest_sha256_file()
# (
#   [ "$#" -eq 1 ] || return 2
#   m_DIGEST_FILE=$1
#
#   case ${m_PLATFORM-} in
#     linux)
#       m_DIGEST_OUTPUT=$(command -p sha256sum "$m_DIGEST_FILE" 2>/dev/null) || return 3
#       ;;
#     macos)
#       m_DIGEST_OUTPUT=$(command -p shasum -a 256 "$m_DIGEST_FILE" 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   m_digest_normalize_sha256 "$m_DIGEST_OUTPUT"
# )
#
# m_digest_sha256_text()
# (
#   [ "$#" -eq 1 ] || return 2
#   m_DIGEST_TEXT=$1
#
#   case ${m_PLATFORM-} in
#     linux)
#       m_DIGEST_OUTPUT=$(printf '%s' "$m_DIGEST_TEXT" | command -p sha256sum 2>/dev/null) || return 3
#       ;;
#     macos)
#       m_DIGEST_OUTPUT=$(printf '%s' "$m_DIGEST_TEXT" | command -p shasum -a 256 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   m_digest_normalize_sha256 "$m_DIGEST_OUTPUT"
# )
#
# m_digest_file()
# (
#   [ "$#" -eq 2 ] || return 2
#   [ "$1" = sha256 ] || return 2
#   [ -f "$2" ] && [ ! -L "$2" ] || return 1
#   m_DIGEST_FILE=$(m_path_canonicalize_existing "$2") || return 1
#   m_digest_sha256_file "$m_DIGEST_FILE"
# )
#
# m_digest_text()
# (
#   [ "$#" -eq 2 ] || return 2
#   [ "$1" = sha256 ] || return 2
#   m_digest_sha256_text "$2"
# )
#
# m_atomic_replace()
# (
#   [ "$#" -eq 2 ] || return 2
#
#   m_ATOMIC_SOURCE_PARENT=$(m_path_parent "$1") || return 2
#   m_ATOMIC_SOURCE_NAME=$(m_path_name "$1") || return 2
#   m_ATOMIC_DEST_PARENT=$(m_path_parent "$2") || return 2
#   m_ATOMIC_DEST_NAME=$(m_path_name "$2") || return 2
#
#   m_ATOMIC_SOURCE_PARENT=$(m_path_canonicalize_existing "$m_ATOMIC_SOURCE_PARENT") || return 1
#   m_ATOMIC_DEST_PARENT=$(m_path_canonicalize_existing "$m_ATOMIC_DEST_PARENT") || return 1
#
#   [ "$m_ATOMIC_SOURCE_PARENT" = "$m_ATOMIC_DEST_PARENT" ] || return 2
#
#   m_ATOMIC_SOURCE=$m_ATOMIC_SOURCE_PARENT/$m_ATOMIC_SOURCE_NAME
#   m_ATOMIC_DEST=$m_ATOMIC_DEST_PARENT/$m_ATOMIC_DEST_NAME
#
#   [ -e "$m_ATOMIC_SOURCE" ] || [ -L "$m_ATOMIC_SOURCE" ] || return 1
#
#   command -p mv -f "$m_ATOMIC_SOURCE" "$m_ATOMIC_DEST" || return 3
# )
