ZDOTDIR="$m_SHELL_ZDOTDIR"

if [ -r "$ZDOTDIR/.zshrc" ]
then
  . "$ZDOTDIR/.zshrc"
fi

m_SHELL_ZDOTDIR="${ZDOTDIR:-$HOME}"
ZDOTDIR="$m_SHELL_ZDOTDIR_INIT"

export m_SHELL_ZDOTDIR ZDOTDIR
unset m_SHELL_ZDOTDIR_INIT

. "$m_LIB_DIR/sh/core.lib.sh"

ZDOTDIR="$m_SHELL_ZDOTDIR"
export ZDOTDIR

export PS1="$(tput setaf 7)$(tput bold)${m_OS_NAME}:${m_SHELL_NAME}$(tput sgr0) $(tput setaf 2)%n$(tput setaf 7)@$(tput setaf 2)%m$(tput setaf 7):$(tput setaf 2)%~$(tput setaf 4) %#$(tput sgr0) "
export PROMPT="$PS1"

if [ -f "$m_SHELL_EXT" ] && [ -r "$m_SHELL_EXT" ]
then
  . "$m_SHELL_EXT"
fi
