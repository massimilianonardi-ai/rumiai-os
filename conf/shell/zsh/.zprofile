if [ "${m_SHELL_ZDOTDIR+x}" = "x" ]
then
  ZDOTDIR="$m_SHELL_ZDOTDIR"
  export ZDOTDIR

  if [ -r "$ZDOTDIR/.zprofile" ]
  then
    . "$ZDOTDIR/.zprofile"
  fi
else
  unset ZDOTDIR

  if [ -r "$HOME/.zprofile" ]
  then
    . "$HOME/.zprofile"
  fi
fi
