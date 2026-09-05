if [ "${m_SHELL_ZDOTDIR+x}" = "x" ]
then
  ZDOTDIR="$m_SHELL_ZDOTDIR"
  export ZDOTDIR

  if [ -r "$ZDOTDIR/.zlogin" ]
  then
    . "$ZDOTDIR/.zlogin"
  fi
else
  unset ZDOTDIR

  if [ -r "$HOME/.zlogin" ]
  then
    . "$HOME/.zlogin"
  fi
fi
