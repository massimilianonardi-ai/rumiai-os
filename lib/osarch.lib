#!/bin/sh

if m_OSARCH_OS=$(command -p uname -s 2>/dev/null) && m_OSARCH_ARCH=$(command -p uname -m 2>/dev/null)
then
  # normalize known operative systems, leave intact others
  case $RumiAI_OSARCH_OS in
    Linux)
      RumiAI_OSARCH_OS="linux"
      ;;
    Darwin)
      RumiAI_OSARCH_OS="macos"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      RumiAI_OSARCH_OS="windows"
      ;;
  esac

  # normalize known architectures, leave intact others
  case $RumiAI_OSARCH_ARCH in
    arm64|aarch64)
      RumiAI_OSARCH_ARCH="arm64"
      ;;
    x86_64|amd64|AMD64)
      RumiAI_OSARCH_ARCH="x86_64"
      ;;
  esac

  # set platform
  m_OSARCH=$m_OSARCH_OS-$m_OSARCH_ARCH

  export -- \
    m_OSARCH_OS \
    m_OSARCH_ARCH \
    m_OSARCH

  readonly -- \
    m_OSARCH_OS \
    m_OSARCH_ARCH \
    m_OSARCH
else
  fatal system osarch detection-failure
fi
















# RumiAI_fs_mode()
# (
#   [ "$#" -eq 1 ] || return 2
#   [ ! -L "$1" ] || return 2
#   RumiAI_FS_PATH=$(RumiAI_path_canonicalize_existing "$1") || return 1
#
#   case ${RumiAI_PLATFORM-} in
#     linux)
#       RumiAI_FS_MODE=$(command -p stat -c '%a' "$RumiAI_FS_PATH" 2>/dev/null) || return 3
#       ;;
#     macos)
#       RumiAI_FS_MODE=$(command -p stat -f '%Lp' "$RumiAI_FS_PATH" 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   case $RumiAI_FS_MODE in
#     ''|*[!0-7]*) return 3 ;;
#   esac
#
#   printf '%04d\n' "$RumiAI_FS_MODE"
# )
#
# RumiAI_digest_normalize_sha256()
# (
#   [ "$#" -eq 1 ] || return 2
#   RumiAI_DIGEST_VALUE=${1%% *}
#
#   [ "${#RumiAI_DIGEST_VALUE}" -eq 64 ] || return 3
#   case $RumiAI_DIGEST_VALUE in
#     *[!0-9A-Fa-f]*) return 3 ;;
#   esac
#
#   printf '%s\n' "$RumiAI_DIGEST_VALUE" | command -p tr 'A-F' 'a-f'
# )
#
# RumiAI_digest_sha256_file()
# (
#   [ "$#" -eq 1 ] || return 2
#   RumiAI_DIGEST_FILE=$1
#
#   case ${RumiAI_PLATFORM-} in
#     linux)
#       RumiAI_DIGEST_OUTPUT=$(command -p sha256sum "$RumiAI_DIGEST_FILE" 2>/dev/null) || return 3
#       ;;
#     macos)
#       RumiAI_DIGEST_OUTPUT=$(command -p shasum -a 256 "$RumiAI_DIGEST_FILE" 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   RumiAI_digest_normalize_sha256 "$RumiAI_DIGEST_OUTPUT"
# )
#
# RumiAI_digest_sha256_text()
# (
#   [ "$#" -eq 1 ] || return 2
#   RumiAI_DIGEST_TEXT=$1
#
#   case ${RumiAI_PLATFORM-} in
#     linux)
#       RumiAI_DIGEST_OUTPUT=$(printf '%s' "$RumiAI_DIGEST_TEXT" | command -p sha256sum 2>/dev/null) || return 3
#       ;;
#     macos)
#       RumiAI_DIGEST_OUTPUT=$(printf '%s' "$RumiAI_DIGEST_TEXT" | command -p shasum -a 256 2>/dev/null) || return 3
#       ;;
#     *)
#       return 3
#       ;;
#   esac
#
#   RumiAI_digest_normalize_sha256 "$RumiAI_DIGEST_OUTPUT"
# )
#
# RumiAI_digest_file()
# (
#   [ "$#" -eq 2 ] || return 2
#   [ "$1" = sha256 ] || return 2
#   [ -f "$2" ] && [ ! -L "$2" ] || return 1
#   RumiAI_DIGEST_FILE=$(RumiAI_path_canonicalize_existing "$2") || return 1
#   RumiAI_digest_sha256_file "$RumiAI_DIGEST_FILE"
# )
#
# RumiAI_digest_text()
# (
#   [ "$#" -eq 2 ] || return 2
#   [ "$1" = sha256 ] || return 2
#   RumiAI_digest_sha256_text "$2"
# )
#
# RumiAI_atomic_replace()
# (
#   [ "$#" -eq 2 ] || return 2
#
#   RumiAI_ATOMIC_SOURCE_PARENT=$(RumiAI_path_parent "$1") || return 2
#   RumiAI_ATOMIC_SOURCE_NAME=$(RumiAI_path_name "$1") || return 2
#   RumiAI_ATOMIC_DEST_PARENT=$(RumiAI_path_parent "$2") || return 2
#   RumiAI_ATOMIC_DEST_NAME=$(RumiAI_path_name "$2") || return 2
#
#   RumiAI_ATOMIC_SOURCE_PARENT=$(RumiAI_path_canonicalize_existing "$RumiAI_ATOMIC_SOURCE_PARENT") || return 1
#   RumiAI_ATOMIC_DEST_PARENT=$(RumiAI_path_canonicalize_existing "$RumiAI_ATOMIC_DEST_PARENT") || return 1
#
#   [ "$RumiAI_ATOMIC_SOURCE_PARENT" = "$RumiAI_ATOMIC_DEST_PARENT" ] || return 2
#
#   RumiAI_ATOMIC_SOURCE=$RumiAI_ATOMIC_SOURCE_PARENT/$RumiAI_ATOMIC_SOURCE_NAME
#   RumiAI_ATOMIC_DEST=$RumiAI_ATOMIC_DEST_PARENT/$RumiAI_ATOMIC_DEST_NAME
#
#   [ -e "$RumiAI_ATOMIC_SOURCE" ] || [ -L "$RumiAI_ATOMIC_SOURCE" ] || return 1
#
#   command -p mv -f "$RumiAI_ATOMIC_SOURCE" "$RumiAI_ATOMIC_DEST" || return 3
# )
